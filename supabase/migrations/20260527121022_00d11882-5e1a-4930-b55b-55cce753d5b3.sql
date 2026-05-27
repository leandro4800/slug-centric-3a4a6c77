-- Allow coaches to upload to vlog_videos bucket
CREATE POLICY "vlog_videos coach insert" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'vlog_videos' AND 
  (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'coach' 
    AND tenant_id = (storage.foldername(objects.name))[1]::uuid
  ))
);

CREATE POLICY "vlog_videos coach update" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'vlog_videos' AND 
  (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'coach' 
    AND tenant_id = (storage.foldername(objects.name))[1]::uuid
  ))
);

CREATE POLICY "vlog_videos coach delete" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'vlog_videos' AND 
  (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'coach' 
    AND tenant_id = (storage.foldername(objects.name))[1]::uuid
  ))
);