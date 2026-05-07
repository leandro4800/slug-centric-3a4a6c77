-- Limpar perfil órfão de badboyvoltou (auth.users já foi deletado)
DELETE FROM public.perfis WHERE id = 'f0b6bf76-a935-44b0-b3a8-3d6294175b3b';

-- Atualizar email_is_registered para só considerar perfis com auth.users existente
CREATE OR REPLACE FUNCTION public.email_is_registered(_email text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfis p
    JOIN auth.users u ON u.id = p.id
    WHERE lower(p.email) = lower(trim(_email))
  );
$function$;