-- Create the bucket for community uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('comunidade_uploads', 'comunidade_uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for the bucket
-- Allow anyone to see the files
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'comunidade_uploads');

-- Allow authenticated users to upload their own files
CREATE POLICY "Authenticated users can upload" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'comunidade_uploads' AND 
  auth.role() = 'authenticated'
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own uploads" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'comunidade_uploads' AND 
  (auth.uid())::text = (storage.foldername(name))[1]
);
