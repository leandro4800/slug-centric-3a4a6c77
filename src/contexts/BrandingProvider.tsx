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

const applyVars = (tenant: Tenant | null) => {
  const root = document.documentElement;
  root.style.setProperty("--primary", tenant?.primary_hsl || DEFAULT_PRIMARY);
  root.style.setProperty("--ring", tenant?.primary_hsl || DEFAULT_PRIMARY);
  root.style.setProperty("--accent", tenant?.accent_hsl || DEFAULT_ACCENT);
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
    applyVars(data);
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
