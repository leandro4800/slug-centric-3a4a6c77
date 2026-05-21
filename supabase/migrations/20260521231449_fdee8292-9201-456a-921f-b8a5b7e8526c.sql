-- Enable pg_net extension
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Table to track sent notifications
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    type TEXT NOT NULL, -- 'dieta', 'treino', 'hidratacao'
    reference_id UUID, -- ID of the meal or workout
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_type_ref ON public.notification_logs(user_id, type, reference_id, sent_at);

-- Function to send push notification via Edge Function
CREATE OR REPLACE FUNCTION public.send_push_notification(
    p_user_id UUID,
    p_title TEXT,
    p_body TEXT,
    p_data JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
DECLARE
    v_push_token TEXT;
    v_supabase_url TEXT;
    v_service_role_key TEXT;
BEGIN
    -- Get the user's push token
    SELECT push_token INTO v_push_token
    FROM public.perfis
    WHERE id = p_user_id;

    IF v_push_token IS NOT NULL THEN
        -- We get the Supabase URL and Service Role Key from environment variables in the Edge Function,
        -- but for pg_net we need to pass them or the function must be public.
        -- For security, the Edge Function should check for a shared secret or use the service role key.
        
        -- In a real Supabase environment, we can use the project's internal URL or the public one.
        -- Here we assume the Edge Function is deployed at /functions/v1/fcm-notifications
        
        PERFORM net.http_post(
            url := 'https://iflgryuemsohurtdaawm.supabase.co/functions/v1/fcm-notifications',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
            ),
            body := jsonb_build_object(
                'user_id', p_user_id,
                'title', p_title,
                'body', p_body,
                'data', p_data
            )
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Main function to check and send reminders
CREATE OR REPLACE FUNCTION public.check_and_send_reminders() 
RETURNS VOID AS $$
DECLARE
    r_meal RECORD;
    r_workout RECORD;
    r_user RECORD;
    v_now_time TIME := (now() AT TIME ZONE 'America/Sao_Paulo')::TIME;
    v_now_date DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::DATE;
    v_day_of_week TEXT := lower(to_char(v_now_date, 'Day'));
BEGIN
    -- 1. Diet Reminders (30 mins before meal)
    FOR r_meal IN 
        SELECT r.id, r.nome, r.horario, d.aluno_id
        FROM public.refeicoes r
        JOIN public.dietas d ON r.dieta_id = d.id
        WHERE d.status = 'active'
        AND r.horario BETWEEN v_now_time AND (v_now_time + interval '35 minutes')
        AND NOT EXISTS (
            SELECT 1 FROM public.notification_logs 
            WHERE user_id = d.aluno_id 
            AND type = 'dieta' 
            AND reference_id = r.id 
            AND sent_at::date = v_now_date
        )
    LOOP
        PERFORM public.send_push_notification(
            r_meal.aluno_id,
            'Hora da Refeição! 🍎',
            'Sua refeição "' || r_meal.nome || '" está programada para às ' || to_char(r_meal.horario, 'HH24:MI') || '.'
        );
        
        INSERT INTO public.notification_logs (user_id, type, reference_id)
        VALUES (r_meal.aluno_id, 'dieta', r_meal.id);
    END LOOP;

    -- 2. Workout Reminders (Morning reminder if workout exists today)
    IF v_now_time BETWEEN '07:00:00'::TIME AND '07:10:00'::TIME THEN
        FOR r_workout IN
            SELECT DISTINCT aluno_id
            FROM public.treinos_prescritos
            WHERE lower(dia_semana) = trim(v_day_of_week)
            AND NOT EXISTS (
                SELECT 1 FROM public.notification_logs
                WHERE user_id = aluno_id
                AND type = 'treino'
                AND sent_at::date = v_now_date
            )
        LOOP
            PERFORM public.send_push_notification(
                r_workout.aluno_id,
                'Dia de Treino! 💪',
                'Você tem um treino prescrito para hoje. Vamos nessa?'
            );
            
            INSERT INTO public.notification_logs (user_id, type)
            VALUES (r_workout.aluno_id, 'treino');
        END LOOP;
    END IF;

    -- 3. Hydration Reminders (Every 3 hours between 08:00 and 20:00)
    IF v_now_time IN ('09:00:00'::TIME, '12:00:00'::TIME, '15:00:00'::TIME, '18:00:00'::TIME, '21:00:00'::TIME) THEN
        FOR r_user IN
            SELECT id FROM public.perfis 
            WHERE push_token IS NOT NULL
            AND onboarding_completo = true
        LOOP
            PERFORM public.send_push_notification(
                r_user.id,
                'Hora de se Hidratar! 💧',
                'Não esqueça de beber água para manter o foco e a saúde.'
            );
            
            INSERT INTO public.notification_logs (user_id, type)
            VALUES (r_user.id, 'hidratacao');
        END LOOP;
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the job with pg_cron
-- Note: '0 * * * *' would be every hour. '* * * * *' is every minute.
SELECT cron.schedule('process-reminders', '* * * * *', 'SELECT public.check_and_send_reminders()');
