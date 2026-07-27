CREATE OR REPLACE FUNCTION public.normalize_youtube_vlog_post()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_video_id text;
BEGIN
  IF NEW.platform = 'youtube'::public.vlog_platform THEN
    SELECT (regexp_match(
      coalesce(NEW.url, '') || ' ' || coalesce(NEW.thumbnail_url, ''),
      '(?:youtu\.be/|[?&]v=|/shorts/|/live/|/embed/)([A-Za-z0-9_-]{11})'
    ))[1]
    INTO v_video_id;

    IF v_video_id IS NULL THEN
      RAISE EXCEPTION 'Link do YouTube inválido. Cole a URL completa do vídeo com o ID.'
        USING ERRCODE = '22023';
    END IF;

    NEW.url := 'https://www.youtube.com/watch?v=' || v_video_id;
    NEW.thumbnail_url := 'https://i.ytimg.com/vi/' || v_video_id || '/hqdefault.jpg';
    NEW.source := 'import';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_youtube_vlog_post_before_write ON public.vlog_posts;
CREATE TRIGGER normalize_youtube_vlog_post_before_write
BEFORE INSERT OR UPDATE OF platform, url, thumbnail_url, source
ON public.vlog_posts
FOR EACH ROW
EXECUTE FUNCTION public.normalize_youtube_vlog_post();