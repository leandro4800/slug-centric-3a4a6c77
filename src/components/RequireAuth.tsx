import { ReactNode } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/contexts/BrandingProvider";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  requireRole?: "coach" | "admin" | "aluno";
  checkTenant?: boolean;
}

export const RequireAuth = ({ children, requireRole, checkTenant = false }: Props) => {
  const { user, isLoading: authLoading, hasRole } = useAuth();
  const { tenant, loading: brandingLoading } = useBranding();
  const location = useLocation();
  const { slug } = useParams();

  const isLoading = authLoading || (checkTenant && brandingLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="sr-only">Carregando...</span>
      </div>
    );
  }

  if (!user) {
    console.log("[RequireAuth] Sem usuário, redirecionando para login. Slug:", slug);
    return <Navigate to={slug ? `/${slug}/login` : "/login"} state={{ from: location, slug }} replace />;
  }

  // Se requer um papel específico e não o possui
  if (requireRole && !hasRole(requireRole)) {
    console.warn(`[RequireAuth] User ${user.id} does not have required role: ${requireRole}. Redirecionando para landing.`);
    return <Navigate to={slug ? `/${slug}` : "/"} replace />;
  }

  // Se deve verificar o tenant e o slug não condiz com o tenant do usuário
  if (checkTenant && slug && tenant) {
    const isOwnerOrStaff = hasRole("admin") || hasRole("coach", tenant.id);
    const isMember = isOwnerOrStaff || hasRole("aluno", tenant.id);

    if (!isMember) {
      const onboardingPath = `/${slug}/onboarding`;
      if (location.pathname !== onboardingPath) {
        console.warn(`[RequireAuth] User ${user.id} is not a member of tenant: ${tenant.id} (${slug}) — enviando para onboarding.`);
        return <Navigate to={onboardingPath} replace />;
      }
      console.warn(`[RequireAuth] User ${user.id} is not a member, but already on onboarding page.`);
    }
  }

  return <>{children}</>;
};