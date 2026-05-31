
-- Status enum
CREATE TYPE public.auction_status AS ENUM ('scheduled', 'active', 'ended', 'cancelled');

-- Auctions table
CREATE TABLE public.auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL,
  category_id uuid NOT NULL REFERENCES public.categories(id),
  start_price numeric NOT NULL DEFAULT 0,
  current_price numeric NOT NULL DEFAULT 0,
  bid_increment numeric NOT NULL DEFAULT 10,
  currency text NOT NULL DEFAULT 'SAR',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  status public.auction_status NOT NULL DEFAULT 'active',
  winner_id uuid,
  commission_rate numeric NOT NULL DEFAULT 0.05,
  bid_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_auctions_category ON public.auctions(category_id);
CREATE INDEX idx_auctions_status ON public.auctions(status);
CREATE INDEX idx_auctions_ends_at ON public.auctions(ends_at);

-- Bids table
CREATE TABLE public.bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bids_auction ON public.bids(auction_id, created_at DESC);

ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- Auction policies
CREATE POLICY "auctions public read" ON public.auctions FOR SELECT USING (true);
CREATE POLICY "seller creates auction" ON public.auctions FOR INSERT
  WITH CHECK (auth.uid() = seller_id AND EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND user_id = auth.uid()));
CREATE POLICY "seller updates auction" ON public.auctions FOR UPDATE
  USING (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "seller deletes auction" ON public.auctions FOR DELETE
  USING (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));

-- Bid policies
CREATE POLICY "bids public read" ON public.bids FOR SELECT USING (true);
CREATE POLICY "users place bids" ON public.bids FOR INSERT
  WITH CHECK (auth.uid() = bidder_id);

-- updated_at trigger
CREATE TRIGGER touch_auctions_updated_at BEFORE UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Bid validation + atomic price update
CREATE OR REPLACE FUNCTION public.handle_new_bid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.auctions%ROWTYPE;
BEGIN
  SELECT * INTO a FROM public.auctions WHERE id = NEW.auction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction not found'; END IF;
  IF a.status <> 'active' THEN RAISE EXCEPTION 'Auction is not active'; END IF;
  IF a.ends_at <= now() THEN
    UPDATE public.auctions SET status = 'ended' WHERE id = a.id;
    RAISE EXCEPTION 'Auction has ended';
  END IF;
  IF NEW.bidder_id = a.seller_id THEN RAISE EXCEPTION 'Seller cannot bid on own auction'; END IF;
  IF NEW.amount < a.current_price + a.bid_increment AND NEW.amount <= a.current_price THEN
    RAISE EXCEPTION 'Bid must be higher than current price';
  END IF;
  IF NEW.amount <= a.current_price THEN
    RAISE EXCEPTION 'Bid must exceed current price (%)', a.current_price;
  END IF;

  UPDATE public.auctions
    SET current_price = NEW.amount,
        winner_id = NEW.bidder_id,
        bid_count = bid_count + 1
    WHERE id = a.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_bid_insert BEFORE INSERT ON public.bids
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_bid();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
ALTER TABLE public.auctions REPLICA IDENTITY FULL;
ALTER TABLE public.bids REPLICA IDENTITY FULL;
