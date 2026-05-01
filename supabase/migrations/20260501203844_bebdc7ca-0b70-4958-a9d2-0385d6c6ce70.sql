-- 1. Correct the policy to be more robust
DROP POLICY IF EXISTS "anamnese_manage_self" ON public.anamnese_aluno;

CREATE POLICY "anamnese_manage_self" ON public.anamnese_aluno
FOR ALL
USING (
    aluno_id = auth.uid() 
    OR 
    EXISTS (
        SELECT 1 FROM tenants t 
        WHERE (t.id = anamnese_aluno.tenant_id OR t.id = (SELECT tenant_id FROM perfis WHERE id = anamnese_aluno.aluno_id))
        AND t.owner_user_id = auth.uid()
    )
)
WITH CHECK (
    aluno_id = auth.uid()
);

-- 2. Update existing anamnese records with missing tenant_id from the profile
UPDATE public.anamnese_aluno a
SET tenant_id = p.tenant_id
FROM public.perfis p
WHERE a.aluno_id = p.id
AND a.tenant_id IS NULL
AND p.tenant_id IS NOT NULL;

-- 3. Ensure RLS is enabled
ALTER TABLE public.anamnese_aluno ENABLE ROW LEVEL SECURITY;