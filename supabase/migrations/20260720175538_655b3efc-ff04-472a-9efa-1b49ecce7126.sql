ALTER TABLE public.avaliacoes_fisicas
  ADD COLUMN IF NOT EXISTS ia_estimativa_dobras JSONB,
  ADD COLUMN IF NOT EXISTS ia_estimativa_soma_mm NUMERIC,
  ADD COLUMN IF NOT EXISTS ia_estimativa_bf_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS ia_estimativa_prompt TEXT,
  ADD COLUMN IF NOT EXISTS ia_estimativa_aviso TEXT,
  ADD COLUMN IF NOT EXISTS ia_estimativa_fonte_url TEXT;

INSERT INTO public.configuracoes_tenant (tenant_id, chave, valor)
SELECT
  t.id,
  'prompt_ia_7_dobras_visual',
  'Analise a imagem como se fosse um avaliador físico experiente. Faça apenas uma estimativa visual, deixando claro que não se trata de uma medição real com adipômetro. Estime os valores das 7 dobras cutâneas em milímetros (protocolo Jackson & Pollock para mulheres): peitoral, axilar média, tríceps, subescapular, abdominal, supra-ilíaca e coxa. Em seguida, informe a soma das 7 dobras e, se possível, apresente uma estimativa do percentual de gordura corporal baseada nesses valores, destacando que se trata apenas de uma aproximação visual e que a avaliação precisa exige medição com adipômetro realizada por um profissional'
FROM public.tenants t
ON CONFLICT (tenant_id, chave) DO UPDATE
SET valor = EXCLUDED.valor,
    updated_at = now();