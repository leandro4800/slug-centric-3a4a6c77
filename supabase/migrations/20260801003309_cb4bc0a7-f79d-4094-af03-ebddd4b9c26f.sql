CREATE TABLE public.theme_presets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  subtitulo text,
  swatches jsonb NOT NULL DEFAULT '[]'::jsonb,
  primary_hsl text NOT NULL,
  primary_glow_hsl text,
  primary_foreground_hsl text,
  accent_hsl text,
  accent_foreground_hsl text,
  border_hsl text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.theme_presets TO anon;
GRANT SELECT ON public.theme_presets TO authenticated;
GRANT ALL ON public.theme_presets TO service_role;

ALTER TABLE public.theme_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Temas visiveis para todos"
ON public.theme_presets FOR SELECT
USING (true);

CREATE POLICY "Somente admin gerencia temas"
ON public.theme_presets FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER theme_presets_updated_at
BEFORE UPDATE ON public.theme_presets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.theme_presets
  (codigo, nome, subtitulo, swatches, primary_hsl, primary_glow_hsl, primary_foreground_hsl, accent_hsl, accent_foreground_hsl, ordem)
VALUES
  ('ferrari','FERRARI BLACK','Padrão · Vermelho & Preto','["#000000","#0A0A0A","#E10600","#FAFAFA"]','355 100% 48%','355 100% 60%','0 0% 100%','355 100% 48%','0 0% 100%',1),
  ('cimento','CIMENTO','Industrial · Concreto & Detalhes','["#9A9A9A","#FFFFFF","#E10600","#000000"]','0 0% 75%','0 0% 90%','0 0% 5%','0 0% 100%','0 0% 0%',2),
  ('gold-rush','BLACK GOLD','Luxo · Dourado','["#101010","#2F2F2F","#FFD700","#FFFACD"]','45 100% 50%','45 100% 80%','0 0% 8%','44 85% 50%','0 0% 8%',3),
  ('tech-titanium','TECH TITANIUM','Performance · Azul Elétrico','["#121417","#1C1F28","#007BFF","#FFFFFF"]','212 100% 50%','212 100% 65%','0 0% 100%','212 100% 50%','0 0% 100%',4),
  ('deep-sea-glass','DEEP SEA GLASS','Moderno & Fluido','["#0F172A","#1E293B","#7DD3FC","#FEFFEF"]','199 89% 74%','199 89% 85%','222 47% 11%','199 89% 74%','222 47% 11%',5),
  ('nordic-minimalist','NORDIC SILVER','Limpo & Sofisticado','["#FBF9FA","#212529","#A9A9A9","#000000"]','210 8% 72%','210 8% 88%','210 11% 12%','210 8% 72%','210 11% 12%',6),
  ('army-stealth','ARMY STEALTH','Tático · Verde Militar','["#1A1C14","#2D3021","#4B5320","#D1D5B8"]','72 45% 38%','72 45% 52%','60 30% 96%','72 45% 38%','60 30% 96%',7),
  ('desert-storm','DESERT STORM','Ação · Areia & Cinza','["#2B2824","#3D3934","#C2B280","#F5F5DC"]','45 38% 63%','45 38% 80%','30 10% 12%','45 38% 63%','30 10% 12%',8),
  ('midnight-neon','MIDNIGHT NEON','Cyberpunk · Roxo & Preto','["#000000","#12001F","#BC13FE","#FFFFFF"]','282 100% 54%','282 100% 75%','0 0% 100%','282 100% 54%','0 0% 100%',9),
  ('black-flow','BLACK FLOW','Cinematográfico · Dark & Red','["#000000","#1A1A1A","#E10600","#FFFFFF"]','0 84% 45%','0 84% 60%','0 0% 100%','0 84% 45%','0 0% 100%',10);