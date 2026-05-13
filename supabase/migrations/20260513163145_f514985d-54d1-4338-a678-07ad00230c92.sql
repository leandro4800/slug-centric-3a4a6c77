-- Add meal_count to menu_templates
ALTER TABLE public.menu_templates ADD COLUMN IF NOT EXISTS meal_count integer DEFAULT 6;

-- Update existing templates to 6 meals (default)
UPDATE public.menu_templates SET meal_count = 6 WHERE meal_count IS NULL;

-- Insert 4-meal templates with the requested structure (Scrambled eggs with clear distinction)
-- Note: 'Claras + ovos inteiros' is explicitly requested.

INSERT INTO public.menu_templates (name, level, meal_count, meal_structure) VALUES
('4 Refeições - Hipertrofia (Ovos no Café)', 'intermediario', 4, '[
  {"nome": "Café da Manhã", "itens": ["Ovos inteiros", "Clara de ovo", "Pão integral", "Fruta"]},
  {"nome": "Almoço", "itens": ["Arroz", "Feijão", "Frango grelhado", "Salada"]},
  {"nome": "Lanche da Tarde", "itens": ["Iogurte natural", "Aveia", "Fruta"]},
  {"nome": "Jantar", "itens": ["Batata", "Carne moída", "Legumes"]}
]'),
('4 Refeições - Avançado (Ovos no Café)', 'avancado', 4, '[
  {"nome": "Café da Manhã", "itens": ["Ovos inteiros", "Clara de ovo", "Aveia", "Banana"]},
  {"nome": "Almoço", "itens": ["Arroz", "Frango grelhado", "Brócolis", "Azeite"]},
  {"nome": "Lanche / Pré-Treino", "itens": ["Pão integral", "Frango desfiado", "Fruta"]},
  {"nome": "Jantar / Pós-Treino", "itens": ["Arroz branco", "Carne moída", "Legumes"]}
]'),
('4 Refeições - Iniciante (Ovos no Café)', 'iniciante', 4, '[
  {"nome": "Café da Manhã", "itens": ["Ovos inteiros", "Clara de ovo", "Pão integral"]},
  {"nome": "Almoço", "itens": ["Arroz", "Feijão", "Frango", "Salada"]},
  {"nome": "Lanche da Tarde", "itens": ["Fruta", "Iogurte"]},
  {"nome": "Jantar", "itens": ["Frango", "Batata", "Legumes"]}
]');
