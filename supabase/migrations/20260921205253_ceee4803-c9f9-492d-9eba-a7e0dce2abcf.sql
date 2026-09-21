ALTER TABLE public.prs ALTER COLUMN treino_prescrito_id DROP NOT NULL;
ALTER TABLE public.prs ALTER COLUMN series_executada_id DROP NOT NULL;
ALTER TABLE public.prs DROP CONSTRAINT prs_treino_prescrito_id_fkey;
ALTER TABLE public.prs ADD CONSTRAINT prs_treino_prescrito_id_fkey FOREIGN KEY (treino_prescrito_id) REFERENCES public.treinos_prescritos(id) ON DELETE SET NULL;
ALTER TABLE public.prs DROP CONSTRAINT prs_series_executada_id_fkey;
ALTER TABLE public.prs ADD CONSTRAINT prs_series_executada_id_fkey FOREIGN KEY (series_executada_id) REFERENCES public.series_executadas(id) ON DELETE SET NULL;