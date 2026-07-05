
CREATE OR REPLACE FUNCTION public.get_my_mcp_token()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
BEGIN
  SELECT tp.mcp_token INTO v_token
    FROM public.tenants_private tp
    JOIN public.tenants t ON t.id = tp.tenant_id
   WHERE t.owner_user_id = auth.uid()
   LIMIT 1;
  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_mcp_token() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_mcp_token() TO authenticated;

CREATE OR REPLACE FUNCTION public.rotate_my_mcp_token()
RETURNS text
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text := gen_random_uuid()::text;
  v_tenant uuid;
BEGIN
  SELECT id INTO v_tenant FROM public.tenants WHERE owner_user_id = auth.uid() LIMIT 1;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Nenhum tenant encontrado para o usuário.';
  END IF;
  INSERT INTO public.tenants_private (tenant_id, mcp_token)
    VALUES (v_tenant, v_token)
    ON CONFLICT (tenant_id) DO UPDATE SET mcp_token = EXCLUDED.mcp_token, updated_at = now();
  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.rotate_my_mcp_token() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rotate_my_mcp_token() TO authenticated;
