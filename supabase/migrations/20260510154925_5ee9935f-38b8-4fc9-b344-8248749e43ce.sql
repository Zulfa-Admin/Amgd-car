
-- Currencies seed
INSERT INTO public.currencies (code, name_ar, name_en, symbol, decimals)
VALUES
  ('YER','ريال يمني','Yemeni Rial','﷼',0),
  ('SAR','ريال سعودي','Saudi Riyal','﷼',2),
  ('USD','دولار أمريكي','US Dollar','$',2)
ON CONFLICT (code) DO NOTHING;

-- Exchange rates seed (base USD)
INSERT INTO public.exchange_rates (base_code, quote_code, rate) VALUES
  ('USD','YER',530),
  ('USD','SAR',3.75),
  ('USD','USD',1),
  ('SAR','YER',141.33),
  ('SAR','USD',0.2667),
  ('SAR','SAR',1),
  ('YER','USD',0.001887),
  ('YER','SAR',0.007075),
  ('YER','YER',1)
ON CONFLICT DO NOTHING;

-- Categories seed
INSERT INTO public.categories (slug, name_ar, icon, sort_order) VALUES
  ('cars','سيارات','car',1),
  ('real-estate','عقارات','home',2),
  ('electronics','إلكترونيات','smartphone',3),
  ('services','خدمات','briefcase',4),
  ('industrial','صناعي','factory',5),
  ('fashion','أزياء','shirt',6)
ON CONFLICT (slug) DO NOTHING;

-- Listing approval + commission exemption
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS commission_exempt boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS commission_exempt boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS free_listings_remaining integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS free_listings_reset_at timestamptz NOT NULL DEFAULT (now() + interval '7 days');

-- Update listings public read to require approval
DROP POLICY IF EXISTS "active listings public" ON public.listings;
CREATE POLICY "active approved listings public" ON public.listings
  FOR SELECT USING (
    ((status = 'active'::listing_status) AND approval_status = 'approved')
    OR (auth.uid() = user_id)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
  );

-- Manual deposits
CREATE TABLE IF NOT EXISTS public.manual_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric(20,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL,
  gateway text NOT NULL,
  reference text,
  proof_url text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);
ALTER TABLE public.manual_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own deposits" ON public.manual_deposits
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users view own deposits" ON public.manual_deposits
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));
CREATE POLICY "staff update deposits" ON public.manual_deposits
  FOR UPDATE USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));

CREATE TRIGGER trg_manual_deposits_updated_at
  BEFORE UPDATE ON public.manual_deposits
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Confirm manual deposit (admin only) -- credits wallet via ledger
CREATE OR REPLACE FUNCTION public.confirm_manual_deposit(_deposit_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.manual_deposits%ROWTYPE;
  w public.wallets%ROWTYPE;
  tx_id uuid;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO d FROM public.manual_deposits WHERE id = _deposit_id FOR UPDATE;
  IF NOT FOUND OR d.status <> 'pending' THEN RAISE EXCEPTION 'invalid deposit'; END IF;

  SELECT * INTO w FROM public.wallets WHERE user_id = d.user_id AND currency = d.currency FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, currency) VALUES (d.user_id, d.currency) RETURNING * INTO w;
  END IF;

  INSERT INTO public.wallet_transactions (wallet_id, user_id, amount, currency, kind, ref_table, ref_id, note)
    VALUES (w.id, d.user_id, d.amount, d.currency, 'deposit', 'manual_deposits', d.id, 'Manual deposit ' || d.gateway)
    RETURNING id INTO tx_id;

  UPDATE public.manual_deposits
     SET status='confirmed', reviewed_at=now(), reviewed_by=auth.uid()
   WHERE id = d.id;

  RETURN tx_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.confirm_manual_deposit(uuid) FROM PUBLIC, anon;

-- Release escrow funds: seller gets amount - commission
CREATE OR REPLACE FUNCTION public.release_escrow_funds(_tx_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.transactions%ROWTYPE;
  seller_wallet public.wallets%ROWTYPE;
  net_amount numeric(20,2);
BEGIN
  SELECT * INTO t FROM public.transactions WHERE id = _tx_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'transaction not found'; END IF;
  IF t.status NOT IN ('funded','pending') THEN RAISE EXCEPTION 'cannot release in status %', t.status; END IF;
  IF auth.uid() <> t.buyer_id AND NOT has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'only buyer or admin can release';
  END IF;

  net_amount := t.amount - t.commission_amount;

  SELECT * INTO seller_wallet FROM public.wallets
    WHERE user_id = t.seller_id AND currency = t.currency FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, currency) VALUES (t.seller_id, t.currency) RETURNING * INTO seller_wallet;
  END IF;

  INSERT INTO public.wallet_transactions (wallet_id, user_id, amount, currency, kind, ref_table, ref_id, note)
    VALUES (seller_wallet.id, t.seller_id, net_amount, t.currency, 'deposit', 'transactions', t.id,
            'Escrow release (net of ' || (t.commission_rate*100)::int || '% commission)');

  UPDATE public.transactions SET status='released', updated_at=now() WHERE id = t.id;
  RETURN t.id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.release_escrow_funds(uuid) FROM PUBLIC, anon;

-- Refund escrow (admin/dispute resolution)
CREATE OR REPLACE FUNCTION public.refund_escrow_funds(_tx_id uuid, _reason text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.transactions%ROWTYPE;
  buyer_wallet public.wallets%ROWTYPE;
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  SELECT * INTO t FROM public.transactions WHERE id = _tx_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tx not found'; END IF;
  IF t.status NOT IN ('funded','pending','disputed') THEN RAISE EXCEPTION 'cannot refund'; END IF;

  SELECT * INTO buyer_wallet FROM public.wallets
    WHERE user_id = t.buyer_id AND currency = t.currency FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, currency) VALUES (t.buyer_id, t.currency) RETURNING * INTO buyer_wallet;
  END IF;

  INSERT INTO public.wallet_transactions (wallet_id, user_id, amount, currency, kind, ref_table, ref_id, note)
    VALUES (buyer_wallet.id, t.buyer_id, t.amount, t.currency, 'deposit', 'transactions', t.id,
            COALESCE('Escrow refund: ' || _reason, 'Escrow refund'));

  UPDATE public.transactions SET status='refunded', notes=_reason, updated_at=now() WHERE id = t.id;
  RETURN t.id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.refund_escrow_funds(uuid, text) FROM PUBLIC, anon;
