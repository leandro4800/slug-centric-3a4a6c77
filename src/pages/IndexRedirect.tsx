import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/contexts/BrandingProvider";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Rota de redirecionamento principal.
 * Decide para onde o usuário deve ir baseado no seu estado de autenticação e papéis.
 */
const IndexRedirect = () => {
  const { user, isLoading: authLoading, hasRole } = useAuth();
  const { tenant, loading: brandingLoading } = useBranding();
  const navigate = useNavigate();
  
  const params = new URLSearchParams(window.location.search);
  const slugParam = params.get("slug");
  const confirmed = params.get("confirmed") === "1" || params.get("type") === "signup";
  const safeSlug = slugParam && /^[a-z0-9-]+$/i.test(slugParam) ? slugParam : null;

  const [forceRender, setForceRender] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setForceRender(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (authLoading || brandingLoading || redirecting) return;

    if (!user) {
      const loginPath = safeSlug ? `/${safeSlug}/login` : "/login";
      const target = `${loginPath}${confirmed ? "?confirmed=1" : ""}`;
      navigate(target, { replace: true });
      return;
    }

    const decideDestination = async () => {
      setRedirecting(true);
      try {
        // Busca se ele é dono de algum tenant
        const { data: ownedTenant } = await supabase
          .from("tenants")
          .select("slug")
          .eq("owner_user_id", user.id)
          .maybeSingle();

        if (ownedTenant?.slug) {
          navigate(`/${ownedTenant.slug}/app/controle`, { replace: true });
          return;
        }

        // Se ele está em um tenant específico via URL ou Branding
        const targetSlug = safeSlug || tenant?.slug;
        if (targetSlug && targetSlug !== "demo") {
          navigate(`/${targetSlug}/app`, { replace: true });
          return;
        }

        // Busca o tenant do perfil
        const { data: profile } = await supabase
          .from("perfis")
          .select("tenant_id")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.tenant_id) {
          const { data: profileTenant } = await supabase
            .from("tenants")
            .select("slug")
            .eq("id", profile.tenant_id)
            .maybeSingle();
          
          if (profileTenant?.slug) {
            navigate(`/${profileTenant.slug}/app`, { replace: true });
            return;
          }
        }

        // Sem tenant: vai para onboarding
        navigate("/onboarding", { replace: true });
      } catch (err) {
        console.error("[IndexRedirect] Erro:", err);
        navigate("/login", { replace: true });
      }
    };

    decideDestination();
  }, [user, authLoading, brandingLoading, safeSlug, tenant?.slug, confirmed, navigate, redirecting]);

  if ((authLoading || brandingLoading) && !forceRender) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
};

export default IndexRedirect;