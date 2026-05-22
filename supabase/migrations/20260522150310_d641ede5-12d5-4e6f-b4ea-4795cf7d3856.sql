-- Add Asaas columns to existing tables
ALTER TABLE public.planos ADD COLUMN IF NOT EXISTS asaas_id TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS asaas_wallet_id TEXT;
ALTER TABLE public.assinaturas ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
ALTER TABLE public.assinaturas ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT;

-- Index for faster lookups during webhooks
CREATE INDEX IF NOT EXISTS idx_planos_asaas_id ON public.planos(asaas_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_asaas_subscription_id ON public.assinaturas(asaas_subscription_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_asaas_customer_id ON public.assinaturas(asaas_customer_id);
