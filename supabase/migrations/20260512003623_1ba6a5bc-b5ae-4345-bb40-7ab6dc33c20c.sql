
-- Storage buckets for deposit proofs (private) and KYC docs (private)
INSERT INTO storage.buckets (id, name, public) VALUES
  ('deposit-proofs','deposit-proofs', false),
  ('kyc-docs','kyc-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Policies: users manage their own folder; admins/mods can read all
CREATE POLICY "users upload own deposit proof" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id='deposit-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users read own deposit proof" ON storage.objects FOR SELECT
  USING (bucket_id='deposit-proofs' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator')));

CREATE POLICY "users upload own kyc" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id='kyc-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users read own kyc" ON storage.objects FOR SELECT
  USING (bucket_id='kyc-docs' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator')));

-- KYC documents table
CREATE TABLE public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  doc_type text NOT NULL,
  file_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own kyc doc" ON public.kyc_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users view own kyc doc" ON public.kyc_documents FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));
CREATE POLICY "staff update kyc doc" ON public.kyc_documents FOR UPDATE
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));

-- Approval RPC: marks doc approved AND updates profile status
CREATE OR REPLACE FUNCTION public.review_kyc(_doc_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.kyc_documents%ROWTYPE;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO d FROM public.kyc_documents WHERE id=_doc_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  UPDATE public.kyc_documents
     SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
         admin_note=_note, reviewed_by=auth.uid(), reviewed_at=now()
   WHERE id=_doc_id;
  IF _approve THEN
    UPDATE public.profiles SET kyc_status='verified' WHERE id=d.user_id;
  END IF;
END;$$;

-- Add proof_url support already exists. Allow user updating own pending deposit (to attach proof)
CREATE POLICY "users update own pending deposit" ON public.manual_deposits FOR UPDATE
  USING (auth.uid()=user_id AND status='pending')
  WITH CHECK (auth.uid()=user_id AND status='pending');

-- Gate place_bid to require KYC verified (or commission_exempt admin override)
CREATE OR REPLACE FUNCTION public.place_bid(_auction_id uuid, _amount numeric)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  a public.auctions%ROWTYPE;
  bidder uuid := auth.uid();
  prev_winner uuid;
  prev_amount numeric;
  bidder_wallet public.wallets%ROWTYPE;
  prev_wallet public.wallets%ROWTYPE;
  last_bid_at timestamptz;
  new_bid_id uuid;
  pf public.profiles%ROWTYPE;
BEGIN
  IF bidder IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  SELECT * INTO pf FROM public.profiles WHERE id = bidder;
  IF NOT FOUND THEN RAISE EXCEPTION 'profile missing'; END IF;
  IF pf.kyc_status <> 'verified' AND NOT pf.commission_exempt AND NOT has_role(bidder,'admin') THEN
    RAISE EXCEPTION 'KYC_REQUIRED: يجب توثيق هويتك قبل المزايدة';
  END IF;

  SELECT * INTO a FROM public.auctions WHERE id = _auction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'auction not found'; END IF;
  IF a.starts_at > now() THEN RAISE EXCEPTION 'auction not started'; END IF;
  IF a.ends_at <= now() THEN
    UPDATE public.auctions SET status='ended' WHERE id=a.id AND status='active';
    RAISE EXCEPTION 'auction has ended';
  END IF;
  IF a.status <> 'active' THEN RAISE EXCEPTION 'auction not active'; END IF;
  IF bidder = a.seller_id THEN RAISE EXCEPTION 'seller cannot bid on own auction'; END IF;
  IF _amount < a.current_price + a.bid_increment THEN
    RAISE EXCEPTION 'bid must be at least % (current % + increment %)',
      a.current_price + a.bid_increment, a.current_price, a.bid_increment;
  END IF;

  SELECT MAX(created_at) INTO last_bid_at
    FROM public.bids WHERE auction_id=a.id AND bidder_id=bidder;
  IF last_bid_at IS NOT NULL AND now()-last_bid_at < interval '2 seconds' THEN
    RAISE EXCEPTION 'please wait before bidding again';
  END IF;

  SELECT * INTO bidder_wallet FROM public.wallets
    WHERE user_id=bidder AND currency=a.currency FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, currency) VALUES (bidder,a.currency) RETURNING * INTO bidder_wallet;
  END IF;

  DECLARE existing_hold numeric; delta numeric;
  BEGIN
    SELECT COALESCE(SUM(ABS(amount)),0) INTO existing_hold
      FROM public.wallet_transactions
      WHERE user_id=bidder AND ref_table='auctions' AND ref_id=a.id AND kind='hold';
    existing_hold := existing_hold - COALESCE((
      SELECT SUM(ABS(amount)) FROM public.wallet_transactions
      WHERE user_id=bidder AND ref_table='auctions' AND ref_id=a.id AND kind IN ('release','refund')),0);
    delta := _amount - existing_hold;
    IF delta > bidder_wallet.balance THEN
      RAISE EXCEPTION 'insufficient available balance: need %, have %', delta, bidder_wallet.balance;
    END IF;
    IF delta > 0 THEN
      INSERT INTO public.wallet_transactions
        (wallet_id,user_id,amount,currency,kind,ref_table,ref_id,note,idempotency_key)
      VALUES (bidder_wallet.id,bidder,delta,a.currency,'hold','auctions',a.id,
        'Bid hold on auction','bid-hold-'||a.id::text||'-'||bidder::text||'-'||extract(epoch from now())::text);
    END IF;
  END;

  prev_winner := a.winner_id; prev_amount := a.current_price;
  IF prev_winner IS NOT NULL AND prev_winner <> bidder THEN
    SELECT * INTO prev_wallet FROM public.wallets WHERE user_id=prev_winner AND currency=a.currency FOR UPDATE;
    IF FOUND THEN
      INSERT INTO public.wallet_transactions
        (wallet_id,user_id,amount,currency,kind,ref_table,ref_id,note,idempotency_key)
      VALUES (prev_wallet.id,prev_winner,prev_amount,a.currency,'refund','auctions',a.id,
        'Outbid refund','outbid-'||a.id::text||'-'||prev_winner::text||'-'||extract(epoch from now())::text);
    END IF;
  END IF;

  IF (a.ends_at-now()) <= interval '30 seconds' THEN
    a.ends_at := a.ends_at + interval '60 seconds';
  END IF;

  UPDATE public.auctions
    SET current_price=_amount, winner_id=bidder, bid_count=bid_count+1,
        ends_at=a.ends_at, updated_at=now()
    WHERE id=a.id;

  INSERT INTO public.bids (auction_id,bidder_id,amount)
    VALUES (a.id,bidder,_amount) RETURNING id INTO new_bid_id;
  RETURN new_bid_id;
END;
$function$;
