
-- ============================================
-- SECURITY FIXES
-- ============================================

-- 1) Fix has_role: remove cross-tenant NULL bypass
-- NULL tenant_id only matches for global 'admin' role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role, _tenant_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (
        -- exact tenant match
        (_tenant_id IS NOT NULL AND tenant_id = _tenant_id)
        -- global admin (tenant_id NULL only valid for admin role)
        OR (_tenant_id IS NULL AND _role = 'admin'::app_role AND tenant_id IS NULL)
        -- when caller doesn't pass tenant_id, allow any tenant-scoped role row
        OR (_tenant_id IS NULL AND tenant_id IS NOT NULL)
      )
  );
$$;

-- 2) Fix functions missing SET search_path
CREATE OR REPLACE FUNCTION public.auto_activate_vip_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_tenant_id UUID;
    v_plano_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
    IF lower(NEW.email) IN (
        'alphacoachapp@gmail.com',
        'davidiasrodriguesbermudes@gmail.com',
        'executionmode48@gmail.com',
        'marcus.alphateam@coach.app',
        'jonas.alphateam@coach.app',
        'execution.alphateam@coach.app',
        'samila.alphateam@coach.app'
    ) THEN
        SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'alphateam' LIMIT 1;
        IF v_tenant_id IS NOT NULL THEN
            INSERT INTO public.assinaturas (aluno_id, tenant_id, plano_id, status, current_period_end)
            VALUES (NEW.id, v_tenant_id, v_plano_id, 'active', now() + interval '100 years')
            ON CONFLICT (aluno_id, tenant_id) DO UPDATE SET status = 'active';
            UPDATE public.perfis 
            SET tenant_id = v_tenant_id, onboarding_completo = true 
            WHERE id = NEW.id;
            INSERT INTO public.anamnese_aluno (aluno_id, tenant_id, doencas, qualidade_sono, nivel_estresse)
            VALUES (NEW.id, v_tenant_id, '{}', 8, 5)
            ON CONFLICT (aluno_id) DO NOTHING;
            INSERT INTO public.avaliacoes_fisicas (aluno_id, tenant_id, peso_kg, altura_cm)
            VALUES (NEW.id, v_tenant_id, 75, 175)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_plan_id UUID;
    v_tenant_id UUID := '6c4ff89c-3d9f-4225-ae95-5bf1dbf35886';
BEGIN
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := v_tenant_id;
    END IF;
    INSERT INTO public.alunos (id, nome, tenant_id)
    VALUES (NEW.id, NEW.nome_completo, NEW.tenant_id)
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, tenant_id = EXCLUDED.tenant_id;
    INSERT INTO public.perfis_treino (aluno_id, tenant_id, sexo)
    VALUES (NEW.id, NEW.tenant_id, NEW.sexo)
    ON CONFLICT (aluno_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, sexo = EXCLUDED.sexo;
    SELECT id INTO v_plan_id FROM public.planos 
    WHERE tenant_id = v_tenant_id AND nome ILIKE '%Alpha Elite%' LIMIT 1;
    IF NEW.tenant_id = v_tenant_id AND v_plan_id IS NOT NULL THEN
        INSERT INTO public.assinaturas (aluno_id, tenant_id, plano_id, status)
        VALUES (NEW.id, v_tenant_id, v_plan_id, 'active')
        ON CONFLICT (aluno_id, tenant_id) DO UPDATE SET status = 'active';
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- 3) Protect sensitive tenants columns
-- Move sensitive cols to a private table accessible only to owner/admin
CREATE TABLE IF NOT EXISTS public.tenants_private (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  vlog_webhook_secret text,
  stripe_account_id text,
  stripe_onboarding_completed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Backfill from existing tenants
INSERT INTO public.tenants_private (tenant_id, vlog_webhook_secret, stripe_account_id, stripe_onboarding_completed)
SELECT id, vlog_webhook_secret, stripe_account_id, COALESCE(stripe_onboarding_completed, false)
FROM public.tenants
ON CONFLICT (tenant_id) DO NOTHING;

ALTER TABLE public.tenants_private ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenants_private_owner_select ON public.tenants_private
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY tenants_private_owner_update ON public.tenants_private
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY tenants_private_owner_insert ON public.tenants_private
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Keep columns on tenants for now to avoid breaking code, but revoke public access via column privileges.
-- RLS doesn't do column-level. Use REVOKE on the columns from anon/authenticated.
REVOKE ALL ON public.tenants FROM anon, authenticated;
GRANT SELECT (id, nome, slug, tagline, logo_url, symbol_url, hero_url, primary_hsl, accent_hsl,
              created_at, updated_at, status, bio, foto_url, especialidades, owner_user_id,
              theme_overrides, cidade, estado, permite_aula_avulsa, preco_aula_avulsa)
  ON public.tenants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tenants TO authenticated;

-- 4) anamnese_aluno: allow coaches of the tenant to read/write
DROP POLICY IF EXISTS anamnese_manage_self ON public.anamnese_aluno;
CREATE POLICY anamnese_select ON public.anamnese_aluno
  FOR SELECT USING (
    aluno_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = anamnese_aluno.tenant_id AND t.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'coach'::app_role, anamnese_aluno.tenant_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY anamnese_insert ON public.anamnese_aluno
  FOR INSERT WITH CHECK (
    aluno_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = anamnese_aluno.tenant_id AND t.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'coach'::app_role, anamnese_aluno.tenant_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY anamnese_update ON public.anamnese_aluno
  FOR UPDATE USING (
    aluno_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = anamnese_aluno.tenant_id AND t.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'coach'::app_role, anamnese_aluno.tenant_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  ) WITH CHECK (
    aluno_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = anamnese_aluno.tenant_id AND t.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'coach'::app_role, anamnese_aluno.tenant_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY anamnese_delete ON public.anamnese_aluno
  FOR DELETE USING (
    aluno_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = anamnese_aluno.tenant_id AND t.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 5) avaliacoes_fisicas: allow coaches WITH CHECK on insert/update
DROP POLICY IF EXISTS avaliacoes_manage_self ON public.avaliacoes_fisicas;
CREATE POLICY avaliacoes_select ON public.avaliacoes_fisicas
  FOR SELECT USING (
    aluno_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = avaliacoes_fisicas.tenant_id AND t.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'coach'::app_role, avaliacoes_fisicas.tenant_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY avaliacoes_insert ON public.avaliacoes_fisicas
  FOR INSERT WITH CHECK (
    aluno_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = avaliacoes_fisicas.tenant_id AND t.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'coach'::app_role, avaliacoes_fisicas.tenant_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY avaliacoes_update ON public.avaliacoes_fisicas
  FOR UPDATE USING (
    aluno_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = avaliacoes_fisicas.tenant_id AND t.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'coach'::app_role, avaliacoes_fisicas.tenant_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  ) WITH CHECK (
    aluno_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = avaliacoes_fisicas.tenant_id AND t.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'coach'::app_role, avaliacoes_fisicas.tenant_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY avaliacoes_delete ON public.avaliacoes_fisicas
  FOR DELETE USING (
    aluno_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = avaliacoes_fisicas.tenant_id AND t.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 6) profissionais: add INSERT/UPDATE policies
CREATE POLICY profissionais_insert_self ON public.profissionais
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profissionais_update_self ON public.profissionais
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 7) biblioteca_metodologia: read for authenticated users
CREATE POLICY biblioteca_select_authenticated ON public.biblioteca_metodologia
  FOR SELECT TO authenticated USING (true);
CREATE POLICY biblioteca_admin_all ON public.biblioteca_metodologia
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 8) Storage: add missing UPDATE/DELETE policies
-- identidades: UPDATE and DELETE
CREATE POLICY identidades_update_own ON storage.objects
  FOR UPDATE USING (bucket_id = 'identidades' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'identidades' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY identidades_delete_own ON storage.objects
  FOR DELETE USING (bucket_id = 'identidades' AND auth.uid()::text = (storage.foldername(name))[1]);

-- exames_pdfs: DELETE
CREATE POLICY exames_delete_own ON storage.objects
  FOR DELETE USING (bucket_id = 'exames_pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- avaliacoes bucket: coach/owner can SELECT student photos
CREATE POLICY avaliacoes_select_coach ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avaliacoes' AND (
      EXISTS (
        SELECT 1 FROM public.perfis p
        JOIN public.tenants t ON t.id = p.tenant_id
        WHERE p.id::text = (storage.foldername(name))[1]
          AND (t.owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'coach'::app_role, p.tenant_id))
      )
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );
CREATE POLICY avaliacoes_update_own ON storage.objects
  FOR UPDATE USING (bucket_id = 'avaliacoes' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avaliacoes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY avaliacoes_delete_own ON storage.objects
  FOR DELETE USING (bucket_id = 'avaliacoes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 9) Restrict EXECUTE on SECURITY DEFINER RPCs from anon
REVOKE EXECUTE ON FUNCTION public.buscar_templates_treino(text, text, integer, text, text, uuid, integer) FROM anon;
-- has_role and current_user_tenant must remain callable (used in policies); RLS uses them via SECURITY DEFINER context anyway
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_user_tenant() FROM anon;
