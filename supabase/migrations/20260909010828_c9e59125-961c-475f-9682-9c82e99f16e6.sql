
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nome_completo text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pix_key text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tarefa_id text;

UPDATE public.profiles SET nome_completo = nome WHERE nome_completo = '';

CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  saldo_atual numeric NOT NULL DEFAULT 0.00,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver a propria carteira" ON public.wallets;
CREATE POLICY "Ver a propria carteira" ON public.wallets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

INSERT INTO public.wallets (user_id, saldo_atual)
SELECT p.id, p.saldo FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_wallet_saldo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.wallets (user_id, saldo_atual)
  VALUES (NEW.id, NEW.saldo)
  ON CONFLICT (user_id) DO UPDATE SET saldo_atual = EXCLUDED.saldo_atual, updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_wallet ON public.profiles;
CREATE TRIGGER profiles_sync_wallet
AFTER INSERT OR UPDATE OF saldo ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_wallet_saldo();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nome text;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  INSERT INTO public.profiles (id, nome, nome_completo, pix_key)
  VALUES (NEW.id, v_nome, v_nome, NULLIF(NEW.raw_user_meta_data->>'pix_key', ''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.wallets (user_id, saldo_atual) VALUES (NEW.id, 0.00)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.creditar_recompensa(_user_id uuid, _valor numeric, _tarefa_id text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  novo numeric;
BEGIN
  IF _valor IS NULL OR _valor <= 0 THEN RAISE EXCEPTION 'Valor invalido'; END IF;
  UPDATE public.profiles SET saldo = saldo + _valor WHERE id = _user_id RETURNING saldo INTO novo;
  IF novo IS NULL THEN RAISE EXCEPTION 'Usuario nao encontrado'; END IF;
  INSERT INTO public.transactions (user_id, descricao, tipo, valor, tarefa_id)
  VALUES (_user_id, 'Oferta concluida ' || COALESCE(_tarefa_id, ''), 'credito', _valor, _tarefa_id);
  RETURN novo;
END;
$$;

REVOKE ALL ON FUNCTION public.creditar_recompensa(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.creditar_recompensa(uuid, numeric, text) TO service_role;

ALTER TABLE public.wallets REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
