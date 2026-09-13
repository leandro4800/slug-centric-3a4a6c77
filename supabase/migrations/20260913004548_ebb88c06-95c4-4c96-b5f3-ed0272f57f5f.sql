CREATE OR REPLACE FUNCTION public.check_and_send_reminders()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    r_meal RECORD;
    r_workout RECORD;
    r_user RECORD;
    v_now_time TIME := (now() AT TIME ZONE 'America/Sao_Paulo')::TIME;
    v_now_date DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::DATE;
    v_day_of_week TEXT := lower(trim(to_char(v_now_date, 'Day')));
    v_now_hm TEXT := to_char(v_now_time, 'HH24:MI');
BEGIN
    FOR r_meal IN
        SELECT r.id, r.nome, r.horario, d.user_id AS aluno_id
        FROM public.refeicoes r
        JOIN public.dietas d ON r.dieta_id = d.id
        WHERE d.is_published = true
          AND r.horario BETWEEN v_now_time AND (v_now_time + interval '35 minutes')
          AND NOT EXISTS (
              SELECT 1 FROM public.notification_logs nl
              WHERE nl.user_id = d.user_id
                AND nl.type = 'dieta'
                AND nl.reference_id = r.id
                AND (nl.sent_at AT TIME ZONE 'America/Sao_Paulo')::date = v_now_date
          )
    LOOP
        BEGIN
            INSERT INTO public.notification_logs (user_id, type, reference_id)
            VALUES (r_meal.aluno_id, 'dieta', r_meal.id);

            PERFORM public.send_push_notification(
                r_meal.aluno_id,
                'Hora da Refeição! 🍎',
                'Sua refeição "' || r_meal.nome || '" está programada para às ' || to_char(r_meal.horario, 'HH24:MI') || '.'
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Falha ao processar lembrete de refeicao % para aluno %: %', r_meal.id, r_meal.aluno_id, SQLERRM;
        END;
    END LOOP;

    IF v_now_time BETWEEN '07:00:00'::TIME AND '07:10:00'::TIME THEN
        FOR r_workout IN
            SELECT DISTINCT tp.aluno_id
            FROM public.treinos_prescritos tp
            WHERE lower(trim(tp.dia_semana)) = v_day_of_week
              AND tp.status = 'ativo'
              AND NOT EXISTS (
                  SELECT 1 FROM public.notification_logs nl
                  WHERE nl.user_id = tp.aluno_id
                    AND nl.type = 'treino'
                    AND (nl.sent_at AT TIME ZONE 'America/Sao_Paulo')::date = v_now_date
              )
        LOOP
            BEGIN
                INSERT INTO public.notification_logs (user_id, type)
                VALUES (r_workout.aluno_id, 'treino');

                PERFORM public.send_push_notification(
                    r_workout.aluno_id,
                    'Dia de Treino! 💪',
                    'Você tem um treino prescrito para hoje. Vamos nessa?'
                );
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Falha ao processar lembrete de treino para aluno %: %', r_workout.aluno_id, SQLERRM;
            END;
        END LOOP;
    END IF;

    IF v_now_hm IN ('09:00','12:00','15:00','18:00','21:00') THEN
        FOR r_user IN
            SELECT p.id FROM public.perfis p
            WHERE p.push_token IS NOT NULL
              AND p.onboarding_completo = true
              AND NOT EXISTS (
                  SELECT 1 FROM public.notification_logs nl
                  WHERE nl.user_id = p.id
                    AND nl.type = 'hidratacao'
                    AND nl.sent_at >= now() - interval '2 hours'
              )
        LOOP
            BEGIN
                INSERT INTO public.notification_logs (user_id, type)
                VALUES (r_user.id, 'hidratacao');

                PERFORM public.send_push_notification(
                    r_user.id,
                    'Hora de se Hidratar! 💧',
                    'Não esqueça de beber água para manter o foco e a saúde.'
                );
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Falha ao processar lembrete de hidratacao para aluno %: %', r_user.id, SQLERRM;
            END;
        END LOOP;
    END IF;
END;
$function$;