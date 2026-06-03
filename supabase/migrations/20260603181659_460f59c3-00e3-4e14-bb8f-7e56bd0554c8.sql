REVOKE SELECT (token) ON public.coach_automated_delivery FROM authenticated;
REVOKE SELECT (stripe_price_id, stripe_product_id) ON public.planos FROM anon;