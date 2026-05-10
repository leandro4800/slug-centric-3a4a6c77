import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const REDIRECT_TIMEOUT_MS = 6500;

const withTimeout = async <T,>(promise: PromiseLike<T>, fallback: T): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), REDIRECT_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

/**
 * Rota neutra usada como destino padrão de confirmações de e-mail do Supabase
 * (Site URL configurado no projeto). Decide para onde mandar o usuário com base
 * no estado de auth/assinatura, evitando "tela em branco" pós-confirmação.
 *
 * Regras:
 *  - Não logado          → /login (marca confirmed=1 se vindo de confirmação de e-mail)
 *  - Coach (owner)       → /{slug}/app/controle
 *  - Aluno c/ tenant ativo → /{slug}/app (SubscriptionGuard valida assinatura)
 *  - Aluno sem assinatura → /marketplace (escolher coach e pagar)
 */
const IndexRedirect = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [target, setTarget] = useState<string | null>(null);

  // Detecta confirmação de e-mail (#access_token=... ou ?type=signup&confirmed=1)
  const cameFromEmailConfirmation = (() => {
    if (typeof window === "undefined") return false;
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    return (
      hash.includes("access_token=") ||
      hash.includes("type=signup") ||
      search.includes("type=signup") ||
      search.includes("confirmed=1")
    );
  })();

  const requestedSlug = typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get("slug");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      if (cameFromEmailConfirmation && requestedSlug) {
        setTarget(`/${requestedSlug}?confirmed=1`);
        return;
      }
      setTarget(cameFromEmailConfirmation ? "/marketplace?confirmed=1" : "/login");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // 1) Coach dono de tenant
        const { data: owned } = await withTimeout(
          supabase
            .from("tenants")
            .select("slug")
            .eq("owner_user_id", user.id)
            .maybeSingle(),
          { data: null, error: null }
        );
        if (cancelled) return;
        if (owned?.slug) {
          setTarget(`/${owned.slug}/app/controle`);
          return;
        }

        // 2) Aluno: pega tenant do perfil
        const { data: perfil } = await withTimeout(
          supabase
            .from("perfis")
            .select("tenant_id")
            .eq("id", user.id)
            .maybeSingle(),
          { data: null, error: null }
        );
        if (cancelled) return;

        if (!perfil?.tenant_id) {
          if (cameFromEmailConfirmation) {
            toast.success("E-mail confirmado! Escolha um coach para começar.");
          }
          setTarget(requestedSlug ? `/${requestedSlug}` : "/marketplace");
          return;
        }

        // 3) Tem tenant — verifica assinatura ativa
        const { data: sub } = await withTimeout(
          supabase
            .from("assinaturas")
            .select("status")
            .eq("aluno_id", user.id)
            .eq("tenant_id", perfil.tenant_id)
            .in("status", ["active", "trialing"])
            .maybeSingle(),
          { data: null, error: null }
        );
        if (cancelled) return;

        const { data: tenant } = await withTimeout(
          supabase
            .from("tenants")
            .select("slug")
            .eq("id", perfil.tenant_id)
            .maybeSingle(),
          { data: null, error: null }
        );
        if (cancelled) return;

        if (sub && tenant?.slug) {
          setTarget(`/${tenant.slug}/app`);
        } else if (tenant?.slug) {
          // Sem assinatura — manda para landing do coach pra escolher plano
          if (cameFromEmailConfirmation) {
            toast.success("E-mail confirmado! Escolha um plano para liberar o acesso.");
          }
          setTarget(`/${tenant.slug}`);
        } else {
          setTarget(requestedSlug ? `/${requestedSlug}` : "/marketplace");
        }
      } catch (err) {
        console.error("[IndexRedirect] erro:", err);
        if (!cancelled) setTarget(requestedSlug ? `/${requestedSlug}` : "/marketplace");
      }
    })();

    return () => { cancelled = true; };
  }, [user, authLoading, cameFromEmailConfirmation, requestedSlug]);

  if (target) return <Navigate to={target} replace />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Redirecionando...</p>
    </div>
  );
};

export default IndexRedirect;
