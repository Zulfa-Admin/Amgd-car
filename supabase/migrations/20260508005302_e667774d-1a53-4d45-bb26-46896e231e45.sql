
CREATE OR REPLACE FUNCTION public.block_wallet_tx_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'wallet_transactions are immutable';
END;
$$;
