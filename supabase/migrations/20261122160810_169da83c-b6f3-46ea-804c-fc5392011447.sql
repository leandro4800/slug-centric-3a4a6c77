-- 1) Mensagens: áudio + referência do story
ALTER TABLE public.comunidade_mensagens
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'texto',
  ADD COLUMN IF NOT EXISTS audio_path text,
  ADD COLUMN IF NOT EXISTS audio_duracao_seg integer,
  ADD COLUMN IF NOT EXISTS story_autor_id uuid,
  ADD COLUMN IF NOT EXISTS story_origem text,
  ADD COLUMN IF NOT EXISTS story_tipo text,
  ADD COLUMN IF NOT EXISTS story_media_url text,
  ADD COLUMN IF NOT EXISTS story_thumb_url text,
  ADD COLUMN IF NOT EXISTS story_texto text,
  ADD COLUMN IF NOT EXISTS story_expira_em timestamptz;

ALTER TABLE public.comunidade_mensagens
  ADD CONSTRAINT comunidade_mensagens_tipo_chk CHECK (tipo IN ('texto', 'audio')),
  ADD CONSTRAINT comunidade_mensagens_audio_chk CHECK (tipo <> 'audio' OR audio_path IS NOT NULL),
  ADD CONSTRAINT comunidade_mensagens_story_origem_chk CHECK (story_origem IS NULL OR story_origem IN ('post', 'conquista'));

CREATE OR REPLACE FUNCTION public.comunidade_mensagens_preparar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE s record;
BEGIN
  IF NEW.story_id IS NOT NULL THEN
    SELECT st.user_id, st.tenant_id, st.tipo, st.media_url, st.thumb_url, st.texto, st.expira_em
      INTO s
      FROM public.comunidade_stories st WHERE st.id = NEW.story_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Story indisponível';
    END IF;
    IF s.tenant_id <> NEW.tenant_id THEN
      RAISE EXCEPTION 'Story de outra comunidade';
    END IF;
    NEW.story_autor_id := s.user_id;
    NEW.story_origem := 'post';
    NEW.story_tipo := s.tipo;
    NEW.story_media_url := s.media_url;
    NEW.story_thumb_url := s.thumb_url;
    NEW.story_texto := s.texto;
    NEW.story_expira_em := s.expira_em;
  ELSIF NEW.story_origem = 'conquista' THEN
    IF NEW.story_autor_id IS NULL OR NOT public.user_belongs_to_tenant(NEW.story_autor_id, NEW.tenant_id) THEN
      RAISE EXCEPTION 'Story de outra comunidade';
    END IF;
    NEW.story_tipo := 'conquista';
    NEW.story_media_url := NULL;
    NEW.story_thumb_url := NULL;
    NEW.story_expira_em := now() + interval '24 hours';
  ELSE
    NEW.story_autor_id := NULL;
    NEW.story_origem := NULL;
    NEW.story_tipo := NULL;
    NEW.story_media_url := NULL;
    NEW.story_thumb_url := NULL;
    NEW.story_texto := NULL;
    NEW.story_expira_em := NULL;
  END IF;

  IF NEW.tipo = 'audio' THEN
    IF NEW.audio_path IS NULL
       OR position((NEW.tenant_id::text || '/' || NEW.remetente_id::text || '/') IN NEW.audio_path) <> 1 THEN
      RAISE EXCEPTION 'Arquivo de áudio inválido';
    END IF;
  ELSE
    NEW.audio_path := NULL;
    NEW.audio_duracao_seg := NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.comunidade_mensagens_preparar() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_com_msg_preparar ON public.comunidade_mensagens;
CREATE TRIGGER trg_com_msg_preparar
  BEFORE INSERT ON public.comunidade_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.comunidade_mensagens_preparar();

-- Snapshot para mensagens antigas que já citam story
UPDATE public.comunidade_mensagens m
   SET story_autor_id = s.user_id,
       story_origem = 'post',
       story_tipo = s.tipo,
       story_media_url = s.media_url,
       story_thumb_url = s.thumb_url,
       story_texto = s.texto,
       story_expira_em = s.expira_em
  FROM public.comunidade_stories s
 WHERE m.story_id = s.id AND m.story_origem IS NULL;

-- Notificação: áudio e sem push duplicado em resposta a story (notify_story_reacao já avisa)
CREATE OR REPLACE FUNCTION public.notify_comunidade_mensagem()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_nome text;
BEGIN
  IF NEW.destinatario_id = NEW.remetente_id THEN RETURN NEW; END IF;
  IF NEW.story_id IS NOT NULL AND NEW.story_autor_id = NEW.destinatario_id THEN RETURN NEW; END IF;
  SELECT nome_completo INTO v_nome FROM public.perfis WHERE id = NEW.remetente_id;
  PERFORM public.send_push_notification(
    NEW.destinatario_id,
    COALESCE(v_nome, 'Alguém') || ' te enviou uma mensagem',
    CASE
      WHEN NEW.tipo = 'audio' THEN '🎤 Mensagem de áudio'
      WHEN NEW.story_origem IS NOT NULL AND NEW.story_autor_id = NEW.destinatario_id
        THEN COALESCE(NULLIF(NEW.texto, ''), NEW.emoji, 'Respondeu ao seu story')
      WHEN NEW.story_origem IS NOT NULL THEN COALESCE(NULLIF(NEW.texto, ''), 'Enviou um story')
      ELSE COALESCE(NULLIF(NEW.texto, ''), NEW.emoji, '💬')
    END,
    jsonb_build_object('tipo', 'direct', 'remetente_id', NEW.remetente_id)
  );
  RETURN NEW;
END;
$function$;

-- 2) Visualizações: uma por usuário, nunca do dono, só no mesmo tenant
DELETE FROM public.comunidade_story_views v
 USING public.comunidade_stories s
 WHERE s.id = v.story_id AND s.user_id = v.user_id;

DROP POLICY IF EXISTS "views inserir proprio" ON public.comunidade_story_views;
CREATE POLICY "views inserir proprio" ON public.comunidade_story_views
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.comunidade_stories s
       WHERE s.id = comunidade_story_views.story_id
         AND s.user_id <> auth.uid()
         AND public.user_belongs_to_tenant(auth.uid(), s.tenant_id)
    )
  );

-- 3) Reações/respostas: só mesmo tenant, story ativo e de outra pessoa
DROP POLICY IF EXISTS "reacoes inserir proprio" ON public.comunidade_story_reacoes;
CREATE POLICY "reacoes inserir proprio" ON public.comunidade_story_reacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.comunidade_stories s
       WHERE s.id = comunidade_story_reacoes.story_id
         AND s.user_id <> auth.uid()
         AND s.expira_em > now()
         AND public.user_belongs_to_tenant(auth.uid(), s.tenant_id)
    )
  );

-- Próprio story conta como visto para o dono
CREATE OR REPLACE FUNCTION public.get_community_stories_v2(_tenant_id uuid)
 RETURNS TABLE(id uuid, user_id uuid, nome_completo text, avatar_url text, origem text, tipo text, media_url text, thumb_url text, texto text, detalhe text, duracao_seg integer, criado_em timestamp with time zone, visto boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    s.id, s.user_id, p.nome_completo, p.avatar_url,
    'post'::text AS origem, s.tipo, s.media_url, s.thumb_url, s.texto,
    NULL::text AS detalhe, s.duracao_seg, s.criado_em,
    (s.user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.comunidade_story_views v WHERE v.story_id = s.id AND v.user_id = auth.uid())) AS visto
  FROM public.comunidade_stories s
  JOIN public.perfis p ON p.id = s.user_id
  WHERE s.tenant_id = _tenant_id
    AND s.expira_em > now()
    AND public.user_belongs_to_tenant(auth.uid(), _tenant_id)
  UNION ALL
  SELECT
    gen_random_uuid() AS id, c.user_id, c.nome_completo, c.avatar_url,
    'conquista'::text AS origem, 'conquista'::text AS tipo,
    NULL::text AS media_url, NULL::text AS thumb_url, c.titulo AS texto, c.detalhe,
    5 AS duracao_seg, c.criado_em, true AS visto
  FROM public.get_community_stories(_tenant_id) c
  ORDER BY criado_em ASC;
$function$;

-- 4) Storage privado dos áudios: {tenant_id}/{remetente_id}/{arquivo}
CREATE POLICY "comunidade_audios_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'comunidade_audios'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND CASE
      WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
        THEN public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid)
      ELSE false
    END
  );

CREATE POLICY "comunidade_audios_select_participantes" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'comunidade_audios'
    AND (
      (storage.foldername(name))[2] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.comunidade_mensagens m
         WHERE m.audio_path = objects.name
           AND m.destinatario_id = auth.uid()
      )
    )
  );

CREATE POLICY "comunidade_audios_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'comunidade_audios'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE INDEX IF NOT EXISTS idx_com_msg_audio_path ON public.comunidade_mensagens (audio_path) WHERE audio_path IS NOT NULL;