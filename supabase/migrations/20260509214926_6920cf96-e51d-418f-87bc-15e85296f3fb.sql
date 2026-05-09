-- Add avatar_pos_y to perfis table
ALTER TABLE public.perfis 
ADD COLUMN IF NOT EXISTS avatar_pos_y INTEGER DEFAULT 20;

-- Optional: update documentation/comment
COMMENT ON COLUMN public.perfis.avatar_pos_y IS 'Vertical position percentage for avatar image (0-100)';