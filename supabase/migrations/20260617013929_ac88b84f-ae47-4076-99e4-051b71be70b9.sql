CREATE TABLE IF NOT EXISTS public.push_send_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  has_token boolean NOT NULL DEFAULT false,
  status text NOT NULL,
  error_message text,
  fcm_response jsonb,
  title text,
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.push_send_logs TO authenticated;
GRANT ALL ON public.push_send_logs TO service_role;

ALTER TABLE public.push_send_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_send_logs_admin_select" ON public.push_send_logs
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_push_send_logs_created_at ON public.push_send_logs (created_at DESC);