DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Busca o ID do usuário pelo e-mail na tabela de perfis
    SELECT id INTO v_user_id FROM public.perfis WHERE lower(email) = 'executionmode48@gmail.com' LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        -- Remove registros em tabelas relacionadas (cascata manual para garantir)
        DELETE FROM public.assinaturas WHERE aluno_id = v_user_id;
        DELETE FROM public.alunos WHERE id = v_user_id;
        DELETE FROM public.anamnese_aluno WHERE aluno_id = v_user_id;
        DELETE FROM public.avaliacoes_fisicas WHERE aluno_id = v_user_id;
        DELETE FROM public.user_roles WHERE user_id = v_user_id;
        DELETE FROM public.perfis WHERE id = v_user_id;
        
        -- O usuário também deve ser removido do auth.users para permitir novo cadastro se necessário,
        -- mas como agente não temos permissão direta para deletar do auth via SQL em algumas configs,
        -- a deleção do perfil público já "retira o cadastro" visível no app.
    END IF;
END $$;