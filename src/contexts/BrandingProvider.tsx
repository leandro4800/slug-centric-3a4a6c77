import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export type ThemeOverrides = Partial<{
  primary: string;
  primary_glow: string;
  accent: string;
  background: string;
  card: string;
  foreground: string;
  border: string;
}>;

export interface Tenant {
  id: string;
  slug: string;
  nome: string;
  tagline: string | null;
  logo_url: string | null;
  hero_url: string | null;
  symbol_url: string | null;
  primary_hsl: string;
  accent_hsl: string;
  theme_overrides: ThemeOverrides | null;
  cidade: string | null;
  estado: string | null;
  permite_aula_avulsa: boolean | null;
  preco_aula_avulsa: number | null;
}

interface BrandingContextValue {
  tenant: Tenant | null;
  loading: boolean;
  refresh: () => Promise<void>;
  // Preview ao vivo (não persiste): aplica overrides instantâneos
  applyPreview: (overrides: ThemeOverrides) => void;
  clearPreview: () => void;
}

const BrandingContext = createContext<BrandingContextValue>({
  tenant: null,
  loading: true,
  refresh: async () => {},
  applyPreview: () => {},
  clearPreview: () => {},
});

export const useBranding = () => useContext(BrandingContext);

// Defaults Premium Ferrari / Absolute Black
const DEFAULTS = {
  primary: "355 100% 48%", // Ferrari Red
  primary_glow: "355 100% 60%",
  accent: "355 100% 48%", // Ferrari Red (Matched by default)
  background: "0 0% 0%", // Absolute Black
  card: "0 0% 3%",
  foreground: "0 0% 98%",
  border: "0 0% 15%",
};

const TOKEN_TO_VAR: Record<keyof typeof DEFAULTS, string[]> = {
  primary: ["--primary", "--ring", "--sidebar-primary", "--sidebar-ring"],
  primary_glow: ["--primary-glow"],
  accent: ["--accent"],
  background: ["--background"],
  card: ["--card", "--popover"],
  foreground: ["--foreground", "--card-foreground", "--popover-foreground"],
  border: ["--border", "--sidebar-border"],
};

export const applyTheme = (overrides: ThemeOverrides | null | undefined, heroUrl?: string | null) => {
  const root = document.documentElement;
  const merged = { ...DEFAULTS, ...(overrides || {}) };
  (Object.keys(merged) as (keyof typeof DEFAULTS)[]).forEach((k) => {
    const value = merged[k];
    if (!value) return;
    TOKEN_TO_VAR[k].forEach((v) => root.style.setProperty(v, value));
  });
  if (heroUrl) root.style.setProperty("--hero-url", `url(${heroUrl})`);
  else root.style.removeProperty("--hero-url");
};

const TENANT_PUBLIC_COLUMNS =
  "id, slug, nome, tagline, logo_url, hero_url, symbol_url, primary_hsl, accent_hsl, theme_overrides, cidade, estado, permite_aula_avulsa, preco_aula_avulsa";

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const { slug } = useParams<{ slug: string }>();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!slug) {
      applyTheme(null);
      setTenant(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("tenants")
      .select(TENANT_PUBLIC_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();
    if (error) console.warn("[Branding] erro:", error.message);
    const t = data as Tenant | null;
    setTenant(t);
    applyTheme(t?.theme_overrides as ThemeOverrides | null, t?.hero_url);
    setLoading(false);
  };

  const applyPreview = (overrides: ThemeOverrides) => {
    const merged = { ...(tenant?.theme_overrides || {}), ...overrides };
    applyTheme(merged, tenant?.hero_url);
  };
  const clearPreview = () => applyTheme(tenant?.theme_overrides as ThemeOverrides | null, tenant?.hero_url);

  useEffect(() => {
    void load();
    return () => applyTheme(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <BrandingContext.Provider value={{ tenant, loading, refresh: load, applyPreview, clearPreview }}>
      {children}
    </BrandingContext.Provider>
  );
};
