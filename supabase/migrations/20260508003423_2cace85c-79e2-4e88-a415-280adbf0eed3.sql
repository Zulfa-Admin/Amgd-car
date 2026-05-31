-- Fix bid validation: require amount >= current_price + bid_increment, plus 2s cooldown
CREATE OR REPLACE FUNCTION public.handle_new_bid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  a public.auctions%ROWTYPE;
  last_bid_at timestamptz;
BEGIN
  SELECT * INTO a FROM public.auctions WHERE id = NEW.auction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction not found'; END IF;

  -- Auto-end if expired
  IF a.ends_at <= now() THEN
    UPDATE public.auctions SET status = 'ended' WHERE id = a.id AND status = 'active';
    RAISE EXCEPTION 'Auction has ended';
  END IF;

  IF a.status <> 'active' THEN RAISE EXCEPTION 'Auction is not active'; END IF;
  IF NEW.bidder_id = a.seller_id THEN RAISE EXCEPTION 'Seller cannot bid on own auction'; END IF;

  -- Strict minimum: must be >= current + increment
  IF NEW.amount < a.current_price + a.bid_increment THEN
    RAISE EXCEPTION 'Bid must be at least % (current % + increment %)',
      a.current_price + a.bid_increment, a.current_price, a.bid_increment;
  END IF;

  -- Anti-spam: 2-second cooldown per user per auction
  SELECT MAX(created_at) INTO last_bid_at
    FROM public.bids
    WHERE auction_id = NEW.auction_id AND bidder_id = NEW.bidder_id;
  IF last_bid_at IS NOT NULL AND now() - last_bid_at < interval '2 seconds' THEN
    RAISE EXCEPTION 'Please wait a moment before bidding again';
  END IF;

  UPDATE public.auctions
    SET current_price = NEW.amount,
        winner_id = NEW.bidder_id,
        bid_count = bid_count + 1,
        updated_at = now()
    WHERE id = a.id;

  RETURN NEW;
END;
$$;

-- Make sure the trigger exists
DROP TRIGGER IF EXISTS on_bid_insert ON public.bids;
CREATE TRIGGER on_bid_insert
  BEFORE INSERT ON public.bids
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_bid();

-- Auto-close expired auctions (called on read or via cron)
CREATE OR REPLACE FUNCTION public.close_expired_auctions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  closed_count integer;
BEGIN
  WITH updated AS (
    UPDATE public.auctions
      SET status = 'ended', updated_at = now()
      WHERE status = 'active' AND ends_at <= now()
      RETURNING 1
  )
  SELECT count(*) INTO closed_count FROM updated;
  RETURN closed_count;
END;
$$;

-- Helpful index for cooldown lookups
CREATE INDEX IF NOT EXISTS idx_bids_auction_bidder_created
  ON public.bids (auction_id, bidder_id, created_at DESC);
