-- Create storage bucket for identity documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('identidades', 'identidades', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for identity documents
CREATE POLICY "Users can upload their own identity documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'identidades' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own identity documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'identidades' AND auth.uid()::text = (storage.foldername(name))[1]);