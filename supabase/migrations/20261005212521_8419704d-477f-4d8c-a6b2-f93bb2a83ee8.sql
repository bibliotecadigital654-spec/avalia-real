GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
CREATE POLICY "Admin cria tarefas" ON public.tasks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin edita tarefas" ON public.tasks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin remove tarefas" ON public.tasks FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));