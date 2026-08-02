CREATE OR REPLACE FUNCTION public.normalize_alphateam_ppl_weekdays()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alphateam_id uuid;
  v_days text[];
  v_norm_days text;
BEGIN
  SELECT id INTO v_alphateam_id
  FROM public.tenants
  WHERE slug = 'alphateam'
  LIMIT 1;

  IF NEW.tenant_id IS DISTINCT FROM v_alphateam_id THEN
    RETURN NEW;
  END IF;

  SELECT disponibilidade_dias INTO v_days
  FROM public.anamnese_aluno
  WHERE aluno_id = NEW.aluno_id
  ORDER BY updated_at DESC
  LIMIT 1;

  v_norm_days := lower(translate(array_to_string(COALESCE(v_days, ARRAY[]::text[]), ' '), 'áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ', 'aaaaeeiooou cAAAAEEIOOOUC'));

  IF NOT (
    v_norm_days ~ '(^| )seg(unda)?( |$)'
    AND v_norm_days ~ '(^| )ter(ca)?( |$)'
    AND v_norm_days ~ '(^| )qua(rta)?( |$)'
    AND v_norm_days ~ '(^| )qui(nta)?( |$)'
    AND v_norm_days ~ '(^| )sex(ta)?( |$)'
    AND v_norm_days ~ '(^| )sab(ado)?( |$)'
  ) THEN
    RETURN NEW;
  END IF;

  NEW.dia_semana := CASE
    WHEN NEW.dia_semana ~* '^Push A(\s|$)' THEN 'Seg — Push A (Foco em Peito)'
    WHEN NEW.dia_semana ~* '^Pull A(\s|$)' THEN 'Ter — Pull A (Foco em Costas/Largura)'
    WHEN NEW.dia_semana ~* '^Legs A(\s|$)' THEN 'Qua — Legs A (Foco em Quadríceps)'
    WHEN NEW.dia_semana ~* '^Push B(\s|$)' THEN 'Qui — Push B (Foco em Ombros)'
    WHEN NEW.dia_semana ~* '^Pull B(\s|$)' THEN 'Sex — Pull B (Foco em Costas/Espessura)'
    WHEN NEW.dia_semana ~* '^Legs B(\s|$)' THEN 'Sáb — Legs B (Foco em Posteriores)'
    ELSE NEW.dia_semana
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_alphateam_ppl_weekdays ON public.treinos_prescritos;
CREATE TRIGGER trg_normalize_alphateam_ppl_weekdays
BEFORE INSERT OR UPDATE OF dia_semana, aluno_id, tenant_id
ON public.treinos_prescritos
FOR EACH ROW
EXECUTE FUNCTION public.normalize_alphateam_ppl_weekdays();