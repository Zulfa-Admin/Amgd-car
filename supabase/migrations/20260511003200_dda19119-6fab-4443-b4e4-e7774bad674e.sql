
-- 1) Idempotency key on wallet_transactions
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_tx_idem
  ON public.wallet_transactions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 2) Disable direct bid inserts (force RPC)
DROP POLICY IF EXISTS "users place bids" ON public.bids;

-- 3) Atomic place_bid RPC: validation + anti-snipe + fund hold + outbid release
CREATE OR REPLACE FUNCTION public.place_bid(_auction_id uuid, _amount numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.auctions%ROWTYPE;
  bidder uuid := auth.uid();
  prev_winner uuid;
  prev_amount numeric;
  bidder_wallet public.wallets%ROWTYPE;
  prev_wallet public.wallets%ROWTYPE;
  last_bid_at timestamptz;
  new_bid_id uuid;
  extended boolean := false;
BEGIN
  IF bidder IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  SELECT * INTO a FROM public.auctions WHERE id = _auction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'auction not found'; END IF;

  -- Server time only
  IF a.starts_at > now() THEN RAISE EXCEPTION 'auction not started'; END IF;
  IF a.ends_at <= now() THEN
    UPDATE public.auctions SET status='ended' WHERE id = a.id AND status='active';
    RAISE EXCEPTION 'auction has ended';
  END IF;
  IF a.status <> 'active' THEN RAISE EXCEPTION 'auction not active'; END IF;
  IF bidder = a.seller_id THEN RAISE EXCEPTION 'seller cannot bid on own auction'; END IF;

  IF _amount < a.current_price + a.bid_increment THEN
    RAISE EXCEPTION 'bid must be at least % (current % + increment %)',
      a.current_price + a.bid_increment, a.current_price, a.bid_increment;
  END IF;

  -- Cooldown
  SELECT MAX(created_at) INTO last_bid_at
    FROM public.bids WHERE auction_id = a.id AND bidder_id = bidder;
  IF last_bid_at IS NOT NULL AND now() - last_bid_at < interval '2 seconds' THEN
    RAISE EXCEPTION 'please wait before bidding again';
  END IF;

  -- Get/create bidder wallet in auction currency
  SELECT * INTO bidder_wallet FROM public.wallets
    WHERE user_id = bidder AND currency = a.currency FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, currency) VALUES (bidder, a.currency)
      RETURNING * INTO bidder_wallet;
  END IF;

  -- Compute the additional hold needed (bidder may already have a previous hold on this auction)
  DECLARE
    existing_hold numeric;
    delta numeric;
  BEGIN
    SELECT COALESCE(SUM(ABS(amount)), 0) INTO existing_hold
      FROM public.wallet_transactions
      WHERE user_id = bidder AND ref_table='auctions' AND ref_id = a.id AND kind='hold';
    -- Subtract any releases for that user/auction
    existing_hold := existing_hold - COALESCE((
      SELECT SUM(ABS(amount)) FROM public.wallet_transactions
      WHERE user_id = bidder AND ref_table='auctions' AND ref_id = a.id AND kind IN ('release','refund')
    ), 0);

    delta := _amount - existing_hold;
    IF delta > bidder_wallet.balance THEN
      RAISE EXCEPTION 'insufficient available balance: need %, have %', delta, bidder_wallet.balance;
    END IF;

    IF delta > 0 THEN
      INSERT INTO public.wallet_transactions
        (wallet_id, user_id, amount, currency, kind, ref_table, ref_id, note, idempotency_key)
      VALUES
        (bidder_wallet.id, bidder, delta, a.currency, 'hold', 'auctions', a.id,
         'Bid hold on auction', 'bid-hold-' || a.id::text || '-' || bidder::text || '-' || extract(epoch from now())::text);
    END IF;
  END;

  -- Release previous top bidder's hold (different user)
  prev_winner := a.winner_id;
  prev_amount := a.current_price;
  IF prev_winner IS NOT NULL AND prev_winner <> bidder THEN
    SELECT * INTO prev_wallet FROM public.wallets
      WHERE user_id = prev_winner AND currency = a.currency FOR UPDATE;
    IF FOUND THEN
      INSERT INTO public.wallet_transactions
        (wallet_id, user_id, amount, currency, kind, ref_table, ref_id, note, idempotency_key)
      VALUES
        (prev_wallet.id, prev_winner, prev_amount, a.currency, 'refund', 'auctions', a.id,
         'Outbid refund', 'outbid-' || a.id::text || '-' || prev_winner::text || '-' || extract(epoch from now())::text);
    END IF;
  END IF;

  -- Anti-sniping: extend by 60s if within last 30s
  IF (a.ends_at - now()) <= interval '30 seconds' THEN
    a.ends_at := a.ends_at + interval '60 seconds';
    extended := true;
  END IF;

  -- Update auction atomically (skip the bid trigger checks since we already validated)
  UPDATE public.auctions
    SET current_price = _amount,
        winner_id = bidder,
        bid_count = bid_count + 1,
        ends_at = a.ends_at,
        updated_at = now()
    WHERE id = a.id;

  -- Record the bid (bypass trigger by temporarily disabling? we use a direct insert that the trigger will re-validate)
  -- The existing handle_new_bid trigger would re-run; safe because conditions still hold. But it would double-update auction.
  -- Easiest: drop the trigger since RPC owns the logic.
  INSERT INTO public.bids (auction_id, bidder_id, amount)
    VALUES (a.id, bidder, _amount)
    RETURNING id INTO new_bid_id;

  RETURN new_bid_id;
END;
$$;

-- Replace the trigger logic: bids only validated once via RPC
DROP TRIGGER IF EXISTS handle_new_bid_trg ON public.bids;
-- (Remove old trigger if it exists under any name)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.bids'::regclass AND NOT tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.bids', r.tgname);
  END LOOP;
END $$;

-- Authenticated users can call the RPC
GRANT EXECUTE ON FUNCTION public.place_bid(uuid, numeric) TO authenticated;

-- 4) Update finalize_auction to release winner hold and be idempotent
CREATE OR REPLACE FUNCTION public.finalize_auction(_auction_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.auctions%ROWTYPE;
  winner_wallet public.wallets%ROWTYPE;
  tx_id uuid;
  commission numeric(20,2);
  existing_tx uuid;
BEGIN
  SELECT * INTO a FROM public.auctions WHERE id = _auction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'auction not found'; END IF;

  -- Idempotent: if a transaction already exists for this auction, return it
  SELECT id INTO existing_tx FROM public.transactions WHERE auction_id = a.id LIMIT 1;
  IF existing_tx IS NOT NULL THEN RETURN existing_tx; END IF;

  UPDATE public.auctions SET status='ended', updated_at=now()
    WHERE id = a.id AND status='active';

  IF a.winner_id IS NULL OR a.bid_count = 0 THEN RETURN NULL; END IF;

  commission := round(a.current_price * a.commission_rate, 2);

  -- Release winner's hold (will be moved into escrow as the transaction)
  SELECT * INTO winner_wallet FROM public.wallets
    WHERE user_id = a.winner_id AND currency = a.currency FOR UPDATE;
  IF FOUND THEN
    INSERT INTO public.wallet_transactions
      (wallet_id, user_id, amount, currency, kind, ref_table, ref_id, note, idempotency_key)
    VALUES
      (winner_wallet.id, a.winner_id, a.current_price, a.currency, 'release', 'auctions', a.id,
       'Auction won — funds moved to escrow', 'finalize-release-' || a.id::text);
  END IF;

  INSERT INTO public.transactions
    (buyer_id, seller_id, listing_id, auction_id, amount, currency,
     commission_rate, commission_amount, status)
  VALUES
    (a.winner_id, a.seller_id, a.listing_id, a.id, a.current_price, a.currency,
     a.commission_rate, commission, 'pending')
  RETURNING id INTO tx_id;

  RETURN tx_id;
END;
$$;
