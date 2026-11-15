CREATE OR REPLACE FUNCTION public.disparar_resumo_assistente()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'vault'
AS $$
DECLARE
  v_service_key text;
BEGIN
  SELECT decrypted_secret INTO v_service_key FROM vault.decrypted_secrets
   WHERE name = 'project_service_role_key' LIMIT 1;
  IF v_service_key IS NULL THEN
    RAISE WARNING 'project_service_role_key not configured in Vault';
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := 'https://iflgryuemsohurtdaawm.supabase.co/functions/v1/assistente-resumo',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_service_key),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
END $$;
REVOKE ALL ON FUNCTION public.disparar_resumo_assistente() FROM PUBLIC, anon, authenticated;