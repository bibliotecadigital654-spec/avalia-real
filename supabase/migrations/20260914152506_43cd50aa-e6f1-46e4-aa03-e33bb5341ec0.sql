CREATE POLICY "Servidor gerencia recompensas externas"
ON public.external_rewards
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);