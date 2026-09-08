-- roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Ver os proprios papeis" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  saldo numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver o proprio perfil" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Atualizar o proprio nome" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Criar o proprio perfil" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- tasks
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  empresa text NOT NULL,
  local text NOT NULL DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  valor numeric(12,2) NOT NULL,
  tempo_estimado text NOT NULL DEFAULT '~5 min',
  prazo text NOT NULL DEFAULT 'hoje',
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tarefas ativas visiveis" ON public.tasks
  FOR SELECT TO authenticated USING (ativa OR public.has_role(auth.uid(), 'admin'));

INSERT INTO public.tasks (titulo, empresa, local, descricao, valor, tempo_estimado, prazo) VALUES
('Avaliar atendimento na cafeteria Aurora', 'Café Aurora', 'São Paulo, SP', 'Vá até a loja, observe o atendimento e registre uma foto do balcão.', 3.50, '~5 min', 'hoje'),
('Testar o app de delivery da Vetor', 'Loja Vetor', 'Rio de Janeiro, RJ', 'Faça um pedido de teste no app e relate a experiência com uma foto da tela.', 8.00, '~10 min', '2 dias'),
('Conferir preços do Mercado Sol', 'Mercado Sol', 'Belo Horizonte, MG', 'Confira a prateleira de bebidas e fotografe as etiquetas de preço.', 4.20, '~8 min', 'amanhã'),
('Avaliar limpeza da Farmácia Vida', 'Farmácia Vida', 'Curitiba, PR', 'Observe a organização das prateleiras e registre uma foto do corredor principal.', 2.80, '~5 min', '3 dias');

-- submissions
CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  experiencia text NOT NULL,
  comentario text NOT NULL DEFAULT '',
  foto_url text,
  valor numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT, INSERT ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver os proprios envios" ON public.submissions
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Criar os proprios envios" ON public.submissions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin atualiza envios" ON public.submissions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- transactions
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  tipo text NOT NULL DEFAULT 'ganho',
  valor numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver as proprias movimentacoes" ON public.transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- payouts
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  valor numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'solicitado',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver os proprios resgates" ON public.payouts
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Criar os proprios resgates" ON public.payouts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- review function (admin only)
CREATE OR REPLACE FUNCTION public.revisar_envio(_submission_id uuid, _aprovar boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.submissions%ROWTYPE;
  t_titulo text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem revisar envios';
  END IF;

  SELECT * INTO s FROM public.submissions WHERE id = _submission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Envio nao encontrado'; END IF;
  IF s.status <> 'pendente' THEN RAISE EXCEPTION 'Envio ja revisado'; END IF;

  SELECT titulo INTO t_titulo FROM public.tasks WHERE id = s.task_id;

  IF _aprovar THEN
    UPDATE public.submissions SET status = 'aprovada', reviewed_at = now() WHERE id = s.id;
    UPDATE public.profiles SET saldo = saldo + s.valor WHERE id = s.user_id;
    INSERT INTO public.transactions (user_id, descricao, tipo, valor)
    VALUES (s.user_id, COALESCE(t_titulo, 'Tarefa aprovada'), 'ganho', s.valor);
  ELSE
    UPDATE public.submissions SET status = 'rejeitada', reviewed_at = now() WHERE id = s.id;
  END IF;
END;
$$;

-- payout request (deducts balance)
CREATE OR REPLACE FUNCTION public.solicitar_resgate(_valor numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  saldo_atual numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Nao autenticado'; END IF;
  IF _valor IS NULL OR _valor <= 0 THEN RAISE EXCEPTION 'Valor invalido'; END IF;

  SELECT saldo INTO saldo_atual FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF saldo_atual IS NULL OR saldo_atual < _valor THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;

  UPDATE public.profiles SET saldo = saldo - _valor WHERE id = auth.uid();
  INSERT INTO public.payouts (user_id, valor) VALUES (auth.uid(), _valor);
  INSERT INTO public.transactions (user_id, descricao, tipo, valor)
  VALUES (auth.uid(), 'Resgate solicitado', 'resgate', -_valor);
END;
$$;