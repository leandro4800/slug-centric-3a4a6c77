CREATE TABLE public.menu_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL CHECK (level IN ('iniciante', 'intermediario', 'avancado')),
    name TEXT NOT NULL,
    meal_structure JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.menu_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates are viewable by everyone" 
ON public.menu_templates FOR SELECT 
USING (true);

-- Insert Iniciante Models
INSERT INTO public.menu_templates (level, name, meal_structure) VALUES 
('iniciante', 'Modelo 1 - Iniciante', '[
    {"nome": "Café da Manhã", "itens": ["Ovos mexidos", "Pão integral", "Queijo branco", "Banana", "Café sem açúcar"]},
    {"nome": "Lanche da Manhã", "itens": ["Banana", "Castanhas"]},
    {"nome": "Almoço", "itens": ["Arroz branco", "Feijão", "Peito de frango grelhado", "Salada verde", "Legumes cozidos"]},
    {"nome": "Lanche da Tarde", "itens": ["Sanduíche integral", "Peito de peru", "Queijo branco"]},
    {"nome": "Jantar", "itens": ["Arroz branco", "Frango grelhado", "Legumes salteados"]},
    {"nome": "Ceia", "itens": ["Iogurte natural", "Castanhas"]}
]'),
('iniciante', 'Modelo 2 - Iniciante', '[
    {"nome": "Café da Manhã", "itens": ["Iogurte natural", "Pão integral", "Morango", "Ovos mexidos"]},
    {"nome": "Lanche da Manhã", "itens": ["Iogurte proteico", "Maçã"]},
    {"nome": "Almoço", "itens": ["Purê de batata", "Carne moída magra", "Brócolis", "Cenoura"]},
    {"nome": "Lanche da Tarde", "itens": ["Iogurte natural", "Banana", "Aveia"]},
    {"nome": "Jantar", "itens": ["Omelete de legumes", "Batata inglesa cozida"]},
    {"nome": "Ceia", "itens": ["Whey protein", "Pasta de amendoim"]}
]'),
('iniciante', 'Modelo 3 - Iniciante', '[
    {"nome": "Café da Manhã", "itens": ["Tapioca", "Frango desfiado", "Mamão", "Café sem açúcar"]},
    {"nome": "Lanche da Manhã", "itens": ["Shake de whey protein", "Aveia"]},
    {"nome": "Almoço", "itens": ["Macarrão integral", "Frango grelhado", "Molho de tomate natural", "Salada verde"]},
    {"nome": "Lanche da Tarde", "itens": ["Tapioca", "Ovo mexido"]},
    {"nome": "Jantar", "itens": ["Tilápia grelhada", "Purê de mandioca", "Salada verde"]},
    {"nome": "Ceia", "itens": ["Queijo cottage", "Morangos"]}
]');

-- Insert Intermediario Models
INSERT INTO public.menu_templates (level, name, meal_structure) VALUES 
('intermediario', 'Modelo 1 - Intermediário', '[
    {"nome": "Café da Manhã", "itens": ["Ovos mexidos", "Pão integral", "Banana", "Café sem açúcar"]},
    {"nome": "Lanche da Manhã", "itens": ["Iogurte natural", "Aveia"]},
    {"nome": "Almoço", "itens": ["Arroz integral", "Feijão", "Frango grelhado", "Salada"]},
    {"nome": "Pré-Treino", "itens": ["Banana", "Pasta de amendoim"]},
    {"nome": "Pós-Treino", "itens": ["Whey protein", "Banana"]},
    {"nome": "Jantar", "itens": ["Batata doce", "Carne moída", "Brócolis"]},
    {"nome": "Ceia", "itens": ["Iogurte natural", "Castanhas"]}
]'),
('intermediario', 'Modelo 2 - Intermediário', '[
    {"nome": "Café da Manhã", "itens": ["Tapioca", "Ovo mexido", "Mamão"]},
    {"nome": "Lanche da Manhã", "itens": ["Maçã", "Castanhas"]},
    {"nome": "Almoço", "itens": ["Arroz branco", "Feijão", "Patinho moído", "Cenoura", "Salada"]},
    {"nome": "Pré-Treino", "itens": ["Pão integral", "Frango desfiado"]},
    {"nome": "Pós-Treino", "itens": ["Whey protein", "Aveia"]},
    {"nome": "Jantar", "itens": ["Mandioca cozida", "Tilápia grelhada", "Legumes"]},
    {"nome": "Ceia", "itens": ["Queijo branco", "Amendoim"]}
]'),
('intermediario', 'Modelo 3 - Intermediário', '[
    {"nome": "Café da Manhã", "itens": ["Aveia", "Banana", "Pasta de amendoim", "Ovos cozidos"]},
    {"nome": "Lanche da Manhã", "itens": ["Iogurte natural", "Maçã"]},
    {"nome": "Almoço", "itens": ["Macarrão", "Frango grelhado", "Brócolis"]},
    {"nome": "Pré-Treino", "itens": ["Tapioca", "Ovo mexido"]},
    {"nome": "Pós-Treino", "itens": ["Arroz branco", "Frango grelhado"]},
    {"nome": "Jantar", "itens": ["Batata inglesa", "Carne moída", "Salada verde"]},
    {"nome": "Ceia", "itens": ["Leite", "Castanhas"]}
]');

-- Insert Avancado Models
INSERT INTO public.menu_templates (level, name, meal_structure) VALUES 
('avancado', 'Modelo 1 - Avançado', '[
    {"nome": "Café da Manhã", "itens": ["Claras + ovos inteiros", "Aveia", "Banana", "Pasta de amendoim"]},
    {"nome": "Lanche da Manhã", "itens": ["Iogurte natural", "Castanhas"]},
    {"nome": "Almoço", "itens": ["Arroz integral", "Frango grelhado", "Brócolis", "Azeite"]},
    {"nome": "Pré-Treino", "itens": ["Batata doce", "Frango desfiado"]},
    {"nome": "Pós-Treino", "itens": ["Arroz branco", "Frango grelhado"]},
    {"nome": "Jantar", "itens": ["Tilápia grelhada", "Mandioca", "Salada verde"]},
    {"nome": "Ceia", "itens": ["Whey protein", "Pasta de amendoim"]}
]'),
('avancado', 'Modelo 2 - Avançado', '[
    {"nome": "Café da Manhã", "itens": ["Tapioca", "Ovos mexidos", "Banana"]},
    {"nome": "Lanche da Manhã", "itens": ["Maçã", "Amendoim"]},
    {"nome": "Almoço", "itens": ["Arroz branco", "Patinho moído", "Feijão", "Brócolis"]},
    {"nome": "Pré-Treino", "itens": ["Banana", "Aveia"]},
    {"nome": "Pós-Treino", "itens": ["Whey protein", "Arroz branco"]},
    {"nome": "Jantar", "itens": ["Batata doce", "Frango grelhado", "Abobrinha"]},
    {"nome": "Ceia", "itens": ["Iogurte natural", "Castanhas"]}
]'),
('avancado', 'Modelo 3 - Avançado', '[
    {"nome": "Café da Manhã", "itens": ["Aveia", "Ovos cozidos", "Mamão"]},
    {"nome": "Lanche da Manhã", "itens": ["Iogurte natural", "Banana"]},
    {"nome": "Almoço", "itens": ["Macarrão", "Frango grelhado", "Salada verde"]},
    {"nome": "Pré-Treino", "itens": ["Tapioca", "Frango desfiado"]},
    {"nome": "Pós-Treino", "itens": ["Arroz branco", "Tilápia grelhada"]},
    {"nome": "Jantar", "itens": ["Batata inglesa", "Carne moída", "Brócolis"]},
    {"nome": "Ceia", "itens": ["Leite", "Pasta de amendoim"]}
]');
