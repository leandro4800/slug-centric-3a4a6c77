-- Trigger para criar perfil automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfis (id, email, nome_completo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Tenant demo (tema Netflix)
INSERT INTO public.tenants (slug, nome, tagline, primary_hsl, accent_hsl)
VALUES (
  'demo',
  'Alpha Coach Demo',
  'O sistema operacional dos coaches de elite.',
  '357 92% 47%',
  '357 92% 47%'
)
ON CONFLICT (slug) DO NOTHING;