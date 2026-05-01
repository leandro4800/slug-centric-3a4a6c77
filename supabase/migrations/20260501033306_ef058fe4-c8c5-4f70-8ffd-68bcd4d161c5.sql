-- Add 7-skinfold protocol columns to avaliacoes_fisicas
ALTER TABLE public.avaliacoes_fisicas
  ADD COLUMN IF NOT EXISTS dobra_peitoral numeric,
  ADD COLUMN IF NOT EXISTS dobra_axilar_media numeric,
  ADD COLUMN IF NOT EXISTS dobra_triceps numeric,
  ADD COLUMN IF NOT EXISTS dobra_subescapular numeric,
  ADD COLUMN IF NOT EXISTS dobra_abdominal numeric,
  ADD COLUMN IF NOT EXISTS dobra_suprailiaca numeric,
  ADD COLUMN IF NOT EXISTS dobra_coxa numeric,
  ADD COLUMN IF NOT EXISTS idade integer,
  ADD COLUMN IF NOT EXISTS sexo text,
  ADD COLUMN IF NOT EXISTS metodo text;

-- Trigger: keep perfis_treino.peso_kg in sync with the latest avaliacao
CREATE OR REPLACE FUNCTION public.sync_perfil_treino_from_avaliacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.perfis_treino
     SET peso_kg = NEW.peso_kg,
         bf_pct = COALESCE(NEW.bf_pct_calculado, bf_pct),
         updated_at = now()
   WHERE aluno_id = NEW.aluno_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_perfil_treino_from_avaliacao ON public.avaliacoes_fisicas;
CREATE TRIGGER trg_sync_perfil_treino_from_avaliacao
AFTER INSERT ON public.avaliacoes_fisicas
FOR EACH ROW
EXECUTE FUNCTION public.sync_perfil_treino_from_avaliacao();