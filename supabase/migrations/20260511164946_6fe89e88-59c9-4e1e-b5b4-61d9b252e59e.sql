DROP POLICY IF EXISTS "Ver posts do time" ON public.comunidade_posts;

CREATE POLICY "Ver todos os posts da comunidade"
ON public.comunidade_posts
FOR SELECT
USING (auth.uid() IS NOT NULL);