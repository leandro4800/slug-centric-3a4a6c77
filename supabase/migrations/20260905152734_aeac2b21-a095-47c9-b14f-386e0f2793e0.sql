CREATE POLICY "bc_select_dono" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'base-conhecimento' AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.owner_user_id = auth.uid() AND t.id::text = (storage.foldername(name))[1])
  )
);

CREATE POLICY "bc_insert_dono" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'base-conhecimento' AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.owner_user_id = auth.uid() AND t.id::text = (storage.foldername(name))[1])
  )
);

CREATE POLICY "bc_delete_dono" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'base-conhecimento' AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.owner_user_id = auth.uid() AND t.id::text = (storage.foldername(name))[1])
  )
);