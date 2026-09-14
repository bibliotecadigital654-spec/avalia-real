CREATE TABLE public.external_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  transaction_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  valor_origem numeric NOT NULL,
  taxa_conversao numeric NOT NULL,
  valor_creditado numeric NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT external_rewards_provider_transaction_unique UNIQUE (provider, transaction_id),
  CONSTRAINT external_rewards_valores_validos CHECK (
    valor_origem > 0 AND taxa_conversao > 0 AND valor_creditado > 0
  )
);

GRANT ALL ON public.external_rewards TO service_role;

ALTER TABLE public.external_rewards ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_external_rewards_updated_at
BEFORE UPDATE ON public.external_rewards
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.creditar_recompensa_externa(
  _provider text,
  _transaction_id text,
  _user_id uuid,
  _valor_origem numeric,
  _taxa_conversao numeric,
  _valor_creditado numeric
)
RETURNS TABLE(saldo_atual numeric, creditado boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward_id uuid;
  v_saldo numeric;
BEGIN
  IF nullif(btrim(_provider), '') IS NULL OR nullif(btrim(_transaction_id), '') IS NULL THEN
    RAISE EXCEPTION 'Identificacao da recompensa invalida';
  END IF;
  IF _valor_origem IS NULL OR _valor_origem <= 0 OR
     _taxa_conversao IS NULL OR _taxa_conversao <= 0 OR
     _valor_creditado IS NULL OR _valor_creditado <= 0 THEN
    RAISE EXCEPTION 'Valor da recompensa invalido';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    RAISE EXCEPTION 'Usuario nao encontrado';
  END IF;

  INSERT INTO public.external_rewards (
    provider, transaction_id, user_id, valor_origem, taxa_conversao, valor_creditado
  ) VALUES (
    lower(btrim(_provider)), btrim(_transaction_id), _user_id, _valor_origem, _taxa_conversao, _valor_creditado
  )
  ON CONFLICT (provider, transaction_id) DO NOTHING
  RETURNING id INTO v_reward_id;

  IF v_reward_id IS NULL THEN
    SELECT saldo INTO v_saldo FROM public.profiles WHERE id = _user_id;
    RETURN QUERY SELECT v_saldo, false;
    RETURN;
  END IF;

  UPDATE public.profiles
  SET saldo = saldo + _valor_creditado
  WHERE id = _user_id
  RETURNING saldo INTO v_saldo;

  INSERT INTO public.transactions (user_id, descricao, tipo, valor, tarefa_id)
  VALUES (
    _user_id,
    'Recompensa BitLabs',
    'credito',
    _valor_creditado,
    'bitlabs:' || btrim(_transaction_id)
  );

  RETURN QUERY SELECT v_saldo, true;
END;
$$;

REVOKE ALL ON FUNCTION public.creditar_recompensa_externa(text, text, uuid, numeric, numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.creditar_recompensa_externa(text, text, uuid, numeric, numeric, numeric) TO service_role;