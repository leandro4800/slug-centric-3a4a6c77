-- Primeiro, garantir que o usuário alphacoachapp@gmail.com tenha a role 'admin' global (sem tenant_id)
INSERT INTO public.user_roles (user_id, role, tenant_id)
VALUES ('3c40d11c-1560-462f-8918-a924cfe8686c', 'admin', NULL)
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Atualizar a função has_role para ser mais robusta com super admins (tenant_id IS NULL)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role, _tenant_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      -- Se o usuário tem a role global (tenant_id IS NULL), ele tem acesso a tudo
      -- Se o tenant_id for fornecido, ele também tem acesso
      AND (tenant_id IS NULL OR tenant_id = _tenant_id)
  );
$$;

-- Garantir que o perfil do super admin não esteja vinculado a nenhum tenant específico para evitar conflitos de RLS baseados em current_user_tenant()
UPDATE public.perfis 
SET tenant_id = NULL 
WHERE id = '3c40d11c-1560-462f-8918-a924cfe8686c';