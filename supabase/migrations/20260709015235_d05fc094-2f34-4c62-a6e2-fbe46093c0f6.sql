
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
    'centro de treinamento','escola de luta','escola de lutas',
    'academia de luta','academia de lutas',
    'fight','luta','lutas','mma','jiu','jitsu','bjj','nogi','no-gi','no gi',
    'muay','muaythai','thai','boxe','boxing','kickbox','karate','karatê',
    'judo','judô','wrestling','submission','grappling','sambo','capoeira',
    'taekwondo','sanda','krav','octogono','octógono','vale tudo','luta livre'
  ];
  v_crossfit_kw text[] := ARRAY[
    'crossfit','cross fit','cross training','crosstraining',
    'wod','functional fitness','treino funcional','funcional',
    'hiit','box de crossfit','studio','alta performance',
    'condicionamento fisico','condicionamento físico',
    'strength','conditioning','strength and conditioning'
  ];
  kw text;
BEGIN
  IF NEW.vertical IS DISTINCT FROM 'personal'::tenant_vertical THEN
    RETURN NEW;
  END IF;

  v_text := lower(
    coalesce(NEW.nome,'') || ' ' ||
    coalesce(NEW.slug,'') || ' ' ||
    coalesce(NEW.tagline,'') || ' ' ||
    coalesce(array_to_string(NEW.especialidades, ' '), '')
  );

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
