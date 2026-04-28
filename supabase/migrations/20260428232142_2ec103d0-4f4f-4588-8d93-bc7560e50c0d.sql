-- ============ ENUM ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'coach', 'aluno');

-- ============ TENANTS ============
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  tagline TEXT,
  logo_url TEXT,
  hero_url TEXT,
  primary_hsl TEXT NOT NULL DEFAULT '0 84% 55%',
  accent_hsl TEXT NOT NULL DEFAULT '45 96% 56%',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tenants_slug ON public.tenants(slug);

-- ============ PERFIS ============
CREATE TABLE public.perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  nome_completo TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_perfis_tenant ON public.perfis(tenant_id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id, role)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- ============ HAS_ROLE FUNCTION ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role, _tenant_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (_tenant_id IS NULL OR tenant_id = _tenant_id)
  )
$$;

-- ============ TIMESTAMP TRIGGER ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_perfis_updated BEFORE UPDATE ON public.perfis
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ AUTO-CREATE PERFIL ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfis (id, email, nome_completo)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'nome_completo');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS ============
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Tenants: leitura pública (branding white-label)
CREATE POLICY "tenants_public_read" ON public.tenants FOR SELECT USING (true);
CREATE POLICY "tenants_coach_update" ON public.tenants FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'coach', id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tenants_admin_insert" ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Perfis
CREATE POLICY "perfis_self_read" ON public.perfis FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'coach', tenant_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "perfis_self_update" ON public.perfis FOR UPDATE TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "perfis_self_insert" ON public.perfis FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Roles
CREATE POLICY "roles_self_read" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coach', tenant_id));
CREATE POLICY "roles_admin_manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coach', tenant_id))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coach', tenant_id));

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "branding_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'branding');
CREATE POLICY "branding_coach_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branding' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coach')));
CREATE POLICY "branding_coach_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'branding' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coach')));

CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
CREATE POLICY "avatars_self_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_self_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============ SEED TENANT DEMO ============
INSERT INTO public.tenants (slug, nome, tagline, primary_hsl, accent_hsl)
VALUES ('demo', 'Demo Team', 'Treine como um campeão', '0 84% 55%', '45 96% 56%');