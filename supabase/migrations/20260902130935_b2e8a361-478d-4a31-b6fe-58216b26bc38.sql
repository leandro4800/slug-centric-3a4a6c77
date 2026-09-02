-- STORIES
CREATE TABLE public.comunidade_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'foto',
  media_url text,
  thumb_url text,
  texto text,
  duracao_seg integer NOT NULL DEFAULT 5,
  criado_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comunidade_stories TO authenticated;
GRANT ALL ON public.comunidade_stories TO service_role;
ALTER TABLE public.comunidade_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stories visiveis no tenant"
ON public.comunidade_stories FOR SELECT TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "stories inserir proprio"
ON public.comunidade_stories FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "stories atualizar proprio"
ON public.comunidade_stories FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "stories apagar proprio"
ON public.comunidade_stories FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE INDEX idx_comunidade_stories_tenant_exp ON public.comunidade_stories (tenant_id, expira_em DESC);

-- VIEWS
CREATE TABLE public.comunidade_story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.comunidade_stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, user_id)
);

GRANT SELECT, INSERT ON public.comunidade_story_views TO authenticated;
GRANT ALL ON public.comunidade_story_views TO service_role;
ALTER TABLE public.comunidade_story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "views proprias ou do autor"
ON public.comunidade_story_views FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.comunidade_stories s WHERE s.id = story_id AND s.user_id = auth.uid())
);

CREATE POLICY "views inserir proprio"
ON public.comunidade_story_views FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- REACOES
CREATE TABLE public.comunidade_story_reacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.comunidade_stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text,
  resposta text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.comunidade_story_reacoes TO authenticated;
GRANT ALL ON public.comunidade_story_reacoes TO service_role;
ALTER TABLE public.comunidade_story_reacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reacoes proprias ou do autor"
ON public.comunidade_story_reacoes FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.comunidade_stories s WHERE s.id = story_id AND s.user_id = auth.uid())
);

CREATE POLICY "reacoes inserir proprio"
ON public.comunidade_story_reacoes FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "reacoes apagar proprio"
ON public.comunidade_story_reacoes FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- NOTIFICACAO DE REACAO EM STORY
CREATE OR REPLACE FUNCTION public.notify_story_reacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_autor uuid;
  v_nome text;
BEGIN
  SELECT user_id INTO v_autor FROM public.comunidade_stories WHERE id = NEW.story_id;
  IF v_autor IS NULL OR v_autor = NEW.user_id THEN
    RETURN NEW;
  END IF;
  SELECT nome_completo INTO v_nome FROM public.perfis WHERE id = NEW.user_id;
  PERFORM public.send_push_notification(
    v_autor,
    COALESCE(v_nome, 'Alguém') || ' reagiu ao seu story',
    COALESCE(NULLIF(NEW.resposta, ''), NEW.emoji, '💬'),
    jsonb_build_object('tipo', 'story_reacao', 'story_id', NEW.story_id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_story_reacao
AFTER INSERT ON public.comunidade_story_reacoes
FOR EACH ROW EXECUTE FUNCTION public.notify_story_reacao();

-- FEED UNIFICADO
CREATE OR REPLACE FUNCTION public.get_community_stories_v2(_tenant_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  nome_completo text,
  avatar_url text,
  origem text,
  tipo text,
  media_url text,
  thumb_url text,
  texto text,
  detalhe text,
  duracao_seg integer,
  criado_em timestamptz,
  visto boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.user_id,
    p.nome_completo,
    p.avatar_url,
    'post'::text AS origem,
    s.tipo,
    s.media_url,
    s.thumb_url,
    s.texto,
    NULL::text AS detalhe,
    s.duracao_seg,
    s.criado_em,
    EXISTS (SELECT 1 FROM public.comunidade_story_views v WHERE v.story_id = s.id AND v.user_id = auth.uid()) AS visto
  FROM public.comunidade_stories s
  JOIN public.perfis p ON p.id = s.user_id
  WHERE s.tenant_id = _tenant_id
    AND s.expira_em > now()
    AND public.user_belongs_to_tenant(auth.uid(), _tenant_id)

  UNION ALL

  SELECT
    gen_random_uuid() AS id,
    c.user_id,
    c.nome_completo,
    c.avatar_url,
    'conquista'::text AS origem,
    'conquista'::text AS tipo,
    NULL::text AS media_url,
    NULL::text AS thumb_url,
    c.titulo AS texto,
    c.detalhe,
    5 AS duracao_seg,
    c.criado_em,
    true AS visto
  FROM public.get_community_stories(_tenant_id) c
  ORDER BY criado_em ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_community_stories_v2(uuid) TO authenticated;