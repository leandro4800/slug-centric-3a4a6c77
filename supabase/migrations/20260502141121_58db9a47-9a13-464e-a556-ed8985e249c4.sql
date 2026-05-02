
-- Trigger to mirror sensitive columns between public.tenants and public.tenants_private
CREATE OR REPLACE FUNCTION public.sync_tenants_to_private()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tenants_private (tenant_id, vlog_webhook_secret, stripe_account_id, stripe_onboarding_completed)
  VALUES (NEW.id, NEW.vlog_webhook_secret, NEW.stripe_account_id, COALESCE(NEW.stripe_onboarding_completed, false))
  ON CONFLICT (tenant_id) DO UPDATE
    SET vlog_webhook_secret = EXCLUDED.vlog_webhook_secret,
        stripe_account_id = EXCLUDED.stripe_account_id,
        stripe_onboarding_completed = EXCLUDED.stripe_onboarding_completed,
        updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_tenants_to_private ON public.tenants;
CREATE TRIGGER trg_sync_tenants_to_private
AFTER INSERT OR UPDATE OF vlog_webhook_secret, stripe_account_id, stripe_onboarding_completed
ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.sync_tenants_to_private();

CREATE OR REPLACE FUNCTION public.sync_private_to_tenants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tenants
     SET vlog_webhook_secret = COALESCE(NEW.vlog_webhook_secret, vlog_webhook_secret),
         stripe_account_id = COALESCE(NEW.stripe_account_id, stripe_account_id),
         stripe_onboarding_completed = COALESCE(NEW.stripe_onboarding_completed, stripe_onboarding_completed)
   WHERE id = NEW.tenant_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_private_to_tenants ON public.tenants_private;
CREATE TRIGGER trg_sync_private_to_tenants
AFTER INSERT OR UPDATE ON public.tenants_private
FOR EACH ROW EXECUTE FUNCTION public.sync_private_to_tenants();
