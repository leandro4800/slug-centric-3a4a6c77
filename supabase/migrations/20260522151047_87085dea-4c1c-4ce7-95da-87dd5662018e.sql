-- Ensure all existing diets are published so they appear for students
UPDATE public.dietas SET is_published = true WHERE is_published = false;

-- If there's a status column in treinos_prescritos that might hide workouts, ensure it's set correctly
-- (The previous check showed a 'status' column in treinos_prescritos)
UPDATE public.treinos_prescritos SET status = 'ativo' WHERE status IS NULL OR status = '';
