-- 1. Remove duplicates from assinaturas
DELETE FROM public.assinaturas
WHERE id NOT IN (
    SELECT DISTINCT ON (aluno_id, tenant_id) id
    FROM public.assinaturas
    ORDER BY aluno_id, tenant_id, created_at ASC
);

-- 2. Add unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_aluno_tenant_subscription'
    ) THEN
        ALTER TABLE public.assinaturas ADD CONSTRAINT unique_aluno_tenant_subscription UNIQUE (aluno_id, tenant_id);
    END IF;
END $$;

-- 3. Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
DECLARE
    v_plan_id UUID;
    v_tenant_id UUID := '6c4ff89c-3d9f-4225-ae95-5bf1dbf35886'; -- Alpha Coach (alphateam)
BEGIN
    SELECT id INTO v_plan_id FROM public.planos 
    WHERE tenant_id = v_tenant_id AND nome ILIKE '%Alpha Elite%'
    LIMIT 1;

    IF NEW.tenant_id = v_tenant_id AND v_plan_id IS NOT NULL THEN
        INSERT INTO public.assinaturas (aluno_id, tenant_id, plano_id, status)
        VALUES (NEW.id, v_tenant_id, v_plan_id, 'active')
        ON CONFLICT (aluno_id, tenant_id) DO UPDATE SET status = 'active';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-create Trigger
DROP TRIGGER IF EXISTS trg_auto_subscribe_alpha ON public.perfis;
CREATE TRIGGER trg_auto_subscribe_alpha
AFTER INSERT OR UPDATE OF tenant_id ON public.perfis
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- 5. Fix Existing
DO $$
DECLARE
    v_plan_id UUID;
    v_tenant_id UUID := '6c4ff89c-3d9f-4225-ae95-5bf1dbf35886';
BEGIN
    SELECT id INTO v_plan_id FROM public.planos 
    WHERE tenant_id = v_tenant_id AND nome ILIKE '%Alpha Elite%'
    LIMIT 1;

    IF v_plan_id IS NOT NULL THEN
        INSERT INTO public.assinaturas (aluno_id, tenant_id, plano_id, status)
        SELECT id, v_tenant_id, v_plan_id, 'active'
        FROM public.perfis
        WHERE tenant_id = v_tenant_id
        ON CONFLICT (aluno_id, tenant_id) DO UPDATE SET status = 'active';
    END IF;
END $$;

-- 6. Anamnese Table Fixes
ALTER TABLE public.anamnese_aluno ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anamnese_manage_self" ON public.anamnese_aluno;
CREATE POLICY "anamnese_manage_self" ON public.anamnese_aluno
FOR ALL
USING (aluno_id = auth.uid() OR EXISTS (SELECT 1 FROM tenants t WHERE t.id = anamnese_aluno.tenant_id AND t.owner_user_id = auth.uid()))
WITH CHECK (aluno_id = auth.uid() OR EXISTS (SELECT 1 FROM tenants t WHERE t.id = anamnese_aluno.tenant_id AND t.owner_user_id = auth.uid()));

-- Columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anamnese_aluno' AND column_name = 'alimentos_ama') THEN
        ALTER TABLE public.anamnese_aluno ADD COLUMN alimentos_ama TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anamnese_aluno' AND column_name = 'alimentos_evita') THEN
        ALTER TABLE public.anamnese_aluno ADD COLUMN alimentos_evita TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anamnese_aluno' AND column_name = 'cirurgias') THEN
        ALTER TABLE public.anamnese_aluno ADD COLUMN cirurgias TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anamnese_aluno' AND column_name = 'historico_familiar') THEN
        ALTER TABLE public.anamnese_aluno ADD COLUMN historico_familiar TEXT;
    END IF;
END $$;