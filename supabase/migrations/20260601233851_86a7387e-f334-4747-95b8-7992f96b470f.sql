ALTER TABLE public.coach_platform_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_coach_platform_subs_stripe_customer
  ON public.coach_platform_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_coach_platform_subs_stripe_subscription
  ON public.coach_platform_subscriptions(stripe_subscription_id);