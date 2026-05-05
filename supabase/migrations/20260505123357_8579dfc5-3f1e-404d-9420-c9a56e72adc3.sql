-- Remove a política permissiva anterior
DROP POLICY IF EXISTS "Permitir tudo para admins" ON public.referencia_exercicios;

-- Cria política restrita para modificação
CREATE POLICY "Permitir modificação para admins e coaches" 
ON public.referencia_exercicios FOR ALL 
TO authenticated 
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'coach')
) 
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'coach')
);