INSERT INTO public.biblioteca_metodologia_pacho (
  nome_exercicio, 
  descricao_metodologia, 
  nivel, 
  frequencia_semanal, 
  enfase, 
  estrutura_json
)
VALUES 
(
  'TREINO ADAPTAÇÃO MUSCULAR', 
  'Primeira etapa de treino para iniciantes. Objetivo: coordenação e consciência muscular.', 
  '2', 
  2, 
  'Geral', 
  '{
    "exercicios": [
      {"nome": "Supino reto", "series": "3 x 10 a 15", "intervalo": "1 min"},
      {"nome": "Leg 45", "series": "3 x 10 a 15", "intervalo": "1 min"},
      {"nome": "Pulley frente triângulo", "series": "3 x 10 a 15", "intervalo": "1 min"},
      {"nome": "Flexor deitado", "series": "3 x 10 a 15", "intervalo": "1 min"}
    ]
  }'
),
(
  'TREINO INICIANTES Membros Superiores', 
  'Terceira etapa - Foco em membros superiores.', 
  '2', 
  4, 
  'Superiores', 
  '{
    "exercicios": [
      {"nome": "Supino inclinado", "series": "3 x 10 a 15", "intervalo": "1 min"},
      {"nome": "Supino reto", "series": "3 x 10 a 15", "intervalo": "1 min"},
      {"nome": "Pulley frente aberto", "series": "3 x 10 a 15", "intervalo": "1 min"},
      {"nome": "Remada baixa triangulo", "series": "3 x 10 a 15", "intervalo": "1 min"}
    ]
  }'
);
