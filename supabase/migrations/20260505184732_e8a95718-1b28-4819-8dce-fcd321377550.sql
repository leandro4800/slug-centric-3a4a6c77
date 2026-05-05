-- Adiciona coluna para vídeo de fundo na tela de login
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS login_video_url TEXT;

-- Atualiza a logo do tenant específico
UPDATE public.tenants 
SET logo_url = 'https://rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/message-attachments/a73ad678-986d-44b2-9487-bc73eb5d5a24/1778006713349_1vgmgt_WhatsApp_Image_2026-05-05_at_14.06.35.jpeg'
WHERE slug = 'nutrisamiladias';