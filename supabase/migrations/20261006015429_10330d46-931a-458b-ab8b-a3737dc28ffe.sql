CREATE OR REPLACE FUNCTION public.email_licenca_vitalicia(_email text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT lower(trim(coalesce(_email, ''))) IN ('bibliotecadigital654@gmail.com','carol.pr2014@gmail.com');
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nome text;
  v_vitalicia boolean;
  v_admin boolean;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_vitalicia := public.email_licenca_vitalicia(NEW.email);
  v_admin := lower(coalesce(NEW.email,'')) = 'bibliotecadigital654@gmail.com';

  INSERT INTO public.profiles (id, nome, nome_completo, pix_key, status_licenca, data_assinatura, validade_licenca, plano)
  VALUES (
    NEW.id, v_nome, v_nome, NULLIF(NEW.raw_user_meta_data->>'pix_key', ''),
    CASE WHEN v_vitalicia THEN 'ativo' ELSE 'inativo' END,
    CASE WHEN v_vitalicia THEN now() ELSE NULL END,
    CASE WHEN v_vitalicia THEN timestamptz '2100-01-01 00:00:00+00' ELSE NULL END,
    CASE WHEN v_vitalicia THEN 'ouro' ELSE 'nenhum' END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN v_admin THEN 'admin'::app_role ELSE 'user'::app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.wallets (user_id, saldo_atual) VALUES (NEW.id, 0.00)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.executar_robo_ia() RETURNS TABLE(permitido boolean, usadas integer, limite integer) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_plano text;
  v_status text;
  v_validade timestamptz;
  v_lim integer;
  v_usadas integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Nao autenticado'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT plano, status_licenca, validade_licenca INTO v_plano, v_status, v_validade FROM public.profiles WHERE id = v_uid;

  IF public.email_licenca_vitalicia(v_email) THEN
    v_lim := -1;
  ELSIF v_status = 'ativo' AND v_validade IS NOT NULL AND v_validade > now() THEN
    v_lim := public.limite_plano(v_plano);
  ELSE
    v_lim := 0;
  END IF;

  SELECT count(*)::int INTO v_usadas FROM public.robo_execucoes
   WHERE user_id = v_uid AND created_at >= date_trunc('day', now());

  IF v_lim = 0 OR (v_lim > 0 AND v_usadas >= v_lim) THEN
    RETURN QUERY SELECT false, v_usadas, v_lim;
    RETURN;
  END IF;

  INSERT INTO public.robo_execucoes (user_id) VALUES (v_uid);
  RETURN QUERY SELECT true, v_usadas + 1, v_lim;
END;
$$;