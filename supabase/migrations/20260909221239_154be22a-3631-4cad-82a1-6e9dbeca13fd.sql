CREATE TABLE public.licenca_pedidos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pendente',
  valor numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.licenca_pedidos TO authenticated;
GRANT ALL ON public.licenca_pedidos TO service_role;

ALTER TABLE public.licenca_pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver os proprios pedidos" ON public.licenca_pedidos
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Criar os proprios pedidos" ON public.licenca_pedidos
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_licenca_pedidos_updated_at
  BEFORE UPDATE ON public.licenca_pedidos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.confirmar_pagamento_licenca(_payment_id text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  SELECT user_id INTO _user_id FROM public.licenca_pedidos WHERE payment_id = _payment_id;
  IF _user_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.licenca_pedidos
    SET status = 'pago'
    WHERE payment_id = _payment_id;

  UPDATE public.profiles
    SET status_licenca = 'ativo',
        data_assinatura = now(),
        validade_licenca = now() + interval '365 days'
    WHERE id = _user_id;

  RETURN _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirmar_pagamento_licenca(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_pagamento_licenca(text) TO service_role;