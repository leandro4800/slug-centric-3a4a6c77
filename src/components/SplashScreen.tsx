import { useBranding } from "@/contexts/BrandingProvider";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import defaultLogoAsset from "@/assets/alphacoach-pro-logo.jpg.asset.json";

// Chave por tenant e sessão — assim cada coach tem seu próprio splash garantido
const sessionKeyFor = (slug: string | null | undefined) =>
  `splash_shown_v2::${slug ?? "_neutral"}`;

export const SplashScreen = () => {
  const { tenant, loading } = useBranding();
  const location = useLocation();

  const pathname = location.pathname.replace(/\/+$/, "") || "/";
  const pathParts = pathname.split("/").filter(Boolean);
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/index" ||
    pathname === "/login" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/marketplace" ||
    pathParts[1] === "index" ||
    pathParts[1] === "login" ||
    pathParts[1] === "site";

  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const startedForTenantRef = useRef<string | null>(null);

  const tenantKey = tenant?.slug ?? "_neutral";

  // Limpa marcas ao deslogar — assim no próximo login o splash volta a aparecer
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        try {
          Object.keys(sessionStorage)
            .filter((k) => k.startsWith("splash_shown_v2"))
            .forEach((k) => sessionStorage.removeItem(k));
        } catch {}
        startedForTenantRef.current = null;
        setShouldRender(false);
        setIsVisible(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Nunca cobre login/entrada pública com o splash React: o app precisa parar no login.
    if (isPublicRoute) {
      setShouldRender(false);
      setIsVisible(false);
      return;
    }
    if (typeof window === "undefined") return;

    const key = sessionKeyFor(tenantKey);
    if (sessionStorage.getItem(key) === "1") return;
    if (startedForTenantRef.current === tenantKey) return;

    startedForTenantRef.current = tenantKey;
    setShouldRender(true);
    setIsVisible(true);
  }, [isPublicRoute, loading, tenantKey]);

  // Agenda o fade-out com segurança máxima
  useEffect(() => {
    if (!shouldRender) return;

    // Timer de segurança absoluta: se em 7 segundos o splash não sumir sozinho, 
    // nós forçamos a saída para não travar o usuário.
    const absoluteSafetyTimer = setTimeout(() => {
      console.warn("[SplashScreen] Forçando saída por timeout de segurança");
      setIsVisible(false);
      setTimeout(() => setShouldRender(false), 500);
    }, 7000);

    // Se ainda está carregando o branding, esperamos.
    if (loading) {
      return () => clearTimeout(absoluteSafetyTimer);
    }

    // Branding carregou, agora podemos agendar o fim baseado no conteúdo.
    const hasVideo = !!tenant?.splash_video_url;
    const showMs = hasVideo ? 2800 : 1800;

    const fadeTimer = setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem(sessionKeyFor(tenantKey), "1");
    }, showMs);

    const removeTimer = setTimeout(() => {
      setShouldRender(false);
    }, showMs + 500);

    return () => {
      clearTimeout(absoluteSafetyTimer);
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [shouldRender, loading, tenant?.splash_video_url, tenantKey]);

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-700 ease-in-out",
        !isVisible && "opacity-0 pointer-events-none"
      )}
    >
      {tenant?.splash_video_url ? (
        <>
          <video
            src={tenant.splash_video_url}
            autoPlay
            muted
            playsInline
            onPlaying={() => setVideoPlaying(true)}
            onError={() => {
              setIsVisible(false);
              setTimeout(() => setShouldRender(false), 300);
            }}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className={cn(
              "absolute inset-0 z-10 flex flex-col items-center justify-center bg-background transition-opacity duration-200 ease-in-out",
              videoPlaying && "opacity-0 pointer-events-none"
            )}
          >
            <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-1000">
              {tenant?.logo_url ? (
                <div className="flex flex-col items-center gap-6">
                  <img
                    src={tenant.logo_url}
                    alt={tenant.nome}
                    className="w-40 h-40 object-contain animate-pulse shadow-2xl rounded-xl"
                  />
                  <h1 className="text-3xl font-display tracking-[0.2em] uppercase text-foreground text-center px-4">
                    {tenant.nome}
                  </h1>
                </div>
              ) : (
                <div className="scale-[2] mb-12">
                  <img
                    src={defaultLogoAsset.url}
                    alt={tenant?.nome || "AlphaCoach"}
                    className="w-24 h-24 object-contain"
                  />
                </div>
              )}

              <div className="mt-12 flex flex-col items-center gap-4">
                <div className="w-56 h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                  <div className="h-full bg-primary animate-progress-loading shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                </div>
                <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground animate-pulse">
                  Carregando Ecossistema
                </span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-1000">
          {tenant?.logo_url ? (
            <div className="flex flex-col items-center gap-6">
              <img
                src={tenant.logo_url}
                alt={tenant.nome}
                className="w-40 h-40 object-contain animate-pulse shadow-2xl rounded-xl"
              />
              <h1 className="text-3xl font-display tracking-[0.2em] uppercase text-foreground text-center px-4">
                {tenant.nome}
              </h1>
            </div>
          ) : (
            <div className="scale-[2] mb-12">
              <img
                src={defaultLogoAsset.url}
                alt={tenant?.nome || "AlphaCoach"}
                className="w-24 h-24 object-contain"
              />
            </div>
          )}

          <div className="mt-12 flex flex-col items-center gap-4">
            <div className="w-56 h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
              <div className="h-full bg-primary animate-progress-loading shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
            </div>
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground animate-pulse">
              Carregando Ecossistema
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
