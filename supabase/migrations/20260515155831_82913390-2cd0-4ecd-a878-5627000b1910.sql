
-- Posts: permitir delete para autor, dono do tenant, coach do tenant ou admin
DROP POLICY IF EXISTS "Deletar proprio post" ON public.comunidade_posts;
CREATE POLICY "Deletar post (autor ou owner/coach/admin)"
ON public.comunidade_posts
FOR DELETE
TO authenticated
USING (
  auth.uid() = usuario_id
  OR EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = comunidade_posts.profissional_id
      AND t.owner_user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'coach'::app_role, profissional_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Comentários: mesma regra
DROP POLICY IF EXISTS "Deletar proprio comentario" ON public.comunidade_comentarios;
CREATE POLICY "Deletar comentario (autor ou owner/coach/admin)"
ON public.comunidade_comentarios
FOR DELETE
TO authenticated
USING (
  auth.uid() = usuario_id
  OR EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = comunidade_comentarios.profissional_id
      AND t.owner_user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'coach'::app_role, profissional_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);
