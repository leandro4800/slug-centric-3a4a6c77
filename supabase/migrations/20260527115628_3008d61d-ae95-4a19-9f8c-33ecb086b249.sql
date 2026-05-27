ALTER TABLE public.agenda_presencial_slots ADD COLUMN tipo_aula TEXT;
COMMENT ON COLUMN public.agenda_presencial_slots.tipo_aula IS 'Tipo de aula presencial (ex: Personal, Avaliação, Grupo)';