-- Add unique constraint to aluno_id in perfis_treino
ALTER TABLE public.perfis_treino 
ADD CONSTRAINT perfis_treino_aluno_id_key UNIQUE (aluno_id);
