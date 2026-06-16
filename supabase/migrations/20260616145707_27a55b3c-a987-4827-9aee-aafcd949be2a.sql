
CREATE OR REPLACE FUNCTION public.check_and_send_reminders()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r_meal RECORD;
    r_workout RECORD;
    r_user RECORD;
    v_now_time TIME := (now() AT TIME ZONE 'America/Sao_Paulo')::TIME;
    v_now_date DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::DATE;
    v_day_of_week TEXT := lower(trim(to_char(v_now_date, 'Day')));
    v_now_hm TEXT := to_char(v_now_time, 'HH24:MI');
BEGIN
    -- 1. Lembretes de refeição (na janela dos próximos 35 minutos)
    FOR r_meal IN
        SELECT r.id, r.nome, r.horario, d.user_id AS aluno_id
        FROM public.refeicoes r
        JOIN public.dietas d ON r.dieta_id = d.id
        WHERE d.is_published = true
          AND r.horario BETWEEN v_now_time AND (v_now_time + interval '35 minutes')
          AND NOT EXISTS (
              SELECT 1 FROM public.notification_logs
              WHERE user_id = d.user_id
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

    -- 2. Lembrete de treino do dia (07:00 - 07:10)
    IF v_now_time BETWEEN '07:00:00'::TIME AND '07:10:00'::TIME THEN
        FOR r_workout IN
            SELECT DISTINCT aluno_id
            FROM public.treinos_prescritos
            WHERE lower(trim(dia_semana)) = v_day_of_week
              AND status = 'ativo'
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

    -- 3. Hidratação: nos horários 09:00, 12:00, 15:00, 18:00 e 21:00 (janela de minuto)
    IF v_now_hm IN ('09:00','12:00','15:00','18:00','21:00') THEN
        FOR r_user IN
            SELECT id FROM public.perfis
            WHERE push_token IS NOT NULL
              AND onboarding_completo = true
              AND NOT EXISTS (
                  SELECT 1 FROM public.notification_logs
                  WHERE user_id = perfis.id
                    AND type = 'hidratacao'
                    AND sent_at >= (date_trunc('hour', now()))
              )
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
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_send_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_send_reminders() TO postgres, service_role;
