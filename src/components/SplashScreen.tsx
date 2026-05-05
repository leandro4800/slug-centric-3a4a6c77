import { useBranding } from "@/contexts/BrandingProvider";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

export const SplashScreen = () => {
  const { tenant, loading } = useBranding();
  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    // Se não estiver mais carregando o branding, iniciamos o fade out
    if (!loading) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        // Remove do DOM após a animação de fade out
        setTimeout(() => setShouldRender(false), 500);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      // Se voltar a carregar (ex: mudança de rota), resetamos o estado
      setShouldRender(true);
      setIsVisible(true);
    }
  }, [loading]);

  if (!shouldRender) return null;

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
