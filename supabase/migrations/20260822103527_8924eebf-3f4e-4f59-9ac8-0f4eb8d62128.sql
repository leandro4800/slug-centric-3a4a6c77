WITH ranked_admin_roles AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, role
           ORDER BY created_at ASC NULLS LAST, id ASC
         ) AS duplicate_position
  FROM public.user_roles
  WHERE tenant_id IS NULL
)
DELETE FROM public.user_roles target
USING ranked_admin_roles ranked
WHERE target.id = ranked.id
  AND ranked.duplicate_position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS user_roles_global_role_unique_idx
ON public.user_roles (user_id, role)
WHERE tenant_id IS NULL;