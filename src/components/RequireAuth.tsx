import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/contexts/BrandingProvider";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { buildTenantLoginPath } from "@/lib/tenant-slug";

interface Props {
  children: ReactNode;
  requireRole?: "coach" | "admin" | "aluno";
  checkTenant?: boolean;
}

const GUARD_TIMEOUT_MS = 4500;

const NAVIGATION_MEMORY_KEY = "startup_navigation_memory_v1";

const normalizePath = (path: string) => path.replace(/\/+$/, "") || "/";

const isRecentReverseNavigation = (from: string, to: string) => {
  try {
    const raw = sessionStorage.getItem(NAVIGATION_MEMORY_KEY);
    if (!raw) return false;
    const previous = JSON.parse(raw) as { from?: string; to?: string; at?: number };
    return previous.from === to && previous.to === from && Date.now() - (previous.at ?? 0) < 12000;
  } catch {
    return false;
  }
};

const rememberNavigation = (from: string, to: string) => {
  try {
    sessionStorage.setItem(NAVIGATION_MEMORY_KEY, JSON.stringify({ from, to, at: Date.now() }));
  } catch {}
};

const SafeNavigate = ({ to, state }: { to: string; state?: unknown }) => {
  const currentPath = normalizePath(window.location.pathname);
  const targetPath = normalizePath(to.split("?")[0]);

  const isLoginTarget = targetPath === "/login" || targetPath.endsWith("/login");

  if (!isLoginTarget && isRecentReverseNavigation(currentPath, targetPath)) {
    console.error("[RequireAuth] Navegação reversa bloqueada para evitar loop:", currentPath, "->", targetPath);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center">
        <div className="max-w-sm space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Acesso protegido</p>
          <p className="text-sm text-muted-foreground">Detectamos um redirecionamento repetido. Use o login novamente para continuar.</p>
          <a className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" href={to}>Ir para login</a>
        </div>
      </div>
    );
  }

  rememberNavigation(currentPath, targetPath);
  return <Navigate to={to} state={state} replace />;
};

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
  const { user, sessionReady, rolesReady, hasRole } = useAuth();
  const { tenant, loading: brandingLoading } = useBranding();
  const location = useLocation();
  const { slug } = useParams();
  const [tenantMembership, setTenantMembership] = useState<boolean | null>(null);
  const [correctTenantPath, setCorrectTenantPath] = useState<string | null>(null);

  const needsRoles = Boolean(requireRole) || checkTenant;
  const isLoading =
    !sessionReady ||
    (needsRoles && user && !rolesReady) ||
    (checkTenant && brandingLoading);

  useEffect(() => {
    if (!checkTenant || !user || !tenant?.id) {
      setTenantMembership(null);
      setCorrectTenantPath(null);
      return;
    }

    setCorrectTenantPath(null);

    const cacheKey = `tenant_member:${user.id}:${tenant.id}`;
    const cachedMember = (() => {
      try { return localStorage.getItem(cacheKey) === "1"; } catch { return false; }
    })();

    const isOwnerOrStaff = hasRole("admin") || hasRole("coach", tenant.id);
    const hasAlunoRole = hasRole("aluno", tenant.id);
    if (isOwnerOrStaff || hasAlunoRole) {
      setTenantMembership(true);
      try { localStorage.setItem(cacheKey, "1"); } catch {}
      return;
    }

    // Se já validamos antes que este usuário pertence ao tenant, confia no cache
    // e revalida em background — evita mandar pra onboarding em qualquer hiccup de rede.
    if (cachedMember) {
      setTenantMembership(true);
    } else {
      setTenantMembership(null);
    }

    let cancelled = false;
    (async () => {
      try {
        const TIMEOUT_FALLBACK = Symbol("timeout");
        const result: any = await withGuardTimeout(Promise.all([
          supabase.from("perfis").select("tenant_id, onboarding_completo").eq("id", user.id).maybeSingle(),
          supabase.from("assinaturas").select("id").eq("aluno_id", user.id).eq("tenant_id", tenant.id).in("status", ["active", "trialing"]).maybeSingle(),
        ]), TIMEOUT_FALLBACK as any, "Verificação de vínculo");

        if (cancelled) return;

        // Timeout: NÃO regredir para false — mantém cache/estado atual.
        if (result === TIMEOUT_FALLBACK) {
          if (!cachedMember) setTenantMembership(true); // dá benefício da dúvida
          return;
        }

        const [{ data: profile }, { data: subscription }] = result;
        const belongs =
          (profile?.tenant_id === tenant.id) ||
          !!subscription ||
          // Já concluiu onboarding em algum tenant — não pede de novo
          (!!profile?.onboarding_completo && cachedMember);

        if (belongs) {
          setTenantMembership(true);
          try { localStorage.setItem(cacheKey, "1"); } catch {}
        } else if (!cachedMember) {
          const { data: destinations, error: destinationError } = await supabase.rpc("get_my_app_destination");
          if (cancelled) return;

          const correctSlug = destinations?.[0]?.tenant_slug;
          if (!destinationError && correctSlug && correctSlug !== slug) {
            setCorrectTenantPath(`/${correctSlug}/app`);
            setTenantMembership(false);
            return;
          }

          setTenantMembership(false);
        }
      } catch (error) {
        console.error("[RequireAuth] Erro verificando vínculo:", error);
        if (!cancelled && !cachedMember) setTenantMembership(false);
      }
    })();

    return () => { cancelled = true; };
  }, [checkTenant, user?.id, tenant?.id, hasRole, slug]);


  if (isLoading || (checkTenant && user && tenant?.id && tenantMembership === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="sr-only">Carregando...</span>
      </div>
    );
  }

  if (!user) {
    const loginPath = slug ? `/${slug}/login` : buildTenantLoginPath(location.search);
    console.log("[RequireAuth] Sem usuário, redirecionando para login:", loginPath);
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  }

  if (correctTenantPath) {
    console.info("[RequireAuth] Redirecionando a conta para o tenant persistido no banco:", correctTenantPath);
    return <Navigate to={correctTenantPath} replace />;
  }

  // Se requer um papel específico e não o possui
  const hasRequiredRole = requireRole
    ? checkTenant && tenant?.id && requireRole !== "admin"
      ? hasRole("admin") || hasRole(requireRole, tenant.id) || (requireRole === "coach" && tenant.owner_user_id === user.id)
      : hasRole(requireRole)
    : true;

  if (requireRole && !hasRequiredRole) {
    console.warn(`[RequireAuth] User ${user.id} does not have required role: ${requireRole}. Bloqueando acesso.`);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center">
        <div className="max-w-sm space-y-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Acesso Restrito</p>
          <p className="text-sm text-muted-foreground">Você não possui permissão para acessar esta área.</p>
          <button 
            onClick={() => window.history.back()}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // Se deve verificar o tenant e o slug não condiz com o tenant do usuário
  if (checkTenant && slug && tenant) {
    const isOwnerOrStaff = hasRole("admin") || hasRole("coach", tenant.id);
    const isMember = isOwnerOrStaff || hasRole("aluno", tenant.id) || tenantMembership === true;

    if (!isMember) {
      const isSpecialTestEmail = ["48mineiro@gmail.com", "executionmode48@gmail.com"].includes(user.email?.toLowerCase() || "");
      
      if (isSpecialTestEmail || location.pathname.includes("/onboarding")) {
        console.log("[RequireAuth] Usuário de teste ou em rota de onboarding, permitindo acesso.");
        return <>{children}</>;
      }

      const salesPath = `/${slug}`;
      if (location.pathname !== salesPath) {
        console.warn(`[RequireAuth] User ${user.id} is not a member of tenant: ${tenant.id} (${slug}) — enviando para onboarding.`);
        // Em vez de bloquear, envia para o onboarding do tenant atual
        return <Navigate to={`/${slug}/onboarding`} replace />;
      }

      console.warn(`[RequireAuth] User ${user.id} is not a member, but already on onboarding page.`);
    }
  }

  return <>{children}</>;
};