CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id uuid;
  v_plan_id uuid := '11111111-1111-1111-1111-111111111111';
BEGIN
  -- Extrair tenant_id da metadata se existir
  v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;

  -- Criar perfil
  INSERT INTO public.perfis (id, email, nome_completo, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email),
    v_tenant_id
  )
  ON CONFLICT (id) DO UPDATE 
  SET tenant_id = EXCLUDED.tenant_id,
      nome_completo = EXCLUDED.nome_completo;

  -- Se for do coach Alpha Coach (Alphateam), assina o plano automaticamente
  IF v_tenant_id = '6c4ff89c-3d9f-4225-ae95-5bf1dbf35886' THEN
    INSERT INTO public.assinaturas (aluno_id, tenant_id, plano_id, status)
    VALUES (NEW.id, v_tenant_id, v_plan_id, 'active')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;