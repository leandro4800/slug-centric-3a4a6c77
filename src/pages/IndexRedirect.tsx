import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/contexts/BrandingProvider";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildTenantLoginPath, readFallbackTenantSlug } from "@/lib/tenant-slug";
import { readStartupBranding } from "@/lib/startup-branding";
import { readTenantBrandingCache } from "@/lib/tenant-branding-cache";

const NAVIGATION_MEMORY_KEY = "startup_navigation_memory_v1";

const normalizePath = (path: string) => path.replace(/\/+$/, "") || "/";

const rememberStartupNavigation = (from: string, to: string) => {
  try {
    sessionStorage.setItem(NAVIGATION_MEMORY_KEY, JSON.stringify({ from, to, at: Date.now() }));
  } catch {}
};

const isRecentReverseNavigation = (from: string, to: string) => {
  try {
    const raw = sessionStorage.getItem(NAVIGATION_MEMORY_KEY);
    if (!raw) return false;
    const previous = JSON.parse(raw) as { from?: string; to?: string; at?: number };
    return previous.from === to && previous.to === from && Date.now() - (previous.at ?? 0) < 12000;
  } catch {
    return false;
  }
};

/**
 * Rota de redirecionamento principal simplificada e blindada contra loops.
 */
const IndexRedirect = () => {
  const { user, sessionReady } = useAuth();
  const { tenant, loading: brandingLoading } = useBranding();
  const { slug: urlSlug } = useParams<{ slug: string }>();
  
  const params = new URLSearchParams(window.location.search);
  const slugParam = urlSlug || params.get("slug");
  const confirmed = params.get("confirmed") === "1" || params.get("type") === "signup";
  const safeSlug = slugParam && /^[a-z0-9-]+$/i.test(slugParam) && slugParam !== "index" && slugParam !== "demo" ? slugParam : null;

  const [decisionDone, setDecisionDone] = useState(false);
  const [destination, setDestination] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionReady) return;

    if (!user) {
      setDecisionDone(true);
      return;
    }

    // Usuário autenticado espera branding; se demorar, decide com dados parciais.
    if (brandingLoading) {
      const safetyTimer = setTimeout(() => {
        if (!decisionDone) {
          console.warn("[IndexRedirect] Timeout de segurança atingido, decidindo com dados parciais.");
          setDecisionDone(true);
        }
      }, 5000);
      return () => clearTimeout(safetyTimer);
    }
    
    setDecisionDone(true);
  }, [sessionReady, user, brandingLoading, decisionDone]);

  useEffect(() => {
    if (!decisionDone) return;

    const decideDestination = async () => {
      try {
        console.log("[IndexRedirect] Iniciando decisão de destino. User:", user?.id, "Slug:", safeSlug);

        const go = (target: string) => {
          const currentPath = normalizePath(window.location.pathname);
          const targetPath = normalizePath(target.split("?")[0]);
          if (currentPath === targetPath) return;
          const isLoginTarget = targetPath === "/login" || targetPath.endsWith("/login");
          if (!isLoginTarget && isRecentReverseNavigation(currentPath, targetPath)) {
            console.error("[IndexRedirect] Loop de navegação bloqueado:", currentPath, "->", targetPath);
            setDestination(null);
            return;
          }
          rememberStartupNavigation(currentPath, targetPath);
          setDestination(target);
        };

        if (!user) {
          setDestination(null);
          return;
        }

        const cachedSlug = safeSlug || localStorage.getItem("last_tenant_slug");
        if (cachedSlug && cachedSlug !== "index" && cachedSlug !== "demo") {
          const target = `/${cachedSlug}/app`;
          console.log("[IndexRedirect] Usando último tenant conhecido:", target);
          go(target);
          return;
        }

        const withDecisionTimeout = async (promise: PromiseLike<any>, fallback: any) => {
          let timeoutId: ReturnType<typeof setTimeout> | undefined;
          const timeout = new Promise<any>((resolve) => {
            timeoutId = setTimeout(() => resolve(fallback), 3500);
          });

          try {
            return await Promise.race([promise, timeout]);
          } finally {
            if (timeoutId) clearTimeout(timeoutId);
          }
        };

        // 1. Prioridade: Se o usuário é dono de um tenant
        const { data: ownedTenant } = await withDecisionTimeout(supabase
          .from("tenants")
          .select("slug")
          .eq("owner_user_id", user.id)
          .maybeSingle(), { data: null, error: null });

        if (ownedTenant?.slug) {
          const target = `/${ownedTenant.slug}/app`;
          console.log("[IndexRedirect] Redirecionando dono para seu app:", target);
          go(target);
          return;
        }

        // 2. Se há um slug na URL, verifica se o usuário tem acesso a ele
        const targetSlug = safeSlug || tenant?.slug;
        if (targetSlug && targetSlug !== "demo" && targetSlug !== "index") {
          const { data: targetTenant } = await withDecisionTimeout(supabase
            .from("tenants")
            .select("id, slug")
            .eq("slug", targetSlug)
            .maybeSingle(), { data: null, error: null });

          if (targetTenant) {
            const target = `/${targetTenant.slug}/app`;
            console.log("[IndexRedirect] Slug encontrado, tentando entrar no app:", target);
            go(target);
            return;
          }
        }

        // 3. Fallback final: Tenta o perfil
        const { data: profile } = await withDecisionTimeout(supabase
          .from("perfis")
          .select("tenant_id")
          .eq("id", user.id)
          .maybeSingle(), { data: null, error: null });

        if (profile?.tenant_id) {
          const { data: profileTenant } = await withDecisionTimeout(supabase
            .from("tenants")
            .select("slug")
            .eq("id", profile.tenant_id)
            .maybeSingle(), { data: null, error: null });

          if (profileTenant?.slug) {
            const target = `/${profileTenant.slug}/app`;
            console.log("[IndexRedirect] Tenant do perfil encontrado:", target);
            go(target);
            return;
          }
        }

        // Se nada funcionar e houver slug, tenta onboarding nesse slug
        if (safeSlug) {
          const target = `/${safeSlug}/onboarding`;
          console.log("[IndexRedirect] Nada encontrado, tentando onboarding no slug:", target);
          go(target);
          return;
        }

        // Fallback absoluto
        console.log("[IndexRedirect] Sem destino claro, enviando para onboarding geral");
        go("/onboarding");

      } catch (err) {
        console.error("[IndexRedirect] Erro crítico:", err);
        setDestination("/login");
      }
    };

    decideDestination();
  }, [decisionDone, user, safeSlug, tenant?.slug, confirmed]);

  if (sessionReady && !user) {
    if (safeSlug) {
      return <Navigate to={`/${safeSlug}/login`} replace />;
    }
    return <Navigate to={buildTenantLoginPath(window.location.search)} replace />;
  }

  if (destination) return <Navigate to={destination} replace />;

  const startupSlug = safeSlug || readFallbackTenantSlug();
  const startupBranding = readStartupBranding();
  const startupTenant = startupSlug ? readTenantBrandingCache(startupSlug) : null;
  const startupLogo = startupTenant?.logo_url ?? startupBranding?.logo_url ?? "/icons/icon-192.webp";
  const startupName = startupTenant?.nome ?? startupBranding?.nome;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <img
          src={startupLogo}
          alt={startupName || "AlphaCoach"}
          className="h-20 w-auto max-w-[200px] object-contain"
        />
        {startupName ? (
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{startupName}</p>
        ) : null}
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground uppercase tracking-widest animate-pulse">
          Organizando Ecossistema
        </span>
      </div>
    </div>
  );
};

export default IndexRedirect;
