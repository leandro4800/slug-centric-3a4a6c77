ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS is_partner boolean NOT NULL DEFAULT false;
UPDATE public.tenants SET is_partner = true WHERE slug = 'metodojackson';