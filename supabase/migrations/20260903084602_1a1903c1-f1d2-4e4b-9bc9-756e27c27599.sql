UPDATE public.treinos_prescritos tp
SET referencia_exercicio_id = r.id
FROM public.referencia_exercicios r
WHERE tp.referencia_exercicio_id IS NULL
  AND r.url_video IS NOT NULL
  AND (r.tenant_id = tp.tenant_id OR r.tenant_id IS NULL)
  AND public.normalizar_nome_exercicio(r.nome_exercicio) = public.normalizar_nome_exercicio(tp.exercicio)
  AND public.normalizar_nome_exercicio(tp.exercicio) <> '';