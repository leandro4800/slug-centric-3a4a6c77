CREATE OR REPLACE FUNCTION public.get_my_app_destination()
RETURNS TABLE (
  tenant_id uuid,
  tenant_slug text,
  account_role public.app_role
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH owned AS (
    SELECT t.id AS tenant_id, t.slug AS tenant_slug, 'coach'::public.app_role AS account_role, 1 AS priority
    FROM public.tenants t
    WHERE t.owner_user_id = auth.uid()
  ),
  student_role AS (
    SELECT t.id AS tenant_id, t.slug AS tenant_slug, 'aluno'::public.app_role AS account_role, 2 AS priority
    FROM public.user_roles ur
    JOIN public.tenants t ON t.id = ur.tenant_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'aluno'::public.app_role
  ),
  student_record AS (
    SELECT t.id AS tenant_id, t.slug AS tenant_slug, 'aluno'::public.app_role AS account_role, 3 AS priority
    FROM public.alunos a
    JOIN public.tenants t ON t.id = a.tenant_id
    WHERE a.id = auth.uid()
  ),
  profile_record AS (
    SELECT t.id AS tenant_id, t.slug AS tenant_slug,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid() AND ur.role = 'coach'::public.app_role
        ) THEN 'coach'::public.app_role
        ELSE 'aluno'::public.app_role
      END AS account_role,
      4 AS priority
    FROM public.perfis p
    JOIN public.tenants t ON t.id = p.tenant_id
    WHERE p.id = auth.uid()
  ),
  candidates AS (
    SELECT * FROM owned
    UNION ALL SELECT * FROM student_role
    UNION ALL SELECT * FROM student_record
    UNION ALL SELECT * FROM profile_record
  )
  SELECT c.tenant_id, c.tenant_slug, c.account_role
  FROM candidates c
  WHERE c.tenant_slug IS NOT NULL
  ORDER BY c.priority
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_app_destination() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_app_destination() TO authenticated, service_role;

COMMENT ON FUNCTION public.get_my_app_destination() IS
  'Returns the authoritative tenant destination for the currently authenticated coach or student, independent of the URL tenant context.';