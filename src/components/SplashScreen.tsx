import { useBranding } from "@/contexts/BrandingProvider";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

// Marca que o splash já foi mostrado nessa sessão (evita re-trigger ao navegar entre telas internas)
const SESSION_KEY = "splash_shown_session";

export const SplashScreen = () => {
  const { tenant, loading } = useBranding();
  const location = useLocation();

  const isAppRoute =
    location.pathname.includes("/app") ||
    location.pathname.includes("/admin") ||
    location.pathname.includes("/onboarding") ||
    location.pathname.includes("/controle");

  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const startedRef = useRef(false);

  // Dispara o splash quando ENTRAMOS numa rota de app pela primeira vez na sessão
  useEffect(() => {
    if (!isAppRoute) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    if (startedRef.current) return;

    startedRef.current = true;
    setShouldRender(true);
    setIsVisible(true);
  }, [isAppRoute]);

  // Após o branding carregar, agenda o fade-out
  useEffect(() => {
    if (!shouldRender) return;
    if (loading) return;

    sessionStorage.setItem(SESSION_KEY, "1");

    const hasVideo = !!tenant?.splash_video_url;
    const showMs = hasVideo ? 3200 : 1600;

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
