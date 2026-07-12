
INSERT INTO public.coach_platform_subscriptions (user_id, tenant_id, plan_tier, status, full_price, first_payment_value, current_period_end)
VALUES
  ('3c40d11c-1560-462f-8918-a924cfe8686c','6c4ff89c-3d9f-4225-ae95-5bf1dbf35886','pro','active',0,0, now() + interval '100 years'),
  ('692a1b44-4f07-49a5-baa6-6903a2d8f859','5996d70b-9293-4c49-b143-42a4b60af267','pro','active',0,0, now() + interval '100 years'),
  ('be44bc4e-128e-463b-9c27-cbf4b41ceb66','8c64bb80-9bed-45ff-bc0a-f4d1a2841d1c','pro','active',0,0, now() + interval '100 years')
ON CONFLICT (user_id) DO UPDATE
  SET status='active',
      plan_tier='pro',
      tenant_id=EXCLUDED.tenant_id,
      current_period_end = now() + interval '100 years',
      updated_at = now();
