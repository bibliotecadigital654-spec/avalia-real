
REVOKE EXECUTE ON FUNCTION public.solicitar_resgate(numeric, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.revisar_resgate(uuid, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_visao_geral() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_usuarios() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_resgates() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.revisar_envio(uuid, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.ativar_licenca() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.aplicar_licenca_vitalicia() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.creditar_recompensa(uuid, numeric, text) FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.confirmar_pagamento_licenca(text) FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_licenca_vitalicia(text) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.solicitar_resgate(numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revisar_resgate(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_visao_geral() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_usuarios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resgates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.revisar_envio(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ativar_licenca() TO authenticated;
GRANT EXECUTE ON FUNCTION public.aplicar_licenca_vitalicia() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.creditar_recompensa(uuid, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirmar_pagamento_licenca(text) TO service_role;
