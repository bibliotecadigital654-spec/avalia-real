
ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS pix_tipo text NOT NULL DEFAULT 'chave_aleatoria',
  ADD COLUMN IF NOT EXISTS pix_chave text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS update_payouts_updated_at ON public.payouts;
CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON public.payouts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "Admin atualiza resgates" ON public.payouts;
CREATE POLICY "Admin atualiza resgates" ON public.payouts
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP FUNCTION IF EXISTS public.solicitar_resgate(numeric);

CREATE OR REPLACE FUNCTION public.solicitar_resgate(_valor numeric, _pix_tipo text, _pix_chave text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  saldo_atual numeric;
  novo_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Nao autenticado'; END IF;
  IF _valor IS NULL OR _valor <= 0 THEN RAISE EXCEPTION 'Valor invalido'; END IF;
  IF _valor < 20 THEN RAISE EXCEPTION 'Saldo insuficiente. O valor minimo para saque e de R$ 20,00.'; END IF;
  IF _pix_tipo IS NULL OR _pix_tipo NOT IN ('cpf','cnpj','email','celular','chave_aleatoria') THEN
    RAISE EXCEPTION 'Tipo de chave Pix invalido';
  END IF;
  IF _pix_chave IS NULL OR length(btrim(_pix_chave)) < 4 THEN RAISE EXCEPTION 'Chave Pix invalida'; END IF;

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

CREATE OR REPLACE FUNCTION public.revisar_resgate(_payout_id uuid, _aprovar boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.payouts%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem revisar saques';
  END IF;

  SELECT * INTO p FROM public.payouts WHERE id = _payout_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido nao encontrado'; END IF;
  IF p.status NOT IN ('pendente', 'solicitado') THEN RAISE EXCEPTION 'Pedido ja revisado'; END IF;

  IF _aprovar THEN
    UPDATE public.payouts SET status = 'concluido' WHERE id = p.id;
    INSERT INTO public.transactions (user_id, descricao, tipo, valor)
    VALUES (p.user_id, 'Saque via Pix concluido', 'debito', 0);
  ELSE
    UPDATE public.payouts SET status = 'rejeitado' WHERE id = p.id;
    UPDATE public.profiles SET saldo = saldo + p.valor WHERE id = p.user_id;
    INSERT INTO public.transactions (user_id, descricao, tipo, valor)
    VALUES (p.user_id, 'Saque rejeitado - valor devolvido', 'credito', p.valor);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_visao_geral()
RETURNS TABLE (total_usuarios bigint, licencas_ativas bigint, saldo_total numeric, lucro_estimado numeric, saques_pendentes bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.profiles),
    (SELECT count(*) FROM public.profiles WHERE status_licenca = 'ativo'),
    (SELECT COALESCE(sum(saldo), 0) FROM public.profiles),
    (SELECT COALESCE(sum(valor), 0) FROM public.licenca_pedidos WHERE status = 'pago')
      + (SELECT COALESCE(sum(valor), 0) FROM public.transactions WHERE tipo IN ('ganho','credito')) * 0.25,
    (SELECT count(*) FROM public.payouts WHERE status IN ('pendente','solicitado'));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_usuarios()
RETURNS TABLE (user_id uuid, email text, nome text, status_licenca text, validade_licenca timestamptz, saldo numeric, criado_em timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  RETURN QUERY
  SELECT p.id, u.email::text, COALESCE(NULLIF(p.nome_completo, ''), p.nome),
         p.status_licenca, p.validade_licenca, p.saldo, p.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_resgates()
RETURNS TABLE (id uuid, user_id uuid, email text, nome text, valor numeric, status text, pix_tipo text, pix_chave text, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  RETURN QUERY
  SELECT r.id, r.user_id, u.email::text, COALESCE(NULLIF(p.nome_completo, ''), p.nome),
         r.valor, r.status, r.pix_tipo, r.pix_chave, r.created_at
  FROM public.payouts r
  JOIN auth.users u ON u.id = r.user_id
  LEFT JOIN public.profiles p ON p.id = r.user_id
  ORDER BY (r.status IN ('pendente','solicitado')) DESC, r.created_at DESC;
END;
$$;

ALTER TABLE public.payouts REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.payouts; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
