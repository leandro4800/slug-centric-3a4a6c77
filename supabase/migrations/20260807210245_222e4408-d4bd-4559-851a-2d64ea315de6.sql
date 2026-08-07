CREATE OR REPLACE FUNCTION public.get_my_app_destination()
RETURNS TABLE(tenant_id uuid, tenant_slug text, account_role public.app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH owned AS (
    SELECT
      t.id AS tenant_id,
      t.slug AS tenant_slug,
      'coach'::public.app_role AS account_role,
      1 AS priority
    FROM public.tenants t
    WHERE t.owner_user_id = auth.uid()
      AND t.slug IS NOT NULL
  ),
  profile_record AS (
    SELECT
      t.id AS tenant_id,
      t.slug AS tenant_slug,
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role = 'coach'::public.app_role
            AND (ur.tenant_id = p.tenant_id OR ur.tenant_id IS NULL)
        ) THEN 'coach'::public.app_role
        ELSE 'aluno'::public.app_role
      END AS account_role,
      2 AS priority
    FROM public.perfis p
    JOIN public.tenants t ON t.id = p.tenant_id
    WHERE p.id = auth.uid()
      AND p.tenant_id IS NOT NULL
      AND t.slug IS NOT NULL
  ),
  active_subscription AS (
    SELECT
      t.id AS tenant_id,
      t.slug AS tenant_slug,
      'aluno'::public.app_role AS account_role,
      3 AS priority
    FROM public.assinaturas s
    JOIN public.tenants t ON t.id = s.tenant_id
    LEFT JOIN public.perfis p ON p.id = s.aluno_id
    WHERE s.aluno_id = auth.uid()
      AND s.status IN ('active'::public.assinatura_status, 'trialing'::public.assinatura_status)
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
      AND t.slug IS NOT NULL
    ORDER BY (s.tenant_id = p.tenant_id) DESC, s.current_period_end DESC NULLS LAST
    LIMIT 1
  ),
  student_role AS (
    SELECT
      t.id AS tenant_id,
      t.slug AS tenant_slug,
      'aluno'::public.app_role AS account_role,
      4 AS priority
    FROM public.user_roles ur
    JOIN public.tenants t ON t.id = ur.tenant_id
    LEFT JOIN public.perfis p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'aluno'::public.app_role
      AND t.slug IS NOT NULL
    ORDER BY (ur.tenant_id = p.tenant_id) DESC, t.slug
    LIMIT 1
  ),
  legacy_student AS (
    SELECT
      t.id AS tenant_id,
      t.slug AS tenant_slug,
      'aluno'::public.app_role AS account_role,
      5 AS priority
    FROM public.alunos a
    JOIN public.tenants t ON t.id = a.tenant_id
    LEFT JOIN public.perfis p ON p.id = a.id
    WHERE a.id = auth.uid()
      AND t.slug IS NOT NULL
    ORDER BY (a.tenant_id = p.tenant_id) DESC, t.slug
    LIMIT 1
  ),
  candidates AS (
    SELECT * FROM owned
    UNION ALL
    SELECT * FROM profile_record
    UNION ALL
    SELECT * FROM active_subscription
    UNION ALL
    SELECT * FROM student_role
    UNION ALL
    SELECT * FROM legacy_student
  )
  SELECT c.tenant_id, c.tenant_slug, c.account_role
  FROM candidates c
  ORDER BY c.priority, c.tenant_slug
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_app_destination() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_app_destination() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_app_destination() TO service_role;