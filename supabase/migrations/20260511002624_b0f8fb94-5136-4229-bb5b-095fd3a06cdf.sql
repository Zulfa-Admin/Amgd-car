
-- ============ PLAZA (Layer 1: global public chat) ============
CREATE TABLE public.plaza_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 280),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_plaza_created ON public.plaza_messages (created_at DESC);
ALTER TABLE public.plaza_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plaza public read" ON public.plaza_messages
  FOR SELECT USING (true);
CREATE POLICY "auth users post plaza" ON public.plaza_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user deletes own plaza msg" ON public.plaza_messages
  FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));

-- ============ LISTING CHAT (Layer 2: per-listing Q&A) ============
CREATE TABLE public.listing_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  user_id uuid NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_listing_msgs ON public.listing_messages (listing_id, created_at DESC);
ALTER TABLE public.listing_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listing chat public read" ON public.listing_messages
  FOR SELECT USING (true);
CREATE POLICY "auth users post listing chat" ON public.listing_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user deletes own listing msg" ON public.listing_messages
  FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));

-- ============ Privacy filter: mask phones + external URLs ============
CREATE OR REPLACE FUNCTION public.mask_contact_info()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Mask URLs
  NEW.body := regexp_replace(NEW.body, '(https?://|www\.)\S+', '[رابط محظور]', 'gi');
  -- Mask sequences of 8+ digits (with optional spaces/dashes)
  NEW.body := regexp_replace(NEW.body, '(\+?\d[\d\s\-]{7,}\d)', '[رقم محظور]', 'g');
  -- Mask emails
  NEW.body := regexp_replace(NEW.body, '\S+@\S+\.\S+', '[بريد محظور]', 'gi');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mask_plaza BEFORE INSERT ON public.plaza_messages
  FOR EACH ROW EXECUTE FUNCTION public.mask_contact_info();
CREATE TRIGGER trg_mask_listing_msgs BEFORE INSERT ON public.listing_messages
  FOR EACH ROW EXECUTE FUNCTION public.mask_contact_info();

-- ============ Layer 3 gate: private deal chat only for verified parties ============
DROP POLICY IF EXISTS "buyer creates conversation" ON public.conversations;

CREATE OR REPLACE FUNCTION public.can_open_deal_chat(_buyer uuid, _seller uuid, _listing uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    -- Buyer is auction winner for this listing
    EXISTS (SELECT 1 FROM public.auctions a
            WHERE a.listing_id = _listing
              AND a.seller_id = _seller
              AND a.winner_id = _buyer)
    OR
    -- A transaction exists between them on this listing
    EXISTS (SELECT 1 FROM public.transactions t
            WHERE t.buyer_id = _buyer
              AND t.seller_id = _seller
              AND (t.listing_id = _listing OR _listing IS NULL))
    OR
    -- Admin override
    public.has_role(_buyer, 'admin')
$$;

CREATE POLICY "buyer opens deal chat (gated)" ON public.conversations
  FOR INSERT WITH CHECK (
    auth.uid() = buyer_id
    AND public.can_open_deal_chat(buyer_id, seller_id, listing_id)
  );

-- ============ Realtime ============
ALTER TABLE public.plaza_messages REPLICA IDENTITY FULL;
ALTER TABLE public.listing_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.plaza_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_messages;
