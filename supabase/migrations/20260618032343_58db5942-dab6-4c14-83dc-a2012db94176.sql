
CREATE OR REPLACE FUNCTION public.get_community_members(_tenant_id uuid)
RETURNS TABLE (id uuid, nome_completo text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.nome_completo, p.avatar_url
  FROM public.perfis p
  WHERE p.tenant_id = _tenant_id
    AND (
      EXISTS (SELECT 1 FROM public.perfis me WHERE me.id = auth.uid() AND me.tenant_id = _tenant_id)
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'coach'::app_role, _tenant_id)
      OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = _tenant_id AND t.owner_user_id = auth.uid())
    )
  ORDER BY p.nome_completo NULLS LAST
  LIMIT 200;
$$;

GRANT EXECUTE ON FUNCTION public.get_community_members(uuid) TO authenticated;
