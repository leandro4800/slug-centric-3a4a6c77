import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useLocation, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export type ThemeOverrides = Partial<{
  primary: string;
  primary_glow: string;
  primary_foreground: string;
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
  login_video_url: string | null;
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
  foreground: "0 0% 98%",
  primary_foreground: "0 0% 100%",
  card: "0 0% 3%",
  border: "0 0% 18%",
};

const TOKEN_TO_VAR: Record<keyof typeof DEFAULTS, string[]> = {
  primary: ["--primary", "--ring", "--sidebar-primary", "--sidebar-ring"],
  primary_glow: ["--primary-glow"],
  primary_foreground: ["--primary-foreground"],
  accent: ["--accent"],
  background: ["--background"],
  foreground: ["--foreground"],
  card: ["--card", "--sidebar-background"],
  border: ["--border", "--sidebar-border"],
};

const SAFE_KEYS = Object.keys(DEFAULTS) as (keyof typeof DEFAULTS)[];

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
  "id, slug, nome, tagline, logo_url, hero_url, symbol_url, primary_hsl, accent_hsl, theme_overrides, cidade, estado, permite_aula_avulsa, preco_aula_avulsa, login_video_url";

// O cache local foi desativado para garantir que o tema venha sempre do Supabase
const readCache = (slug: string) => {
  const cached = localStorage.getItem(`branding_${slug}`);
  return cached ? JSON.parse(cached) : null;
};
const writeCache = (slug: string, tenant: Tenant | null) => {
  if (tenant) {
    localStorage.setItem(`branding_${slug}`, JSON.stringify(tenant));
  } else {
    localStorage.removeItem(`branding_${slug}`);
  }
};

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const params = useParams<{ slug: string }>();
  const location = useLocation();
  
  // Extrai o slug do path se useParams falhar
  const pathParts = location.pathname.split("/").filter(Boolean);
  const reservedKeywords = ["marketplace", "seja-coach", "login", "forgot-password", "reset-password", "checkout", "onboarding", "admin", "unsubscribe"];
  const slugFromPath = pathParts.length > 0 && !reservedKeywords.includes(pathParts[0]) ? pathParts[0] : null;
  const slug = params.slug || slugFromPath;

  const [tenant, setTenant] = useState<Tenant | null>(() => (slug ? readCache(slug) : null));
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);
  const lastLoadedSlug = useRef<string | null>(null);
  const lastLoadedTenantId = useRef<string | null>(null);

  const load = async (targetSlug: string | null, force = false) => {
    console.log("[Branding] Iniciando load para slug:", targetSlug);
    if (targetSlug || force) {
      setLoading(true);
    }
    
    try {
      // Se não temos slug, tentamos buscar o tenant do usuário logado
      if (!targetSlug) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from("perfis")
            .select("tenant_id")
            .eq("id", session.user.id)
            .maybeSingle();
          
          if (profile?.tenant_id) {
            const { data: tenantData } = await supabase
              .from("tenants")
              .select(TENANT_PUBLIC_COLUMNS)
              .eq("id", profile.tenant_id)
              .maybeSingle();
            
            if (tenantData && isMountedRef.current) {
              const t = tenantData as Tenant;
              setTenant(t);
              writeCache("default", t);
              const overrides = (t.theme_overrides as ThemeOverrides | null) ?? null;
              applyTheme(overrides, t.hero_url, force);
              lastLoadedSlug.current = t.slug;
              lastLoadedTenantId.current = t.id;
              return;
            }
          }
        }

        if (isMountedRef.current) {
          setTenant(null);
          applyTheme(null, null, force);
        }
        lastLoadedSlug.current = null;
        lastLoadedTenantId.current = null;
        return;
      }

      if (lastLoadedSlug.current === targetSlug && tenant && !force) {
        return;
      }

      lastLoadedSlug.current = targetSlug;

      // Busca dados atualizados do tenant via slug
      const { data, error } = await supabase
        .from("tenants")
        .select(TENANT_PUBLIC_COLUMNS)
        .eq("slug", targetSlug)
        .maybeSingle();

      if (!isMountedRef.current) return;
      
      if (error) {
        console.warn("[Branding] erro ao buscar tenant:", error.message);
        return;
      }

      const t = data as Tenant | null;
      setTenant(t);
      if (targetSlug) writeCache(targetSlug, t);
      const overrides = (t?.theme_overrides as ThemeOverrides | null) ?? null;
      applyTheme(overrides, t?.hero_url, force);
      if (t) lastLoadedTenantId.current = t.id;
    } catch (err) {
      console.error("[Branding] Erro inesperado:", err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const applyPreview = (overrides: ThemeOverrides) => {
    const merged = { ...(tenant?.theme_overrides || {}), ...overrides };
    applyTheme(merged, tenant?.hero_url, true);
  };
  
  const clearPreview = () => applyTheme(tenant?.theme_overrides as ThemeOverrides | null, tenant?.hero_url, true);

  useEffect(() => {
    isMountedRef.current = true;
    void load(slug);
    
    // 1) Escuta mudanças de auth para recarregar o branding
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        void load(slug, true);
      }
    });

    // 2) Real-time subscription para manter o tema sincronizado entre dispositivos
    // Se temos um tenant carregado, escutamos mudanças na tabela 'tenants' para aquele ID
    let tenantSub: any = null;
    
    if (tenant?.id) {
      tenantSub = supabase
        .channel(`tenant-branding-${tenant.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tenants',
            filter: `id=eq.${tenant.id}`
          },
          (payload) => {
            console.log("[Branding] Mudança detectada em tempo real:", payload.new);
            const t = payload.new as Tenant;
            setTenant(t);
            applyTheme(t.theme_overrides as ThemeOverrides, t.hero_url, true);
          }
        )
        .subscribe();
    }

    return () => {
      authSub.unsubscribe();
      if (tenantSub) supabase.removeChannel(tenantSub);
    };
  }, [slug, tenant?.id]);

  return (
    <BrandingContext.Provider value={{ tenant, loading, refresh: () => load(slug, true), applyPreview, clearPreview }}>
      {children}
    </BrandingContext.Provider>
  );
};
