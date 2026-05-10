import { useBranding } from "@/contexts/BrandingProvider";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// Chave por tenant — assim cada coach tem seu próprio splash garantido
const sessionKeyFor = (slug: string | null | undefined) =>
  `splash_shown_session::${slug ?? "_neutral"}`;

export const SplashScreen = () => {
  const { tenant, loading } = useBranding();
  const location = useLocation();

  const isAppRoute =
    location.pathname.includes("/app") ||
    location.pathname.includes("/admin") ||
    location.pathname.includes("/onboarding") ||
    location.pathname.includes("/controle") ||
    location.pathname.includes("/login");

  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const startedForTenantRef = useRef<string | null>(null);

  const tenantKey = tenant?.slug ?? null;

  // Limpa marcas ao deslogar — assim no próximo login o splash volta a aparecer
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        try {
          Object.keys(sessionStorage)
            .filter((k) => k.startsWith("splash_shown_session"))
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
    if (!isAppRoute) return;
    if (loading) return;
    if (!tenantKey) return;
    if (typeof window === "undefined") return;

    const key = sessionKeyFor(tenantKey);
    if (sessionStorage.getItem(key) === "1") return;
    if (startedForTenantRef.current === tenantKey) return;

    startedForTenantRef.current = tenantKey;
    setShouldRender(true);
    setIsVisible(true);
  }, [isAppRoute, loading, tenantKey]);

  // Agenda o fade-out
  useEffect(() => {
    if (!shouldRender) return;
    if (loading) return;

    sessionStorage.setItem(sessionKeyFor(tenantKey), "1");

    const hasVideo = !!tenant?.splash_video_url;
    const showMs = hasVideo ? 5000 : 1600;

    const fadeTimer = setTimeout(() => setIsVisible(false), showMs);
    const removeTimer = setTimeout(() => setShouldRender(false), showMs + 500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [shouldRender, loading, tenant?.splash_video_url]);

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ease-in-out",
        !isVisible && "opacity-0 pointer-events-none"
      )}
    >
      {tenant?.splash_video_url ? (
        <video
          src={tenant.splash_video_url}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-700">
          {tenant?.logo_url ? (
            <div className="flex flex-col items-center gap-4">
              <img
                src={tenant.logo_url}
                alt={tenant.nome}
                className="w-32 h-32 object-contain animate-pulse"
              />
              <h1 className="text-2xl font-display tracking-widest uppercase text-foreground">
                {tenant.nome}
              </h1>
            </div>
          ) : (
            <div className="scale-150">
              <Logo withText={true} />
            </div>
          )}

          <div className="mt-8">
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-progress-loading" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
