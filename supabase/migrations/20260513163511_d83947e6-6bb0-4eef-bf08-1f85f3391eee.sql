-- Insert 3-meal templates
INSERT INTO public.menu_templates (name, level, meal_count, meal_structure) VALUES
('3 Refeições - Intermediário', 'intermediario', 3, '[
  {"nome": "Café da Manhã", "itens": ["Ovos inteiros", "Clara de ovo", "Pão integral", "Fruta"]},
  {"nome": "Almoço", "itens": ["Arroz", "Feijão", "Carne magra", "Salada", "Legumes"]},
  {"nome": "Jantar", "itens": ["Mandioca", "Frango grelhado", "Salada verde"]}
]'),
('3 Refeições - Avançado', 'avancado', 3, '[
  {"nome": "Refeição 1", "itens": ["Ovos inteiros", "Clara de ovo", "Aveia", "Pasta de amendoim"]},
  {"nome": "Refeição 2", "itens": ["Arroz branco", "Patinho moído", "Brócolis", "Azeite"]},
  {"nome": "Refeição 3", "itens": ["Batata doce", "Frango grelhado", "Legumes"]}
]');

-- Insert 5-meal templates
INSERT INTO public.menu_templates (name, level, meal_count, meal_structure) VALUES
('5 Refeições - Intermediário', 'intermediario', 5, '[
  {"nome": "Café da Manhã", "itens": ["Ovos inteiros", "Clara de ovo", "Pão integral"]},
  {"nome": "Almoço", "itens": ["Arroz", "Feijão", "Frango grelhado", "Salada"]},
  {"nome": "Lanche da Tarde", "itens": ["Iogurte natural", "Fruta"]},
  {"nome": "Jantar", "itens": ["Batata", "Carne moída", "Legumes"]},
  {"nome": "Ceia", "itens": ["Whey protein", "Castanhas"]}
]'),
('5 Refeições - Avançado', 'avancado', 5, '[
  {"nome": "Refeição 1", "itens": ["Ovos inteiros", "Clara de ovo", "Banana", "Aveia"]},
  {"nome": "Refeição 2 (Almoço)", "itens": ["Arroz integral", "Patinho moído", "Legumes"]},
  {"nome": "Refeição 3 (Pré-Treino)", "itens": ["Pão integral", "Frango desfiado"]},
  {"nome": "Refeição 4 (Pós-Treino)", "itens": ["Arroz branco", "Frango grelhado"]},
  {"nome": "Refeição 5 (Ceia)", "itens": ["Abacate", "Whey protein"]}
]');
