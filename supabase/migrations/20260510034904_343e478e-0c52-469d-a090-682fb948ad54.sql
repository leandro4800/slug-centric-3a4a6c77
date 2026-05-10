-- Update user_belongs_to_tenant to check both perfis and user_roles
CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.perfis p
    WHERE p.id = _user_id
      AND p.tenant_id = _tenant_id
  ) OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.tenant_id = _tenant_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update current_user_tenant to be more robust
CREATE OR REPLACE FUNCTION public.current_user_tenant()
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- 1. Try to get tenant from user_roles (priority for coach role)
  SELECT tenant_id INTO v_tenant_id
  FROM public.user_roles
  WHERE user_id = auth.uid()
    AND role = 'coach'::app_role
    AND tenant_id IS NOT NULL
  LIMIT 1;

  IF v_tenant_id IS NOT NULL THEN
    RETURN v_tenant_id;
  END IF;

  -- 2. Fallback to perfis table
  SELECT tenant_id INTO v_tenant_id
  FROM public.perfis
  WHERE id = auth.uid();

  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
