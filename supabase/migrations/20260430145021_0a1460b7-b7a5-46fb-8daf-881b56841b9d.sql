-- Webhook secret per tenant (for external automations)
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS vlog_webhook_secret text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex');

-- Platform enum
DO $$ BEGIN
  CREATE TYPE public.vlog_platform AS ENUM ('youtube', 'instagram', 'tiktok', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- vlog_posts table
CREATE TABLE IF NOT EXISTS public.vlog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  platform public.vlog_platform NOT NULL DEFAULT 'other',
  url text NOT NULL,
  title text,
  description text,
  thumbnail_url text,
  author text,
  posted_at timestamptz,
  source text NOT NULL DEFAULT 'manual', -- 'manual' | 'webhook' | platform name
  external_id text,
  visivel boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, url)
);

CREATE INDEX IF NOT EXISTS idx_vlog_posts_tenant_posted ON public.vlog_posts(tenant_id, posted_at DESC NULLS LAST, created_at DESC);

ALTER TABLE public.vlog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read visible posts of approved tenants (so the aluno app shows them)
CREATE POLICY "vlog_select_public"
ON public.vlog_posts FOR SELECT
USING (
  visivel = true
  OR (EXISTS (SELECT 1 FROM tenants t WHERE t.id = vlog_posts.tenant_id AND t.owner_user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coach'::app_role, tenant_id)
);

-- Coach (owner) and admin can manage
CREATE POLICY "vlog_manage_owner"
ON public.vlog_posts FOR ALL
USING (
  (EXISTS (SELECT 1 FROM tenants t WHERE t.id = vlog_posts.tenant_id AND t.owner_user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coach'::app_role, tenant_id)
)
WITH CHECK (
  (EXISTS (SELECT 1 FROM tenants t WHERE t.id = vlog_posts.tenant_id AND t.owner_user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coach'::app_role, tenant_id)
);

CREATE TRIGGER trg_vlog_posts_updated_at
BEFORE UPDATE ON public.vlog_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();