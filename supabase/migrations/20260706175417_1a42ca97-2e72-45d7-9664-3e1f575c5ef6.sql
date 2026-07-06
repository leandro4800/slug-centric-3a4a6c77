
-- Ensure tenants_private has latest stripe data before dropping columns
INSERT INTO public.tenants_private (tenant_id, stripe_account_id, stripe_onboarding_completed)
SELECT id, stripe_account_id, COALESCE(stripe_onboarding_completed, false)
FROM public.tenants
WHERE stripe_account_id IS NOT NULL
ON CONFLICT (tenant_id) DO UPDATE
  SET stripe_account_id = COALESCE(EXCLUDED.stripe_account_id, public.tenants_private.stripe_account_id),
      stripe_onboarding_completed = COALESCE(EXCLUDED.stripe_onboarding_completed, public.tenants_private.stripe_onboarding_completed),
      updated_at = now();

-- Drop legacy sync trigger/function that references old columns on tenants
DROP TRIGGER IF EXISTS trg_sync_tenants_private ON public.tenants;
DROP TRIGGER IF EXISTS sync_tenants_private_trigger ON public.tenants;

-- Remove sensitive Stripe columns from the publicly-readable tenants table
ALTER TABLE public.tenants DROP COLUMN IF EXISTS stripe_account_id;
ALTER TABLE public.tenants DROP COLUMN IF EXISTS stripe_onboarding_completed;

-- Harden agendamentos_aula_avulsa: explicitly deny anonymous SELECT (defense in depth)
REVOKE ALL ON public.agendamentos_aula_avulsa FROM anon;

CREATE POLICY agend_restrict_anon_select
  ON public.agendamentos_aula_avulsa
  AS RESTRICTIVE
  FOR SELECT
  TO anon, authenticated
  USING (auth.uid() IS NOT NULL);
