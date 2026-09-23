-- TEMPORÁRIO: enquanto o paywall de planos estiver desativado, contas sem plano
-- ativo usam o Robô IA como Ouro (ilimitado). Reverter ao reativar o paywall.
CREATE OR REPLACE FUNCTION public.executar_robo_ia()
 RETURNS TABLE(permitido boolean, usadas integer, limite integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Paywall desativado: conta sem plano ativo recebe acesso Ouro temporário
    IF v_lim = 0 THEN v_lim := -1; END IF;
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
$function$;