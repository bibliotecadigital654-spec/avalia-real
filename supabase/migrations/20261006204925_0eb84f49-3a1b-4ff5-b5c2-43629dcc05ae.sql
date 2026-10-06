CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TABLE public.sync_externo_fila (
  id bigserial PRIMARY KEY,
  tabela text NOT NULL,
  registro_id uuid NOT NULL,
  tentativas int NOT NULL DEFAULT 0,
  erro text,
  processado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.sync_externo_fila TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.sync_externo_fila_id_seq TO service_role;
ALTER TABLE public.sync_externo_fila ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Servidor gerencia fila externa" ON public.sync_externo_fila FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX sync_externo_fila_pend ON public.sync_externo_fila (created_at) WHERE processado_em IS NULL;

CREATE OR REPLACE FUNCTION public.enfileirar_sync_externo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.sync_externo_fila (tabela, registro_id) VALUES (TG_TABLE_NAME, NEW.id);
  BEGIN
    PERFORM net.http_post(
      url := 'https://avalia-real.lovable.app/api/public/sync-externo',
      body := '{}'::jsonb,
      headers := '{"Content-Type":"application/json"}'::jsonb
    );
  EXCEPTION WHEN others THEN NULL;
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_sync_externo AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enfileirar_sync_externo();
CREATE TRIGGER transactions_sync_externo AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.enfileirar_sync_externo();

INSERT INTO public.sync_externo_fila (tabela, registro_id)
  SELECT 'profiles', id FROM public.profiles;
INSERT INTO public.sync_externo_fila (tabela, registro_id)
  SELECT 'transactions', id FROM public.transactions;

SELECT cron.schedule('sync-externo-hora', '0 * * * *', $$
  SELECT net.http_post(url := 'https://avalia-real.lovable.app/api/public/sync-externo', body := '{}'::jsonb, headers := '{"Content-Type":"application/json"}'::jsonb);
$$);