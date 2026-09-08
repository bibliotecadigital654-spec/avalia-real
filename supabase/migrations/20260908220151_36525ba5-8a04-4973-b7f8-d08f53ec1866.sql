REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revisar_envio(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.solicitar_resgate(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revisar_envio(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.solicitar_resgate(numeric) TO authenticated;