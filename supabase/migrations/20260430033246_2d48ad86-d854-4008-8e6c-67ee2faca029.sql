UPDATE auth.users
SET encrypted_password = crypt('Alpha@2026', gen_salt('bf')),
    updated_at = now()
WHERE email = 'alphacoachapp@gmail.com';