-- Drop orphan sync functions (no triggers reference them)
DROP FUNCTION IF EXISTS public.sync_tenants_to_private() CASCADE;
DROP FUNCTION IF EXISTS public.sync_private_to_tenants() CASCADE;

-- Ensure tenants_private has the latest values before dropping
INSERT INTO public.tenants_private (tenant_id, vlog_webhook_secret, stripe_account_id, stripe_onboarding_completed)
SELECT t.id, t.vlog_webhook_secret, t.stripe_account_id, COALESCE(t.stripe_onboarding_completed, false)
FROM public.tenants t
ON CONFLICT (tenant_id) DO UPDATE SET
  vlog_webhook_secret = COALESCE(EXCLUDED.vlog_webhook_secret, public.tenants_private.vlog_webhook_secret),
  stripe_account_id = COALESCE(EXCLUDED.stripe_account_id, public.tenants_private.stripe_account_id),
  stripe_onboarding_completed = COALESCE(EXCLUDED.stripe_onboarding_completed, public.tenants_private.stripe_onboarding_completed),
  updated_at = now();

-- Drop sensitive columns from public-readable tenants table
ALTER TABLE public.tenants DROP COLUMN IF EXISTS vlog_webhook_secret;
ALTER TABLE public.tenants DROP COLUMN IF EXISTS stripe_account_id;
ALTER TABLE public.tenants DROP COLUMN IF EXISTS stripe_onboarding_completed;