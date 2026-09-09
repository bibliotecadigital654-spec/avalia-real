ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS data_assinatura timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS status_licenca text NOT NULL DEFAULT 'inativo',
  ADD COLUMN IF NOT EXISTS validade_licenca timestamptz DEFAULT NULL;

ALTER TABLE public.submissions ALTER COLUMN foto_url DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.ativar_licenca()
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Nao autenticado'; END IF;
  UPDATE public.profiles
     SET data_assinatura = now(),
         status_licenca = 'ativo',
         validade_licenca = now() + interval '365 days'
   WHERE id = auth.uid()
  RETURNING * INTO p;
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil nao encontrado'; END IF;
  RETURN p;
END;
$$;

REVOKE ALL ON FUNCTION public.ativar_licenca() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ativar_licenca() TO authenticated;