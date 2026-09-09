CREATE OR REPLACE FUNCTION public.email_licenca_vitalicia(_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(coalesce(_email, '')) IN ('bibliotecadigital654@gmail.com');
$$;

CREATE OR REPLACE FUNCTION public.aplicar_licenca_vitalicia()
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
         data_assinatura = COALESCE(data_assinatura, now()),
         validade_licenca = timestamptz '2100-01-01 00:00:00+00'
   WHERE id = auth.uid()
  RETURNING * INTO p;
  RETURN p;
END;
$$;

REVOKE ALL ON FUNCTION public.aplicar_licenca_vitalicia() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.aplicar_licenca_vitalicia() TO authenticated;
GRANT EXECUTE ON FUNCTION public.email_licenca_vitalicia(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome text;
  v_vitalicia boolean;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_vitalicia := public.email_licenca_vitalicia(NEW.email);

  INSERT INTO public.profiles (id, nome, nome_completo, pix_key, status_licenca, data_assinatura, validade_licenca)
  VALUES (
    NEW.id, v_nome, v_nome, NULLIF(NEW.raw_user_meta_data->>'pix_key', ''),
    CASE WHEN v_vitalicia THEN 'ativo' ELSE 'inativo' END,
    CASE WHEN v_vitalicia THEN now() ELSE NULL END,
    CASE WHEN v_vitalicia THEN timestamptz '2100-01-01 00:00:00+00' ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN v_vitalicia THEN 'admin'::app_role ELSE 'user'::app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.wallets (user_id, saldo_atual) VALUES (NEW.id, 0.00)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;