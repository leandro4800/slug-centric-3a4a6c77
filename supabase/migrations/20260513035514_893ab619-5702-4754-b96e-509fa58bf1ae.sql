
DROP POLICY IF EXISTS "Ver curtidas" ON public.comunidade_curtidas;
CREATE POLICY "Ver curtidas auth"
ON public.comunidade_curtidas
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Ver comentarios" ON public.comunidade_comentarios;
CREATE POLICY "Ver comentarios auth"
ON public.comunidade_comentarios
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Deletar proprio comentario" ON public.comunidade_comentarios;
CREATE POLICY "Deletar proprio comentario"
ON public.comunidade_comentarios
FOR DELETE
TO authenticated
USING (auth.uid() = usuario_id);
