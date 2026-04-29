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

// Tema "Netflix" padrão para TODOS os tenants:
// vermelho #E50914 ≈ HSL(357 92% 47%), branco e preto.
const NETFLIX_PRIMARY = "357 92% 47%";
const NETFLIX_PRIMARY_GLOW = "357 92% 60%";
const NETFLIX_ACCENT = "357 92% 47%";

const applyVars = (tenant: Tenant | null, _slug?: string) => {
  const root = document.documentElement;
  // Força padrão Netflix em toda a aplicação, ignorando cores customizadas do tenant
  root.style.setProperty("--primary", NETFLIX_PRIMARY);
  root.style.setProperty("--primary-foreground", "0 0% 100%");
  root.style.setProperty("--primary-glow", NETFLIX_PRIMARY_GLOW);
  root.style.setProperty("--ring", NETFLIX_PRIMARY);
  root.style.setProperty("--accent", NETFLIX_ACCENT);
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
