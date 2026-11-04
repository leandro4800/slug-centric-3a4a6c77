REVOKE EXECUTE ON FUNCTION public.enforce_tenant_vertical_lock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_box_staff(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_box_turma_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_box_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_box_turma_member(uuid) TO authenticated;