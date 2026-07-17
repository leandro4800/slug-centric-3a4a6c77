
-- 1) coach_platform_subscriptions: force server-controlled financial fields for non-admins
CREATE OR REPLACE FUNCTION public.enforce_coach_platform_sub_financials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := public.has_role(auth.uid(), 'admin'::public.app_role);
BEGIN
  IF v_is_admin OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.fee_pct := 7.99;
    NEW.first_payment_value := 1.00;
    NEW.plan_tier := NULL;
    NEW.full_price := NULL;
    NEW.status := 'pending'::public.coach_sub_status;
    NEW.asaas_customer_id := NULL;
    NEW.asaas_subscription_id := NULL;
    NEW.stripe_customer_id := NULL;
    NEW.stripe_subscription_id := NULL;
    NEW.stripe_checkout_session_id := NULL;
    NEW.current_period_end := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.fee_pct := OLD.fee_pct;
    NEW.first_payment_value := OLD.first_payment_value;
    NEW.plan_tier := OLD.plan_tier;
    NEW.full_price := OLD.full_price;
    NEW.status := OLD.status;
    NEW.asaas_customer_id := OLD.asaas_customer_id;
    NEW.asaas_subscription_id := OLD.asaas_subscription_id;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
    NEW.stripe_checkout_session_id := OLD.stripe_checkout_session_id;
    NEW.current_period_end := OLD.current_period_end;
    NEW.user_id := OLD.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_coach_platform_sub_financials ON public.coach_platform_subscriptions;
CREATE TRIGGER trg_enforce_coach_platform_sub_financials
BEFORE INSERT OR UPDATE ON public.coach_platform_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.enforce_coach_platform_sub_financials();

-- 2) profissionais: prevent self-approval of identity verification
CREATE OR REPLACE FUNCTION public.enforce_profissionais_identity_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := public.has_role(auth.uid(), 'admin'::public.app_role);
BEGIN
  IF v_is_admin OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Non-admin professionals cannot change their own verification status.
  IF NEW.status_identidade IS DISTINCT FROM OLD.status_identidade THEN
    NEW.status_identidade := OLD.status_identidade;
  END IF;

  -- If identity is already approved, lock the identity photo to prevent tampering.
  IF OLD.status_identidade = 'aprovado'
     AND NEW.foto_identidade_url IS DISTINCT FROM OLD.foto_identidade_url THEN
    NEW.foto_identidade_url := OLD.foto_identidade_url;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_profissionais_identity_lock ON public.profissionais;
CREATE TRIGGER trg_enforce_profissionais_identity_lock
BEFORE UPDATE ON public.profissionais
FOR EACH ROW EXECUTE FUNCTION public.enforce_profissionais_identity_lock();

-- Also enforce on INSERT: newly-created professional rows must start as 'pendente' for non-admins
CREATE OR REPLACE FUNCTION public.enforce_profissionais_identity_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.status_identidade := 'pendente';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_profissionais_identity_insert ON public.profissionais;
CREATE TRIGGER trg_enforce_profissionais_identity_insert
BEFORE INSERT ON public.profissionais
FOR EACH ROW EXECUTE FUNCTION public.enforce_profissionais_identity_insert();
