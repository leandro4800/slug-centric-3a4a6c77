-- 1) Reações rápidas reaproveitando comunidade_curtidas
ALTER TABLE public.comunidade_curtidas
  ADD COLUMN IF NOT EXISTS tipo_reacao text NOT NULL DEFAULT 'like';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comunidade_curtidas_tipo_reacao_check') THEN
    ALTER TABLE public.comunidade_curtidas
      ADD CONSTRAINT comunidade_curtidas_tipo_reacao_check
      CHECK (tipo_reacao IN ('like','forca','fogo','palmas'));
  END IF;
END $$;

DROP POLICY IF EXISTS "Usuario atualiza a propria reacao" ON public.comunidade_curtidas;
CREATE POLICY "Usuario atualiza a propria reacao"
  ON public.comunidade_curtidas
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id AND profissional_id = public.get_user_tenant_id(auth.uid()));

-- 2) Notificacoes de reacao e comentario para o autor do post
CREATE OR REPLACE FUNCTION public.notify_comunidade_reacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author uuid;
  v_name text;
  v_label text;
BEGIN
  SELECT usuario_id INTO v_author FROM public.comunidade_posts WHERE id = NEW.post_id;
  IF v_author IS NULL OR v_author = NEW.usuario_id THEN
    RETURN NEW;
  END IF;
  SELECT nome_completo INTO v_name FROM public.perfis WHERE id = NEW.usuario_id;
  v_label := CASE NEW.tipo_reacao
    WHEN 'forca'  THEN 'reagiu com 💪 na'
    WHEN 'fogo'   THEN 'reagiu com 🔥 na'
    WHEN 'palmas' THEN 'reagiu com 👏 na'
    ELSE 'curtiu a'
  END;
  BEGIN
    PERFORM public.send_push_notification(
      v_author,
      'Comunidade',
      COALESCE(v_name, 'Alguem') || ' ' || v_label || ' sua publicacao',
      jsonb_build_object('type', 'comunidade_reacao', 'post_id', NEW.post_id)
    );
    INSERT INTO public.notification_logs (user_id, type, reference_id)
    VALUES (v_author, 'comunidade_reacao', NEW.post_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_comunidade_reacao ON public.comunidade_curtidas;
CREATE TRIGGER trg_notify_comunidade_reacao
AFTER INSERT OR UPDATE OF tipo_reacao ON public.comunidade_curtidas
FOR EACH ROW EXECUTE FUNCTION public.notify_comunidade_reacao();

CREATE OR REPLACE FUNCTION public.notify_comunidade_comentario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author uuid;
  v_name text;
BEGIN
  SELECT usuario_id INTO v_author FROM public.comunidade_posts WHERE id = NEW.post_id;
  IF v_author IS NULL OR v_author = NEW.usuario_id THEN
    RETURN NEW;
  END IF;
  SELECT nome_completo INTO v_name FROM public.perfis WHERE id = NEW.usuario_id;
  BEGIN
    PERFORM public.send_push_notification(
      v_author,
      'Comunidade',
      COALESCE(v_name, 'Alguem') || ' comentou: ' || left(NEW.comentario, 80),
      jsonb_build_object('type', 'comunidade_comentario', 'post_id', NEW.post_id)
    );
    INSERT INTO public.notification_logs (user_id, type, reference_id)
    VALUES (v_author, 'comunidade_comentario', NEW.post_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_comunidade_comentario ON public.comunidade_comentarios;
CREATE TRIGGER trg_notify_comunidade_comentario
AFTER INSERT ON public.comunidade_comentarios
FOR EACH ROW EXECUTE FUNCTION public.notify_comunidade_comentario();

-- 3) Stories automaticos de conquista (ultimas 24h)
CREATE OR REPLACE FUNCTION public.get_community_stories(_tenant_id uuid)
RETURNS TABLE(
  user_id uuid,
  nome_completo text,
  avatar_url text,
  tipo text,
  titulo text,
  detalhe text,
  criado_em timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH allowed AS (
    SELECT (
      EXISTS (SELECT 1 FROM public.perfis me WHERE me.id = auth.uid() AND me.tenant_id = _tenant_id)
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'coach'::app_role, _tenant_id)
      OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = _tenant_id AND t.owner_user_id = auth.uid())
    ) AS ok
  ),
  eventos AS (
    SELECT s.aluno_id AS uid,
           'treino'::text AS tipo,
           'Treino concluido'::text AS titulo,
           COALESCE(s.dia_semana, 'Treino') ||
             COALESCE(' - ' || s.duracao_min::text || ' min', '') AS detalhe,
           s.created_at AS criado_em
    FROM public.sessoes_treino s
    WHERE s.tenant_id = _tenant_id AND s.created_at > now() - interval '24 hours'
    UNION ALL
    SELECT p.aluno_id, 'pr', 'Novo recorde',
           p.exercicio || ' - ' || p.valor || COALESCE(' ' || p.unidade, ''),
           p.created_at
    FROM public.prs p
    WHERE p.tenant_id = _tenant_id AND p.created_at > now() - interval '24 hours'
    UNION ALL
    SELECT c.user_id, 'checkin', 'Check-in de evolucao',
           COALESCE(c.peso_kg::text || ' kg', 'Novo check-in'),
           c.created_at
    FROM public.evolucao_checkins c
    JOIN public.perfis pf ON pf.id = c.user_id
    WHERE pf.tenant_id = _tenant_id AND c.created_at > now() - interval '24 hours'
  )
  SELECT e.uid, pf.nome_completo, pf.avatar_url, e.tipo, e.titulo, e.detalhe, e.criado_em
  FROM eventos e
  JOIN public.perfis pf ON pf.id = e.uid
  CROSS JOIN allowed a
  WHERE a.ok AND pf.tenant_id = _tenant_id
  ORDER BY e.criado_em DESC
  LIMIT 200;
$$;

-- 4) Sequencia de treino + identificacao de coach
CREATE OR REPLACE FUNCTION public.get_community_members_meta(_tenant_id uuid)
RETURNS TABLE(user_id uuid, sequencia_atual integer, is_coach boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH allowed AS (
    SELECT (
      EXISTS (SELECT 1 FROM public.perfis me WHERE me.id = auth.uid() AND me.tenant_id = _tenant_id)
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'coach'::app_role, _tenant_id)
      OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = _tenant_id AND t.owner_user_id = auth.uid())
    ) AS ok
  )
  SELECT pf.id,
         COALESCE(st.sequencia_atual, 0),
         (
           EXISTS (SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id = pf.id AND ur.role = 'coach'::app_role AND ur.tenant_id = _tenant_id)
           OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = _tenant_id AND t.owner_user_id = pf.id)
         )
  FROM public.perfis pf
  LEFT JOIN public.stats_treino_aluno st ON st.aluno_id = pf.id AND st.tenant_id = _tenant_id
  CROSS JOIN allowed a
  WHERE a.ok AND pf.tenant_id = _tenant_id
  LIMIT 300;
$$;

GRANT EXECUTE ON FUNCTION public.get_community_stories(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_members_meta(uuid) TO authenticated;