-- Criar função auxiliar para obter o tenant_id do usuário sem recursão
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.perfis WHERE id = _user_id;
$$;

-- Corrigir a política de seleção de perfis para evitar recursão infinita
DROP POLICY IF EXISTS "perfis_select_all_in_tenant" ON public.perfis;

CREATE POLICY "perfis_select_all_in_tenant" 
ON public.perfis 
FOR SELECT 
USING (
  auth.uid() = id 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id(auth.uid()))
);

-- Garantir que as políticas de anamnese e avaliações estejam corretas e não dependam de subconsultas recursivas
-- Estas já parecem OK, mas vamos simplificar se necessário.
-- No momento, vamos focar no perfil que é a raiz do problema.
