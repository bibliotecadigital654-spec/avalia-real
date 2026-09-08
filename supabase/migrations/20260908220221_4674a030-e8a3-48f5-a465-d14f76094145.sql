CREATE POLICY "Enviar as proprias fotos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'envios' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Ver as proprias fotos ou admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'envios' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));