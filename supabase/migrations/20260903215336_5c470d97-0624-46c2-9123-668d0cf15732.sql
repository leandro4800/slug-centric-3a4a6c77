ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS theme_mode text NOT NULL DEFAULT 'escuro';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_theme_mode_check'
  ) THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_theme_mode_check CHECK (theme_mode IN ('escuro','suave'));
  END IF;
END $$;