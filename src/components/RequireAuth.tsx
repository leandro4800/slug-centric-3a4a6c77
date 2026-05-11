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

  const isLoading = authLoading || (checkTenant && brandingLoading && !user);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="sr-only">Carregando...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={slug ? `/${slug}/login` : "/login"} state={{ from: location, slug }} replace />;
  }

  // Se requer um papel específico e não o possui
  if (requireRole && !hasRole(requireRole)) {
    console.warn(`[RequireAuth] User ${user.id} does not have required role: ${requireRole}`);
    // Se não tem o papel, manda para a landing do coach ou marketplace para se inscrever
    return <Navigate to={slug ? `/${slug}` : "/"} replace />;
  }

  // Se deve verificar o tenant e o slug não condiz com o tenant do usuário
  if (checkTenant && slug && tenant) {
    const isOwnerOrStaff = hasRole("admin") || hasRole("coach", tenant.id);
    
    // Alunos são verificados pelo SubscriptionGuard, mas aqui garantimos que pelo menos tenham o papel de aluno para o tenant
    const isMember = isOwnerOrStaff || hasRole("aluno", tenant.id);

    if (!isMember) {
      console.warn(`[RequireAuth] User ${user.id} is not a member of tenant: ${tenant.id} (${slug})`);
      // Se ele for coach de OUTRO tenant, talvez devêssemos redirecionar para o tenant dele?
      // Por simplicidade, mandamos para o index que fará o redirecionamento correto.
      return <Navigate to={slug ? `/${slug}` : "/"} replace />;
    }
  }

  return <>{children}</>;
};
