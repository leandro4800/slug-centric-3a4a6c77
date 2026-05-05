import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useLocation, useParams } from "react-router-dom";
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

const DEFAULTS = {
  primary: "355 100% 48%",
  primary_glow: "355 100% 60%",
  accent: "355 100% 48%",
  background: "0 0% 0%",
};

const TOKEN_TO_VAR: Record<keyof typeof DEFAULTS, string[]> = {
  primary: ["--primary", "--ring", "--sidebar-primary", "--sidebar-ring"],
  primary_glow: ["--primary-glow"],
  accent: ["--accent"],
  background: ["--background"],
};

const SAFE_KEYS: (keyof typeof DEFAULTS)[] = ["primary", "primary_glow", "accent", "background"];

const clearTokens = (root: HTMLElement) => {
  Object.values(TOKEN_TO_VAR).flat().forEach((v) => root.style.removeProperty(v));
  root.style.removeProperty("--hero-url");
};

// Referência global para evitar re-aplicar o mesmo tema e causar flicker
let lastAppliedKey = "";

export const applyTheme = (overrides: ThemeOverrides | null | undefined, heroUrl?: string | null, force = false) => {
  const root = document.documentElement;
  const currentKey = JSON.stringify({ overrides, heroUrl });
  
  if (!force && currentKey === lastAppliedKey) return;
  lastAppliedKey = currentKey;

  if (!overrides && !heroUrl) {
    clearTokens(root);
    return;
  }

  const merged = { ...DEFAULTS, ...overrides };
  SAFE_KEYS.forEach((k) => {
    const value = merged[k];
    if (!value) return;
    TOKEN_TO_VAR[k].forEach((v) => {
      // Só altera se o valor for diferente para evitar reflows desnecessários
      if (root.style.getPropertyValue(v) !== value) {
        root.style.setProperty(v, value);
      }
    });
  });

  if (heroUrl) {
    const urlValue = `url(${heroUrl})`;
    if (root.style.getPropertyValue("--hero-url") !== urlValue) {
      root.style.setProperty("--hero-url", urlValue);
    }
  } else {
    root.style.removeProperty("--hero-url");
  }
};

const TENANT_PUBLIC_COLUMNS =
  "id, slug, nome, tagline, logo_url, hero_url, symbol_url, primary_hsl, accent_hsl, theme_overrides, cidade, estado, permite_aula_avulsa, preco_aula_avulsa";

const CACHE_KEY = (slug: string) => `branding:${slug}`;

const readCache = (slug: string): { overrides: ThemeOverrides | null; hero: string | null } | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY(slug));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const writeCache = (slug: string, overrides: ThemeOverrides | null, hero: string | null) => {
  try { localStorage.setItem(CACHE_KEY(slug), JSON.stringify({ overrides, hero })); } catch {}
};

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const params = useParams<{ slug: string }>();
  const location = useLocation();
  
  // Extrai o slug do path se useParams falhar (comum se o Provider estiver acima das Routes)
  const pathParts = location.pathname.split("/").filter(Boolean);
  const reservedKeywords = ["marketplace", "seja-coach", "login", "forgot-password", "reset-password", "checkout", "onboarding", "admin", "unsubscribe"];
  const slugFromPath = pathParts.length > 0 && !reservedKeywords.includes(pathParts[0]) ? pathParts[0] : null;
  const slug = params.slug || slugFromPath;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);
  const lastLoadedSlug = useRef<string | null>(null);

  const load = async (targetSlug: string | null) => {
    if (!targetSlug) {
      if (isMountedRef.current) {
        setTenant(null);
        setLoading(false);
        applyTheme(null, null);
      }
      lastLoadedSlug.current = null;
      return;
    }

    if (lastLoadedSlug.current === targetSlug && tenant) {
      setLoading(false);
      return;
    }

    lastLoadedSlug.current = targetSlug;

    // 1) Aplica IMEDIATAMENTE o tema cacheado
    const cached = readCache(targetSlug);
    if (cached) {
      applyTheme(cached.overrides, cached.hero);
    }

    // 2) Busca dados atualizados
    const { data, error } = await supabase
      .from("tenants")
      .select(TENANT_PUBLIC_COLUMNS)
      .eq("slug", targetSlug)
      .maybeSingle();

    if (!isMountedRef.current) return;
    
    if (error) {
      console.warn("[Branding] erro:", error.message);
      setLoading(false);
      return;
    }

    const t = data as Tenant | null;
    setTenant(t);
    const overrides = (t?.theme_overrides as ThemeOverrides | null) ?? null;
    applyTheme(overrides, t?.hero_url);
    writeCache(targetSlug, overrides, t?.hero_url ?? null);
    setLoading(false);
  };

  const applyPreview = (overrides: ThemeOverrides) => {
    const merged = { ...(tenant?.theme_overrides || {}), ...overrides };
    applyTheme(merged, tenant?.hero_url, true);
  };
  
  const clearPreview = () => applyTheme(tenant?.theme_overrides as ThemeOverrides | null, tenant?.hero_url, true);

  useEffect(() => {
    isMountedRef.current = true;
    void load(slug);
    return () => {
      // NÃO limpamos isMountedRef aqui se o provider for global, 
      // mas se ele unmountar (ex: logout total), limpamos.
    };
  }, [slug]);

  return (
    <BrandingContext.Provider value={{ tenant, loading, refresh: () => load(slug), applyPreview, clearPreview }}>
      {children}
    </BrandingContext.Provider>
  );
};
