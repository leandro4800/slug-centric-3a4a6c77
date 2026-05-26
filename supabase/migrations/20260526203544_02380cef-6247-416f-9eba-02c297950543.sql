
ALTER TABLE public.coach_marketing_config
  ADD COLUMN IF NOT EXISTS template text DEFAULT 'biografia',
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS subheadline text,
  ADD COLUMN IF NOT EXISTS cta_text text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS location_text text,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS topic5_label text,
  ADD COLUMN IF NOT EXISTS topic5_icon text,
  ADD COLUMN IF NOT EXISTS topic6_label text,
  ADD COLUMN IF NOT EXISTS topic6_icon text,
  ADD COLUMN IF NOT EXISTS accent_secondary text;
