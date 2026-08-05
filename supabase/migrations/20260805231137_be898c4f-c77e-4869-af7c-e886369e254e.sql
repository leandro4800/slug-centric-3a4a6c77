CREATE OR REPLACE FUNCTION public.enforce_perfis_music_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.id IS DISTINCT FROM v_uid THEN
      NEW.music_url := NULL;
    END IF;
  ELSIF NEW.music_url IS DISTINCT FROM OLD.music_url AND OLD.id IS DISTINCT FROM v_uid THEN
    NEW.music_url := OLD.music_url;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_perfis_music_owner_trg ON public.perfis;
CREATE TRIGGER enforce_perfis_music_owner_trg
BEFORE INSERT OR UPDATE ON public.perfis
FOR EACH ROW
EXECUTE FUNCTION public.enforce_perfis_music_owner();