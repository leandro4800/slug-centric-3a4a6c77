-- Criar o bucket evolucao-fotos se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('evolucao-fotos', 'evolucao-fotos', false)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir que usuários façam upload de suas próprias fotos
CREATE POLICY "Users can upload their own evolution photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'evolucao-fotos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para permitir que usuários vejam suas próprias fotos
CREATE POLICY "Users can view their own evolution photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'evolucao-fotos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para permitir que usuários excluam suas próprias fotos
CREATE POLICY "Users can delete their own evolution photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'evolucao-fotos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
