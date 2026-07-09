
CREATE OR REPLACE FUNCTION public.detect_tenant_vertical()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_text text;
  v_fight_kw text[] := ARRAY[
    'ct de luta','ct luta','ct lutas','ct de lutas',
    'fight','luta','lutas','mma','jiu','jitsu','bjj',
    'muay','thai','boxe','kickbox','karate','karatê',
    'judo','judô','wrestling','submission','grappling',
    'taekwondo','sanda','krav','octogono','octógono'
  ];
  v_crossfit_kw text[] := ARRAY[
    'crossfit','cross fit','wod','functional fitness',
    'treino funcional','hiit','box crossfit'
  ];
  kw text;
BEGIN
  -- Só auto-detecta quando a vertical está no padrão (personal)
  IF NEW.vertical IS DISTINCT FROM 'personal'::tenant_vertical THEN
    RETURN NEW;
  END IF;

  v_text := lower(
    coalesce(NEW.nome,'') || ' ' ||
    coalesce(NEW.slug,'') || ' ' ||
    coalesce(NEW.tagline,'') || ' ' ||
    coalesce(array_to_string(NEW.especialidades, ' '), '')
  );

  -- Fight tem prioridade (evita "box" do crossfit confundir com boxe)
  FOREACH kw IN ARRAY v_fight_kw LOOP
    IF position(kw IN v_text) > 0 THEN
      NEW.vertical := 'fight'::tenant_vertical;
      RETURN NEW;
    END IF;
  END LOOP;

  FOREACH kw IN ARRAY v_crossfit_kw LOOP
    IF position(kw IN v_text) > 0 THEN
      NEW.vertical := 'crossfit'::tenant_vertical;
      RETURN NEW;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_detect_tenant_vertical ON public.tenants;
CREATE TRIGGER trg_detect_tenant_vertical
BEFORE INSERT OR UPDATE OF nome, slug, tagline, especialidades, vertical
ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.detect_tenant_vertical();

-- Aplica retroativamente aos tenants existentes que ainda estão em 'personal'
UPDATE public.tenants
SET updated_at = now()
WHERE vertical = 'personal'::tenant_vertical;
