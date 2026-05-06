import { useBranding } from "@/contexts/BrandingProvider";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

// Marcador de sessão: garante que o splash apareça só UMA vez por aba/sessão,
// logo após o login, na primeira entrada no app do tenant.
const SESSION_KEY = "splash_shown_session";

export const SplashScreen = () => {
  const { tenant, loading } = useBranding();
  const location = useLocation();

  const isAppRoute =
    location.pathname.includes('/app') ||
    location.pathname.includes('/admin') ||
    location.pathname.includes('/onboarding') ||
    location.pathname.includes('/controle');

  const alreadyShown = typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY) === "1";

  const [shouldRender, setShouldRender] = useState(isAppRoute && !alreadyShown);
  const [isVisible, setIsVisible] = useState(isAppRoute && !alreadyShown);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!shouldRender) return;
    if (startedRef.current) return;
    // Aguarda o branding carregar para garantir que a logo do tenant apareça
    if (loading) return;
    startedRef.current = true;

    sessionStorage.setItem(SESSION_KEY, "1");

    // Mostra por ~1.4s após o branding estar pronto
    const fadeTimer = setTimeout(() => setIsVisible(false), 1400);
    const removeTimer = setTimeout(() => setShouldRender(false), 1900);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [shouldRender, loading]);

  if (!shouldRender || !isAppRoute) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ease-in-out",
        !isVisible && "opacity-0 pointer-events-none"
      )}
    >
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
    </div>
  );
};
