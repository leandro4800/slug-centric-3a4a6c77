INSERT INTO public.planos (tenant_id, nome, descricao, preco_centavos, intervalo, ordem, ativo)
SELECT 
  tenant_id, 
  CASE WHEN upper(nome) LIKE '%MENSAL%' THEN replace(upper(nome), 'MENSAL', 'SEMESTRAL') ELSE nome || ' - Semestral' END,
  COALESCE(descricao, '') || E'\n\nPlano semestral com desconto equivalente a ~10% sobre 6 meses.',
  round(preco_centavos * 5.4)::int,
  'semestral'::public.plano_intervalo,
  2,
  true
FROM public.planos 
WHERE intervalo = 'mensal' 
  AND tenant_id NOT IN (SELECT tenant_id FROM public.planos WHERE intervalo = 'semestral');