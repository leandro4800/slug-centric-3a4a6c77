
-- Enable RLS
ALTER TABLE public.refeicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_refeicao ENABLE ROW LEVEL SECURITY;

-- Dietas: complete policies
CREATE POLICY "Usuários atualizam suas dietas" ON public.dietas
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários deletam suas dietas" ON public.dietas
  FOR DELETE USING (auth.uid() = user_id);

-- Refeicoes policies (via dieta ownership)
CREATE POLICY "Usuários veem refeições das suas dietas" ON public.refeicoes
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.dietas d WHERE d.id = refeicoes.dieta_id AND d.user_id = auth.uid()));
CREATE POLICY "Usuários inserem refeições em suas dietas" ON public.refeicoes
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.dietas d WHERE d.id = refeicoes.dieta_id AND d.user_id = auth.uid()));
CREATE POLICY "Usuários atualizam refeições suas" ON public.refeicoes
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.dietas d WHERE d.id = refeicoes.dieta_id AND d.user_id = auth.uid()));
CREATE POLICY "Usuários deletam refeições suas" ON public.refeicoes
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.dietas d WHERE d.id = refeicoes.dieta_id AND d.user_id = auth.uid()));

-- Itens refeicao policies
CREATE POLICY "Usuários veem itens das suas refeições" ON public.itens_refeicao
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.refeicoes r JOIN public.dietas d ON d.id = r.dieta_id WHERE r.id = itens_refeicao.refeicao_id AND d.user_id = auth.uid()));
CREATE POLICY "Usuários inserem itens em suas refeições" ON public.itens_refeicao
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.refeicoes r JOIN public.dietas d ON d.id = r.dieta_id WHERE r.id = itens_refeicao.refeicao_id AND d.user_id = auth.uid()));
CREATE POLICY "Usuários atualizam itens suas" ON public.itens_refeicao
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.refeicoes r JOIN public.dietas d ON d.id = r.dieta_id WHERE r.id = itens_refeicao.refeicao_id AND d.user_id = auth.uid()));
CREATE POLICY "Usuários deletam itens suas" ON public.itens_refeicao
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.refeicoes r JOIN public.dietas d ON d.id = r.dieta_id WHERE r.id = itens_refeicao.refeicao_id AND d.user_id = auth.uid()));
