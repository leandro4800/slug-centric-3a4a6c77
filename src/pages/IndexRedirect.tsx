import { Navigate, useNavigate, useParams } from "react-router-dom";
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
  const { user, isLoading: authLoading } = useAuth();
  const { tenant, loading: brandingLoading } = useBranding();
  const navigate = useNavigate();
  const { slug: urlSlug } = useParams<{ slug: string }>();
  
  const params = new URLSearchParams(window.location.search);
  const slugParam = urlSlug || params.get("slug");
  const confirmed = params.get("confirmed") === "1" || params.get("type") === "signup";
  const safeSlug = slugParam && /^[a-z0-9-]+$/i.test(slugParam) ? slugParam : null;

  const [forceRender, setForceRender] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setForceRender(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (authLoading || brandingLoading || redirecting) return;

    const decideDestination = async () => {
      setRedirecting(true);
      try {
        if (!user) {
          const loginPath = safeSlug ? `/${safeSlug}/login` : "/login";
          const target = `${loginPath}${confirmed ? "?confirmed=1" : ""}`;
          console.log("[IndexRedirect] Não autenticado, enviando para:", target);
          navigate(target, { replace: true });
          return;
        }

        // Se o usuário está logado, decidimos o destino
        // 1. Busca se ele é dono de algum tenant
        const { data: ownedTenant } = await supabase
          .from("tenants")
          .select("slug")
          .eq("owner_user_id", user.id)
          .maybeSingle();

        if (ownedTenant?.slug) {
          const target = `/${ownedTenant.slug}/app/controle`;
          console.log("[IndexRedirect] Owner identificado, enviando para:", target);
          navigate(target, { replace: true });
          return;
        }

        // 2. Se ele está em um tenant específico via URL ou Branding
        const targetSlug = safeSlug || tenant?.slug;
        if (targetSlug && targetSlug !== "demo") {
          const target = `/${targetSlug}/app`;
          console.log("[IndexRedirect] Tenant identificado via URL/Branding, enviando para:", target);
          navigate(target, { replace: true });
          return;
        }

        // 3. Busca o tenant do perfil
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
            const target = `/${profileTenant.slug}/app`;
            console.log("[IndexRedirect] Tenant identificado via Perfil, enviando para:", target);
            navigate(target, { replace: true });
            return;
          }
        }

        // 4. Sem tenant associado: vai para onboarding
        console.log("[IndexRedirect] Sem tenant associado, enviando para onboarding");
        navigate("/onboarding", { replace: true });
      } catch (err) {
        console.error("[IndexRedirect] Erro crítico na decisão:", err);
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