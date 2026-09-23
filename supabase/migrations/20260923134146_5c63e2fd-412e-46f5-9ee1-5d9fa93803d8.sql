ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS selfie_url text,
  ADD COLUMN IF NOT EXISTS termos_aceitos boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS plano text NOT NULL DEFAULT 'nenhum';

ALTER TABLE public.licenca_pedidos
  ADD COLUMN IF NOT EXISTS plano text NOT NULL DEFAULT 'bronze';

UPDATE public.profiles p
   SET plano = 'ouro'
  FROM auth.users u
 WHERE u.id = p.id AND public.email_licenca_vitalicia(u.email);

CREATE TABLE IF NOT EXISTS public.robo_execucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.robo_execucoes TO authenticated;
GRANT ALL ON public.robo_execucoes TO service_role;
ALTER TABLE public.robo_execucoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver as proprias execucoes" ON public.robo_execucoes;
CREATE POLICY "Ver as proprias execucoes" ON public.robo_execucoes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.limite_plano(_plano text)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE lower(coalesce(_plano, 'nenhum'))
    WHEN 'bronze' THEN 5
    WHEN 'prata' THEN 15
    WHEN 'ouro' THEN -1
    ELSE 0 END;
$$;

CREATE OR REPLACE FUNCTION public.executar_robo_ia()
RETURNS TABLE(permitido boolean, usadas integer, limite integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_plano text;
  v_lim integer;
  v_usadas integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Nao autenticado'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT plano INTO v_plano FROM public.profiles WHERE id = v_uid;

  IF public.email_licenca_vitalicia(v_email) THEN
    v_lim := -1;
  ELSE
    v_lim := public.limite_plano(v_plano);
  END IF;

  SELECT count(*) INTO v_usadas FROM public.robo_execucoes
   WHERE user_id = v_uid AND created_at >= date_trunc('day', now());

  IF v_lim = 0 OR (v_lim > 0 AND v_usadas >= v_lim) THEN
    RETURN QUERY SELECT false, v_usadas, v_lim;
    RETURN;
  END IF;

  INSERT INTO public.robo_execucoes (user_id) VALUES (v_uid);
  RETURN QUERY SELECT true, v_usadas + 1, v_lim;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirmar_pagamento_licenca(_payment_id text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _user_id uuid;
  _plano text;
BEGIN
  SELECT user_id, plano INTO _user_id, _plano FROM public.licenca_pedidos WHERE payment_id = _payment_id;
  IF _user_id IS NULL THEN RETURN NULL; END IF;

  UPDATE public.licenca_pedidos SET status = 'pago' WHERE payment_id = _payment_id;

  UPDATE public.profiles
     SET status_licenca = 'ativo',
         plano = coalesce(_plano, 'bronze'),
         data_assinatura = now(),
         validade_licenca = now() + interval '365 days'
   WHERE id = _user_id;

  RETURN _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.aplicar_licenca_vitalicia()
RETURNS profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_email text;
  p public.profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Nao autenticado'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF NOT public.email_licenca_vitalicia(v_email) THEN
    SELECT * INTO p FROM public.profiles WHERE id = auth.uid();
    RETURN p;
  END IF;
  UPDATE public.profiles
     SET status_licenca = 'ativo',
         plano = 'ouro',
         data_assinatura = COALESCE(data_assinatura, now()),
         validade_licenca = timestamptz '2100-01-01 00:00:00+00'
   WHERE id = auth.uid()
  RETURNING * INTO p;
  RETURN p;
END;
$$;

CREATE OR REPLACE FUNCTION public.solicitar_resgate(_valor numeric, _pix_tipo text, _pix_chave text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  saldo_atual numeric;
  novo_id uuid;
  v_email text;
  v_ultimo timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Nao autenticado'; END IF;
  IF _valor IS NULL OR _valor <= 0 THEN RAISE EXCEPTION 'Valor invalido'; END IF;
  IF _valor < 20 THEN RAISE EXCEPTION 'Saldo insuficiente. O valor minimo para saque e de R$ 20,00.'; END IF;
  IF _pix_tipo IS NULL OR _pix_tipo NOT IN ('cpf','cnpj','email','celular','chave_aleatoria') THEN
    RAISE EXCEPTION 'Tipo de chave Pix invalido';
  END IF;
  IF _pix_chave IS NULL OR length(btrim(_pix_chave)) < 4 THEN RAISE EXCEPTION 'Chave Pix invalida'; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  IF NOT public.email_licenca_vitalicia(v_email) THEN
    SELECT max(created_at) INTO v_ultimo FROM public.payouts
     WHERE user_id = auth.uid() AND status <> 'rejeitado';
    IF v_ultimo IS NOT NULL AND v_ultimo > now() - interval '7 days' THEN
      RAISE EXCEPTION 'Voce so pode solicitar um saque a cada 7 dias.';
    END IF;
  END IF;

  SELECT saldo INTO saldo_atual FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF saldo_atual IS NULL OR saldo_atual < _valor THEN
    RAISE EXCEPTION 'Saldo insuficiente. O valor minimo para saque e de R$ 20,00.';
  END IF;

  UPDATE public.profiles SET saldo = saldo - _valor WHERE id = auth.uid();
  INSERT INTO public.payouts (user_id, valor, status, pix_tipo, pix_chave)
  VALUES (auth.uid(), _valor, 'pendente', _pix_tipo, btrim(_pix_chave))
  RETURNING id INTO novo_id;

  INSERT INTO public.transactions (user_id, descricao, tipo, valor)
  VALUES (auth.uid(), 'Saque via Pix solicitado (pendente)', 'debito', -_valor);

  RETURN novo_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.creditar_recompensa_externa(_provider text, _transaction_id text, _user_id uuid, _valor_origem numeric, _taxa_conversao numeric, _valor_creditado numeric)
RETURNS TABLE(saldo_atual numeric, creditado boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_reward_id uuid;
  v_saldo numeric;
  v_provider text := lower(btrim(coalesce(_provider, '')));
  v_rotulo text;
BEGIN
  IF nullif(v_provider, '') IS NULL OR nullif(btrim(_transaction_id), '') IS NULL THEN
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

  v_rotulo := CASE v_provider WHEN 'adgem' THEN 'Recompensa AdGem' WHEN 'bitlabs' THEN 'Recompensa BitLabs' ELSE 'Recompensa ' || initcap(v_provider) END;

  INSERT INTO public.external_rewards (
    provider, transaction_id, user_id, valor_origem, taxa_conversao, valor_creditado
  ) VALUES (
    v_provider, btrim(_transaction_id), _user_id, _valor_origem, _taxa_conversao, _valor_creditado
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
  VALUES (_user_id, v_rotulo, 'credito', _valor_creditado, v_provider || ':' || btrim(_transaction_id));

  RETURN QUERY SELECT v_saldo, true;
END;
$$;

DROP POLICY IF EXISTS "Usuario ve a propria selfie" ON storage.objects;
CREATE POLICY "Usuario ve a propria selfie" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'kyc' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'::app_role)));
