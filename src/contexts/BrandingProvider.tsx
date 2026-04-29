import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
}

interface BrandingContextValue {
  tenant: Tenant | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue>({
  tenant: null,
  loading: true,
  refresh: async () => {},
});

export const useBranding = () => useContext(BrandingContext);

const DEFAULT_PRIMARY = "0 84% 55%";
const DEFAULT_ACCENT = "45 96% 56%";

// Tema "Netflix" travado para o tenant demo:
// vermelho #E50914 ≈ HSL(357 92% 47%) e texto branco
const DEMO_PRIMARY = "357 92% 47%";
const DEMO_ACCENT = "357 92% 47%";

const applyVars = (tenant: Tenant | null, slug?: string) => {
  const root = document.documentElement;
  const isDemo = slug === "demo";
  const primary = isDemo ? DEMO_PRIMARY : tenant?.primary_hsl || DEFAULT_PRIMARY;
  const accent = isDemo ? DEMO_ACCENT : tenant?.accent_hsl || DEFAULT_ACCENT;
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-foreground", "0 0% 100%");
  root.style.setProperty("--primary-glow", isDemo ? "357 92% 60%" : "0 90% 65%");
  root.style.setProperty("--ring", primary);
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--accent-foreground", "0 0% 100%");
  if (tenant?.hero_url) {
    root.style.setProperty("--hero-url", `url(${tenant.hero_url})`);
  } else {
    root.style.removeProperty("--hero-url");
  }
};

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const { slug } = useParams<{ slug: string }>();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!slug) {
      applyVars(null);
      setTenant(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) console.warn("[Branding] erro:", error.message);
    setTenant(data);
    applyVars(data, slug);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    return () => applyVars(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <BrandingContext.Provider value={{ tenant, loading, refresh: load }}>
      {children}
    </BrandingContext.Provider>
  );
};
