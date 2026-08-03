-- peso_diario
DROP POLICY IF EXISTS "peso_diario aluno" ON public.peso_diario;
CREATE POLICY "peso_diario aluno" ON public.peso_diario
FOR ALL TO authenticated
USING (aluno_id = auth.uid())
WITH CHECK (
  aluno_id = auth.uid()
  AND tenant_id IS NOT NULL
  AND public.user_belongs_to_tenant(auth.uid(), tenant_id)
);

-- prs
DROP POLICY IF EXISTS "prs aluno own" ON public.prs;
CREATE POLICY "prs aluno own" ON public.prs
FOR ALL TO authenticated
USING (aluno_id = auth.uid())
WITH CHECK (
  aluno_id = auth.uid()
  AND tenant_id IS NOT NULL
  AND public.user_belongs_to_tenant(auth.uid(), tenant_id)
);

-- sessoes_treino
DROP POLICY IF EXISTS "Aluno gerencia suas sessoes" ON public.sessoes_treino;
CREATE POLICY "Aluno gerencia suas sessoes" ON public.sessoes_treino
FOR ALL TO authenticated
USING (aluno_id = auth.uid())
WITH CHECK (
  aluno_id = auth.uid()
  AND tenant_id IS NOT NULL
  AND public.user_belongs_to_tenant(auth.uid(), tenant_id)
);

-- wod_resultados
DROP POLICY IF EXISTS "wod_resultados aluno own" ON public.wod_resultados;
CREATE POLICY "wod_resultados aluno own" ON public.wod_resultados
FOR ALL TO authenticated
USING (aluno_id = auth.uid())
WITH CHECK (
  aluno_id = auth.uid()
  AND tenant_id IS NOT NULL
  AND public.user_belongs_to_tenant(auth.uid(), tenant_id)
  AND EXISTS (
    SELECT 1 FROM public.wods w
    WHERE w.id = wod_resultados.wod_id
      AND w.tenant_id = wod_resultados.tenant_id
  )
);