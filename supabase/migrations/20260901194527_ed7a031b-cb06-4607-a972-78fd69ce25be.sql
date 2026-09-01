ALTER TABLE public.dojo_conteudos
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS capa_url text;

CREATE INDEX IF NOT EXISTS dojo_conteudos_tenant_mod_idx
  ON public.dojo_conteudos (tenant_id, modalidade, nivel, ordem);