ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS theme_overrides JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.tenants.theme_overrides IS 'Tokens de tema customizados por tenant. Ex: {"global_bg":"270 50% 20%","button_play":"45 96% 56%","login_bg_url":"..."}';