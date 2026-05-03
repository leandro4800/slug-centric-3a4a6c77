
-- Quebrar recursão entre triggers tenants <-> tenants_private
DROP TRIGGER IF EXISTS trg_sync_tenants_to_private ON public.tenants;
DROP TRIGGER IF EXISTS trg_sync_private_to_tenants ON public.tenants_private;

CREATE TRIGGER trg_sync_tenants_to_private
AFTER INSERT OR UPDATE OF vlog_webhook_secret, stripe_account_id, stripe_onboarding_completed
ON public.tenants
FOR EACH ROW
WHEN (pg_trigger_depth() = 0)
EXECUTE FUNCTION public.sync_tenants_to_private();

CREATE TRIGGER trg_sync_private_to_tenants
AFTER INSERT OR UPDATE ON public.tenants_private
FOR EACH ROW
WHEN (pg_trigger_depth() = 0)
EXECUTE FUNCTION public.sync_private_to_tenants();
