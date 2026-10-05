DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'admin_resgates()','admin_usuarios()','admin_visao_geral()','aplicar_licenca_vitalicia()','ativar_licenca()',
    'confirmar_pagamento_licenca(text)','creditar_recompensa(uuid,numeric,text)',
    'creditar_recompensa_externa(text,text,uuid,numeric,numeric,numeric)','executar_robo_ia()','handle_new_user()',
    'has_role(uuid,app_role)','revisar_envio(uuid,boolean)','revisar_resgate(uuid,boolean)',
    'solicitar_resgate(numeric,text,text)','sync_wallet_saldo()'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', f);
  END LOOP;
  -- Funções só do servidor (pagamentos, créditos, gatilhos): ninguém logado pode chamá-las diretamente
  FOREACH f IN ARRAY ARRAY[
    'ativar_licenca()','confirmar_pagamento_licenca(text)','creditar_recompensa(uuid,numeric,text)',
    'creditar_recompensa_externa(text,text,uuid,numeric,numeric,numeric)','handle_new_user()','sync_wallet_saldo()'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM authenticated', f);
  END LOOP;
  -- Funções usadas pelo app (cada uma confere o usuário/admin internamente)
  FOREACH f IN ARRAY ARRAY[
    'admin_resgates()','admin_usuarios()','admin_visao_geral()','aplicar_licenca_vitalicia()','executar_robo_ia()',
    'has_role(uuid,app_role)','revisar_envio(uuid,boolean)','revisar_resgate(uuid,boolean)','solicitar_resgate(numeric,text,text)'
  ] LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;