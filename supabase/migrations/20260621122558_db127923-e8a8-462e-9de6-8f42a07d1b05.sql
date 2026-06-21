CREATE POLICY "Alunos do tenant podem ver parceiros ativos"
ON public.parceiros
FOR SELECT
TO authenticated
USING (
  ativo = true
  AND public.user_belongs_to_tenant(auth.uid(), tenant_id)
);