import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/contexts/BrandingProvider";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: ReactNode;
  requireRole?: "coach" | "admin" | "aluno";
  checkTenant?: boolean;
}

const GUARD_TIMEOUT_MS = 4500;

const withGuardTimeout = async <T,>(promise: PromiseLike<T>, fallback: T, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[RequireAuth] ${label} demorou demais; liberando fallback para não travar.`);
      resolve(fallback);
    }, GUARD_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export const RequireAuth = ({ children, requireRole, checkTenant = false }: Props) => {
  const { user, isLoading: authLoading, hasRole } = useAuth();
  const { tenant, loading: brandingLoading } = useBranding();
  const location = useLocation();
  const { slug } = useParams();
  const [tenantMembership, setTenantMembership] = useState<boolean | null>(null);

  const isLoading = authLoading || (checkTenant && brandingLoading);

  useEffect(() => {
    if (!checkTenant || !user || !tenant?.id) {
      setTenantMembership(null);
      return;
    }

    const isOwnerOrStaff = hasRole("admin") || hasRole("coach", tenant.id);
    const hasAlunoRole = hasRole("aluno", tenant.id);
    if (isOwnerOrStaff || hasAlunoRole) {
      setTenantMembership(true);
      return;
    }

    let cancelled = false;
    setTenantMembership(null);
    (async () => {
      try {
        const [{ data: profile }, { data: subscription }] = await withGuardTimeout(Promise.all([
          supabase.from("perfis").select("tenant_id").eq("id", user.id).eq("tenant_id", tenant.id).maybeSingle(),
          supabase.from("assinaturas").select("id").eq("aluno_id", user.id).eq("tenant_id", tenant.id).in("status", ["active", "trialing"]).maybeSingle(),
        ]), [{ data: null }, { data: null }] as any, "Verificação de vínculo");

        if (!cancelled) setTenantMembership(!!profile || !!subscription);
      } catch (error) {
        console.error("[RequireAuth] Erro verificando vínculo:", error);
        if (!cancelled) setTenantMembership(false);
      }
    })();

    return () => { cancelled = true; };
  }, [checkTenant, user?.id, tenant?.id, hasRole]);

  if (isLoading || (checkTenant && user && tenant?.id && tenantMembership === null)) {
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
    const isMember = isOwnerOrStaff || hasRole("aluno", tenant.id) || tenantMembership === true;

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