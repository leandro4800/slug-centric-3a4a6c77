UPDATE public.perfis
SET onboarding_completo = true,
    nome_completo = COALESCE(nome_completo, 'Admin AlphaCoach')
WHERE id = '3c40d11c-1560-462f-8918-a924cfe8686c';