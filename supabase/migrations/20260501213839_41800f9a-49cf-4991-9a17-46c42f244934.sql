ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS cidade TEXT,
ADD COLUMN IF NOT EXISTS estado TEXT,
ADD COLUMN IF NOT EXISTS permite_aula_avulsa BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS preco_aula_avulsa NUMERIC(10, 2);

-- Update RLS if needed (tenants are usually public select)
-- Assuming existing policies allow viewing these new columns since they are on the tenants table.