import { useBranding } from "@/contexts/BrandingProvider";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

export const SplashScreen = () => {
  const { tenant, loading } = useBranding();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);

  // Define quais rotas devem exibir a tela de splash (apenas áreas do "app")
  const isAppRoute = 
    location.pathname.includes('/app') || 
    location.pathname.includes('/admin') || 
    location.pathname.includes('/onboarding') ||
    location.pathname.includes('/controle');

  useEffect(() => {
    // Se não for uma rota do app, não devemos renderizar o splash
    if (!isAppRoute) {
      setShouldRender(false);
      setIsVisible(false);
      return;
    }

    // Se estiver no app e não estiver mais carregando o branding, iniciamos o fade out
    if (!loading) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        // Remove do DOM após a animação de fade out
        setTimeout(() => setShouldRender(false), 500);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      // Se voltar a carregar (ex: mudança de rota interna do app), resetamos o estado
      setShouldRender(true);
      setIsVisible(true);
    }
  }, [loading, isAppRoute, location.pathname]);

  // Segurança: se por algum motivo ficar preso em loading por mais de 5 segundos, libera a tela
  useEffect(() => {
    if (loading && isAppRoute) {
      const safetyTimer = setTimeout(() => {
        console.warn("[SplashScreen] Timeout de segurança atingido, removendo tela de splash.");
        setIsVisible(false);
        setTimeout(() => setShouldRender(false), 500);
      }, 5000);
      return () => clearTimeout(safetyTimer);
    }
  }, [loading, isAppRoute]);

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
