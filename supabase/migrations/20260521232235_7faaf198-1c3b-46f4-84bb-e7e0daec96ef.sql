-- Store service role key in Vault (only if not already there)
-- Note: User will need to set the value via Vault UI or insert the secret manually 
-- with the actual service role key. We create a placeholder here.

DO $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'project_service_role_key') INTO v_exists;
  IF NOT v_exists THEN
    -- Placeholder; user must update this value in the Vault UI.
    PERFORM vault.create_secret('PLACEHOLDER_REPLACE_VIA_VAULT_UI', 'project_service_role_key', 'Supabase Service Role Key for internal Edge Function calls');
  END IF;
END $$;

-- Update the function to read the key from Vault
CREATE OR REPLACE FUNCTION public.send_push_notification(
    p_user_id UUID,
    p_title TEXT,
    p_body TEXT,
    p_data JSONB DEFAULT '{}'::jsonb
) RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
    v_push_token TEXT;
    v_service_key TEXT;
BEGIN
    -- Get the user's push token
    SELECT push_token INTO v_push_token
    FROM public.perfis
    WHERE id = p_user_id;

    IF v_push_token IS NULL THEN
      RETURN;
    END IF;

    -- Read service role key from Vault
    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'project_service_role_key'
    LIMIT 1;

    IF v_service_key IS NULL THEN
      RAISE WARNING 'project_service_role_key not configured in Vault';
      RETURN;
    END IF;
        
    PERFORM net.http_post(
        url := 'https://iflgryuemsohurtdaawm.supabase.co/functions/v1/fcm-notifications',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_key
        ),
        body := jsonb_build_object(
            'user_id', p_user_id,
            'title', p_title,
            'body', p_body,
            'data', p_data
        )
    );
END;
$$;

-- Restrict function execution
REVOKE EXECUTE ON FUNCTION public.send_push_notification(UUID, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_push_notification(UUID, TEXT, TEXT, JSONB) TO postgres, service_role;

-- Restrict check_and_send_reminders too (only cron should call it)
REVOKE EXECUTE ON FUNCTION public.check_and_send_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_send_reminders() TO postgres, service_role;

-- Enable RLS on notification_logs table
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification logs"
ON public.notification_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
