
-- =========================================================
-- PHASE 1: Globalization + Wallet + Escrow + Reports
-- =========================================================

-- 1) CURRENCIES
CREATE TABLE public.currencies (
  code text PRIMARY KEY,           -- 'USD','SAR','YER'
  name_ar text NOT NULL,
  name_en text NOT NULL,
  symbol text NOT NULL,
  decimals int NOT NULL DEFAULT 2,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "currencies public read" ON public.currencies FOR SELECT USING (true);
CREATE POLICY "admins manage currencies" ON public.currencies FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.currencies (code,name_ar,name_en,symbol,decimals) VALUES
  ('SAR','ريال سعودي','Saudi Riyal','﷼',2),
  ('USD','دولار أمريكي','US Dollar','$',2),
  ('YER','ريال يمني','Yemeni Rial','﷼',2),
  ('AED','درهم إماراتي','UAE Dirham','د.إ',2),
  ('EUR','يورو','Euro','€',2)
ON CONFLICT DO NOTHING;

-- 2) EXCHANGE RATES (base -> quote)
CREATE TABLE public.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_code text NOT NULL REFERENCES public.currencies(code),
  quote_code text NOT NULL REFERENCES public.currencies(code),
  rate numeric(20,8) NOT NULL CHECK (rate > 0),
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (base_code, quote_code, fetched_at)
);
CREATE INDEX idx_exchange_rates_pair ON public.exchange_rates(base_code, quote_code, fetched_at DESC);
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rates public read" ON public.exchange_rates FOR SELECT USING (true);
CREATE POLICY "admins manage rates" ON public.exchange_rates FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 3) REGIONS
CREATE TABLE public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,                -- ISO 3166-1 alpha-2
  name_ar text NOT NULL,
  name_en text NOT NULL,
  currency_code text NOT NULL REFERENCES public.currencies(code),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (country_code)
);
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "regions public read" ON public.regions FOR SELECT USING (true);
CREATE POLICY "admins manage regions" ON public.regions FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.regions (country_code,name_ar,name_en,currency_code) VALUES
  ('SA','المملكة العربية السعودية','Saudi Arabia','SAR'),
  ('YE','اليمن','Yemen','YER'),
  ('AE','الإمارات','United Arab Emirates','AED'),
  ('US','الولايات المتحدة','United States','USD')
ON CONFLICT DO NOTHING;

-- 4) PROFILES extensions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS preferred_currency text REFERENCES public.currencies(code),
  ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'unverified'
    CHECK (kyc_status IN ('unverified','pending','verified','rejected'));

-- 5) LISTINGS extensions
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES public.regions(id);
CREATE INDEX IF NOT EXISTS idx_listings_country ON public.listings(country_code);

-- 6) WALLETS
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  currency text NOT NULL REFERENCES public.currencies(code),
  balance numeric(20,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  locked_balance numeric(20,2) NOT NULL DEFAULT 0 CHECK (locked_balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, currency)
);
CREATE INDEX idx_wallets_user ON public.wallets(user_id);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own wallet" ON public.wallets FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
-- No INSERT/UPDATE/DELETE policies => only service role (server) can mutate.

CREATE TRIGGER trg_wallets_updated_at BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 7) WALLET TRANSACTIONS (immutable ledger)
CREATE TYPE public.wallet_tx_kind AS ENUM (
  'deposit','withdrawal','hold','release','refund','commission','transfer_in','transfer_out','adjustment'
);

CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  kind public.wallet_tx_kind NOT NULL,
  amount numeric(20,2) NOT NULL,             -- signed: +credit / -debit
  currency text NOT NULL REFERENCES public.currencies(code),
  ref_table text,                            -- 'transactions','auctions',...
  ref_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wtx_user_created ON public.wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_wtx_wallet ON public.wallet_transactions(wallet_id, created_at DESC);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own ledger" ON public.wallet_transactions FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- Immutability: block UPDATE / DELETE for everyone (incl. service role via trigger)
CREATE OR REPLACE FUNCTION public.block_wallet_tx_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'wallet_transactions are immutable';
END;
$$;
CREATE TRIGGER trg_wtx_no_update BEFORE UPDATE ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.block_wallet_tx_mutation();
CREATE TRIGGER trg_wtx_no_delete BEFORE DELETE ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.block_wallet_tx_mutation();

-- Auto-sync wallet balance from ledger on INSERT
CREATE OR REPLACE FUNCTION public.apply_wallet_tx()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.kind = 'hold' THEN
    UPDATE public.wallets
       SET balance = balance - ABS(NEW.amount),
           locked_balance = locked_balance + ABS(NEW.amount),
           updated_at = now()
     WHERE id = NEW.wallet_id;
  ELSIF NEW.kind = 'release' THEN
    UPDATE public.wallets
       SET locked_balance = locked_balance - ABS(NEW.amount),
           updated_at = now()
     WHERE id = NEW.wallet_id;
  ELSIF NEW.kind = 'refund' THEN
    UPDATE public.wallets
       SET locked_balance = locked_balance - ABS(NEW.amount),
           balance = balance + ABS(NEW.amount),
           updated_at = now()
     WHERE id = NEW.wallet_id;
  ELSE
    UPDATE public.wallets
       SET balance = balance + NEW.amount,
           updated_at = now()
     WHERE id = NEW.wallet_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_wtx_apply AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.apply_wallet_tx();

-- 8) ESCROW TRANSACTIONS
CREATE TYPE public.tx_status AS ENUM ('pending','funded','released','refunded','disputed','cancelled');

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  auction_id uuid REFERENCES public.auctions(id) ON DELETE SET NULL,
  amount numeric(20,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL REFERENCES public.currencies(code),
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.05,
  commission_amount numeric(20,2) NOT NULL DEFAULT 0,
  status public.tx_status NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (buyer_id <> seller_id)
);
CREATE INDEX idx_tx_buyer ON public.transactions(buyer_id, created_at DESC);
CREATE INDEX idx_tx_seller ON public.transactions(seller_id, created_at DESC);
CREATE INDEX idx_tx_auction ON public.transactions(auction_id);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parties view tx" ON public.transactions FOR SELECT
  USING (auth.uid() IN (buyer_id, seller_id) OR public.has_role(auth.uid(),'admin'));
-- Writes only via server (service role).

CREATE TRIGGER trg_tx_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 9) REPORTS
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('listing','user','auction','message')),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reports_status ON public.reports(status, created_at DESC);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users create reports" ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reporter or staff view" ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "staff update reports" ON public.reports FOR UPDATE
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TRIGGER trg_reports_updated_at BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 10) finalize_auction(): close + create escrow + lock winner funds
CREATE OR REPLACE FUNCTION public.finalize_auction(_auction_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a public.auctions%ROWTYPE;
  w public.wallets%ROWTYPE;
  tx_id uuid;
  commission numeric(20,2);
BEGIN
  SELECT * INTO a FROM public.auctions WHERE id = _auction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction not found'; END IF;
  IF a.status = 'ended' AND a.winner_id IS NULL THEN RETURN NULL; END IF;

  -- Mark ended
  UPDATE public.auctions SET status = 'ended', updated_at = now()
    WHERE id = a.id AND status = 'active';

  IF a.winner_id IS NULL OR a.bid_count = 0 THEN
    RETURN NULL; -- no winner
  END IF;

  commission := round(a.current_price * a.commission_rate, 2);

  -- Ensure winner wallet exists in auction currency
  SELECT * INTO w FROM public.wallets
    WHERE user_id = a.winner_id AND currency = a.currency FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, currency) VALUES (a.winner_id, a.currency)
      RETURNING * INTO w;
  END IF;

  -- Create escrow transaction
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
REVOKE EXECUTE ON FUNCTION public.finalize_auction(uuid) FROM PUBLIC, anon, authenticated;

-- Auto-finalize when close_expired_auctions runs
CREATE OR REPLACE FUNCTION public.close_expired_auctions()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  FOR r IN
    SELECT id FROM public.auctions
     WHERE status = 'active' AND ends_at <= now()
  LOOP
    PERFORM public.finalize_auction(r.id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.close_expired_auctions() FROM PUBLIC, anon, authenticated;
