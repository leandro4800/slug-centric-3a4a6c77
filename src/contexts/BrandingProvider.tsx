import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useLocation, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export type ThemeOverrides = Partial<{
  primary: string;
  primary_glow: string;
  primary_foreground: string;
  accent: string;
  accent_foreground: string;
  background: string;
  card: string;
  foreground: string;
  border: string;
  bg_texture: string; // ex: url('/blackflow-bg.jpg')
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
  splash_video_url: string | null;
  music_url: string | null;
  owner_user_id?: string | null;
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
  primary_foreground: "0 0% 100%",
  accent: "355 100% 48%",
  accent_foreground: "0 0% 100%",
  background: "0 0% 0%",
  foreground: "0 0% 98%",
  card: "0 0% 3%",
  border: "0 0% 18%",
};

const TOKEN_TO_VAR: Record<keyof typeof DEFAULTS, string[]> = {
  primary: ["--primary", "--ring", "--sidebar-primary", "--sidebar-ring"],
  primary_glow: ["--primary-glow"],
  primary_foreground: ["--primary-foreground"],
  accent: ["--accent"],
  accent_foreground: ["--accent-foreground"],
  background: ["--background"],
  foreground: ["--foreground"],
  card: ["--card", "--sidebar-background"],
  border: ["--border", "--sidebar-border"],
};

const SAFE_KEYS = Object.keys(DEFAULTS) as (keyof typeof DEFAULTS)[];

const clearTokens = (root: HTMLElement) => {
  Object.values(TOKEN_TO_VAR).flat().forEach((v) => root.style.removeProperty(v));
  root.style.removeProperty("--hero-url");
  root.style.removeProperty("--bg-texture");
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

  // bg-texture: textura de fundo opcional vinda do tenant. Sem isso, nenhuma textura é aplicada.
  const bgTexture = (overrides as ThemeOverrides | null | undefined)?.bg_texture;
  if (bgTexture) {
    if (root.style.getPropertyValue("--bg-texture") !== bgTexture) {
      root.style.setProperty("--bg-texture", bgTexture);
    }
  } else {
    root.style.removeProperty("--bg-texture");
  }
};

const TENANT_PUBLIC_COLUMNS =
  "id, slug, nome, tagline, logo_url, hero_url, symbol_url, primary_hsl, accent_hsl, theme_overrides, cidade, estado, permite_aula_avulsa, preco_aula_avulsa, login_video_url, splash_video_url, music_url, owner_user_id";

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
  const reservedKeywords = ["index", "marketplace", "seja-coach", "login", "forgot-password", "reset-password", "checkout", "onboarding", "admin", "unsubscribe"];
  const slugFromPath = pathParts.length > 0 && !reservedKeywords.includes(pathParts[0]) ? pathParts[0] : null;
  const slug = params.slug || slugFromPath;

  const [tenant, setTenant] = useState<Tenant | null>(() => (slug ? readCache(slug) : null));
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);
  const lastLoadedSlug = useRef<string | null>(null);
  const lastLoadedTenantId = useRef<string | null>(null);

  const loadTenantForCurrentUser = async (): Promise<Tenant | null> => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return null;

    const fetchPromise = (async () => {
      const [{ data: ownedTenant }, { data: profile }, { data: subscription }] = await Promise.all([
        supabase.from("tenants").select(TENANT_PUBLIC_COLUMNS).eq("owner_user_id", userId).maybeSingle(),
        supabase.from("perfis").select("tenant_id").eq("id", userId).maybeSingle(),
        supabase
          .from("assinaturas")
          .select("tenant_id")
          .eq("aluno_id", userId)
          .in("status", ["active", "trialing"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (ownedTenant) return ownedTenant as Tenant;
      const tenantId = profile?.tenant_id || subscription?.tenant_id;
      if (!tenantId) return null;

      const { data } = await supabase.from("tenants").select(TENANT_PUBLIC_COLUMNS).eq("id", tenantId).maybeSingle();
      return (data as Tenant | null) ?? null;
    })();

    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
    return await Promise.race([fetchPromise, timeout as Promise<Tenant | null>]);
  };

  const load = async (targetSlug: string | null, force = false) => {
    console.log("[Branding] Iniciando load para slug:", targetSlug);
    setLoading(true);
    
    try {
      // Sem slug na URL: usa o tenant do usuário logado para preservar logo/vlogs em /index/PWA.
      if (!targetSlug) {
        const t = await loadTenantForCurrentUser();
        if (isMountedRef.current) {
          setTenant(t);
          if (t) writeCache(t.slug, t);
          applyTheme((t?.theme_overrides as ThemeOverrides | null) ?? null, t?.hero_url, force);
        }
        lastLoadedSlug.current = null;
        lastLoadedTenantId.current = t?.id ?? null;
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

  // Effect 1: carrega tenant ao mudar slug + ouve mudanças de auth (apenas uma vez)
  useEffect(() => {
    isMountedRef.current = true;
    void load(slug);

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
      // Apenas SIGNED_OUT força reload — SIGNED_IN inicial já é tratado pelo getSession
      if (event === "SIGNED_OUT") {
        // Limpa as marcas de splash de TODOS os tenants para que a logo volte a aparecer no próximo login
        try {
          Object.keys(sessionStorage)
            .filter((k) => k.startsWith("splash_shown_session"))
            .forEach((k) => sessionStorage.removeItem(k));
        } catch {}
        void load(slug, true);
      }
    });

    return () => {
      isMountedRef.current = false;
      authSub.unsubscribe();
    };
  }, [slug]);

  // Effect 2: real-time só para o tenant carregado
  useEffect(() => {
    if (!tenant?.id) return;
    const tenantSub = supabase
      .channel(`tenant-branding-${tenant.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tenants', filter: `id=eq.${tenant.id}` },
        (payload) => {
          const t = payload.new as Tenant;
          setTenant(t);
          applyTheme(t.theme_overrides as ThemeOverrides, t.hero_url, true);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(tenantSub); };
  }, [tenant?.id]);

  return (
    <BrandingContext.Provider value={{ tenant, loading, refresh: () => load(slug, true), applyPreview, clearPreview }}>
      {children}
    </BrandingContext.Provider>
  );
};
