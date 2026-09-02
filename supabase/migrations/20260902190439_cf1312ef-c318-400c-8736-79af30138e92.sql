CREATE TABLE public.comunidade_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  remetente_id uuid NOT NULL,
  destinatario_id uuid NOT NULL,
  texto text,
  emoji text,
  story_id uuid REFERENCES public.comunidade_stories(id) ON DELETE SET NULL,
  lida_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_com_msg_par ON public.comunidade_mensagens (tenant_id, remetente_id, destinatario_id, criado_em DESC);
CREATE INDEX idx_com_msg_dest ON public.comunidade_mensagens (destinatario_id, lida_em);

GRANT SELECT, INSERT, UPDATE ON public.comunidade_mensagens TO authenticated;
GRANT ALL ON public.comunidade_mensagens TO service_role;

ALTER TABLE public.comunidade_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participantes leem suas mensagens"
ON public.comunidade_mensagens FOR SELECT TO authenticated
USING (auth.uid() = remetente_id OR auth.uid() = destinatario_id);

CREATE POLICY "Enviar mensagem para membro do mesmo tenant"
ON public.comunidade_mensagens FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = remetente_id
  AND public.user_belongs_to_tenant(auth.uid(), tenant_id)
  AND EXISTS (
    SELECT 1 FROM public.perfis p
    WHERE p.id = destinatario_id AND p.tenant_id = comunidade_mensagens.tenant_id
  )
);

CREATE POLICY "Destinatario marca como lida"
ON public.comunidade_mensagens FOR UPDATE TO authenticated
USING (auth.uid() = destinatario_id)
WITH CHECK (auth.uid() = destinatario_id);

CREATE TRIGGER trg_com_msg_updated_at
BEFORE UPDATE ON public.comunidade_mensagens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- push ao receber mensagem
CREATE OR REPLACE FUNCTION public.notify_comunidade_mensagem()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_nome text;
BEGIN
  IF NEW.destinatario_id = NEW.remetente_id THEN RETURN NEW; END IF;
  SELECT nome_completo INTO v_nome FROM public.perfis WHERE id = NEW.remetente_id;
  PERFORM public.send_push_notification(
    NEW.destinatario_id,
    COALESCE(v_nome, 'Alguém') || ' te enviou uma mensagem',
    COALESCE(NULLIF(NEW.texto, ''), NEW.emoji, '💬'),
    jsonb_build_object('tipo', 'direct', 'remetente_id', NEW.remetente_id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_com_msg
AFTER INSERT ON public.comunidade_mensagens
FOR EACH ROW EXECUTE FUNCTION public.notify_comunidade_mensagem();

-- reação/resposta em story vira mensagem no direct do autor
CREATE OR REPLACE FUNCTION public.story_reacao_to_mensagem()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_autor uuid; v_tenant uuid;
BEGIN
  SELECT s.user_id, s.tenant_id INTO v_autor, v_tenant
  FROM public.comunidade_stories s WHERE s.id = NEW.story_id;
  IF v_autor IS NULL OR v_autor = NEW.user_id THEN RETURN NEW; END IF;
  IF v_tenant IS NULL THEN
    SELECT tenant_id INTO v_tenant FROM public.perfis WHERE id = v_autor;
  END IF;
  INSERT INTO public.comunidade_mensagens (tenant_id, remetente_id, destinatario_id, texto, emoji, story_id)
  VALUES (v_tenant, NEW.user_id, v_autor, NULLIF(NEW.resposta, ''), NEW.emoji, NEW.story_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_story_reacao_msg
AFTER INSERT ON public.comunidade_story_reacoes
FOR EACH ROW EXECUTE FUNCTION public.story_reacao_to_mensagem();

ALTER PUBLICATION supabase_realtime ADD TABLE public.comunidade_mensagens;