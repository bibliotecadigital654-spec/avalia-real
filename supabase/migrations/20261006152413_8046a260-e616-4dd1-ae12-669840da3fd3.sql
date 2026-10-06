CREATE TABLE public.pre_cadastros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo text NOT NULL,
  email text NOT NULL UNIQUE,
  cpf text NOT NULL UNIQUE,
  data_nascimento date NOT NULL,
  origem text NOT NULL DEFAULT 'jotform',
  status text NOT NULL DEFAULT 'pendente',
  user_id uuid,
  concluido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pre_cadastros TO authenticated;
GRANT ALL ON public.pre_cadastros TO service_role;
ALTER TABLE public.pre_cadastros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin ve pre-cadastros" ON public.pre_cadastros FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Servidor gerencia pre-cadastros" ON public.pre_cadastros FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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

  UPDATE public.pre_cadastros SET status = 'concluido', user_id = NEW.id, concluido_em = now()
  WHERE lower(email) = lower(NEW.email) AND status = 'pendente';
  RETURN NEW;
END;
$function$;