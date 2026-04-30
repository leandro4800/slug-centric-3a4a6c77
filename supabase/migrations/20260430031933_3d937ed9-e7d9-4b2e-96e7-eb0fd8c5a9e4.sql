UPDATE public.tenants 
SET status = 'approved', 
    stripe_onboarding_completed = true 
WHERE owner_user_id = '3c40d11c-1560-462f-8918-a924cfe8686c';