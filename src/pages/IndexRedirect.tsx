import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/contexts/BrandingProvider";
import { Loader2 } from "lucide-react";

/**
 * Rota de redirecionamento principal (ex: confirmações de e-mail).
 * Se o usuário estiver logado, tenta levar para o App correto dele.
 * Se não, leva para o Login com os parâmetros preservados.
 */
const IndexRedirect = () => {
  const { user, isLoading: authLoading, hasRole } = useAuth();
  const { tenant, loading: brandingLoading } = useBranding();
  
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  const confirmed = params.get("confirmed") === "1" || params.get("type") === "signup";
  const safeSlug = slug && /^[a-z0-9-]+$/i.test(slug) ? slug : null;

  // Não esperamos branding/auth infinitamente na rota de redirect
  // Se após 3s ainda estiver carregando, forçamos o render para tentar o redirecionamento
  const [forceRender, setForceRender] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setForceRender(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if ((authLoading || brandingLoading) && !forceRender) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Se logado, decide o destino baseado no papel e tenant
  if (user) {
    // Se temos um tenant carregado via context (ou slug na URL)
    const targetSlug = safeSlug || tenant?.slug;
    
    if (targetSlug) {
      const isCoach = hasRole("coach", tenant?.id) || hasRole("admin") || tenant?.owner_user_id === user.id;
      const target = isCoach ? `/${targetSlug}/app/controle` : `/${targetSlug}/app`;
      return <Navigate to={target} replace />;
    }
    
    // Fallback se logado mas sem tenant definido: vai para o login resolver ou para o onboarding
    return <Navigate to="/onboarding" replace />;
  }
  
  // Se não logado, manda para o login do coach ou login geral
  const loginPath = safeSlug ? `/${safeSlug}/login` : "/login";
  const target = `${loginPath}${confirmed ? "?confirmed=1" : ""}`;

  return <Navigate to={target} replace />;
};

export default IndexRedirect;
