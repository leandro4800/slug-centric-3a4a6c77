-- Add foreign keys to comunidade_posts
ALTER TABLE public.comunidade_posts
ADD CONSTRAINT fk_comunidade_posts_usuario
FOREIGN KEY (usuario_id) REFERENCES public.perfis(id)
ON DELETE CASCADE;

ALTER TABLE public.comunidade_posts
ADD CONSTRAINT fk_comunidade_posts_tenant
FOREIGN KEY (profissional_id) REFERENCES public.tenants(id)
ON DELETE CASCADE;

-- Update RLS for comunidade_posts as requested
DROP POLICY IF EXISTS "Criar posts" ON public.comunidade_posts;
CREATE POLICY "Criar posts" ON public.comunidade_posts
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Ver posts do time" ON public.comunidade_posts;
CREATE POLICY "Ver posts do time" ON public.comunidade_posts
FOR SELECT 
TO public
USING (true);
