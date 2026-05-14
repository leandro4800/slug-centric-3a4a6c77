import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/contexts/BrandingProvider";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Rota de redirecionamento principal simplificada e blindada contra loops.
 */
const IndexRedirect = () => {
  const { user, sessionReady } = useAuth();
  const { tenant, loading: brandingLoading } = useBranding();
  const navigate = useNavigate();
  const { slug: urlSlug } = useParams<{ slug: string }>();
  
  const params = new URLSearchParams(window.location.search);
  const slugParam = urlSlug || params.get("slug");
  const confirmed = params.get("confirmed") === "1" || params.get("type") === "signup";
  const safeSlug = slugParam && /^[a-z0-9-]+$/i.test(slugParam) ? slugParam : null;

  const [decisionDone, setDecisionDone] = useState(false);

  useEffect(() => {
    // Espera a sessão ser restaurada; se o branding demorar, decide com dados parciais.
    if (!sessionReady || brandingLoading) {
      const safetyTimer = setTimeout(() => {
        if (sessionReady && !decisionDone) {
          console.warn("[IndexRedirect] Timeout de segurança atingido, decidindo com dados parciais.");
          setDecisionDone(true);
        }
      }, 5000);
      return () => clearTimeout(safetyTimer);
    }
    
    setDecisionDone(true);
  }, [sessionReady, brandingLoading, decisionDone]);

  useEffect(() => {
    if (!decisionDone) return;

    const decideDestination = async () => {
      try {
        console.log("[IndexRedirect] Iniciando decisão de destino. User:", user?.id, "Slug:", safeSlug);

        if (!user) {
          const loginPath = safeSlug ? `/${safeSlug}/login` : "/login";
          const target = `${loginPath}${confirmed ? "?confirmed=1" : ""}`;
          
          if (window.location.pathname !== loginPath) {
            console.log("[IndexRedirect] Não autenticado, redirecionando para:", target);
            navigate(target, { replace: true });
          }
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
          if (window.location.pathname !== target) navigate(target, { replace: true });
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
            if (window.location.pathname !== target) navigate(target, { replace: true });
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
            if (window.location.pathname !== target) navigate(target, { replace: true });
            return;
          }
        }

        // Se nada funcionar e houver slug, tenta onboarding nesse slug
        if (safeSlug) {
          const target = `/${safeSlug}/onboarding`;
          console.log("[IndexRedirect] Nada encontrado, tentando onboarding no slug:", target);
          if (window.location.pathname !== target) navigate(target, { replace: true });
          return;
        }

        // Fallback absoluto
        console.log("[IndexRedirect] Sem destino claro, enviando para onboarding geral");
        navigate("/onboarding", { replace: true });

      } catch (err) {
        console.error("[IndexRedirect] Erro crítico:", err);
        navigate("/login", { replace: true });
      }
    };

    decideDestination();
  }, [decisionDone, user, safeSlug, tenant?.slug, confirmed, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground uppercase tracking-widest animate-pulse">
          Organizando Ecossistema
        </span>
      </div>
    </div>
  );
};

export default IndexRedirect;
