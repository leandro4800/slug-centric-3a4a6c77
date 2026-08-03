import { ReactNode, useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useBranding } from "@/contexts/BrandingProvider";
import { SubscriptionLockScreen } from "@/components/SubscriptionLockScreen";
import {
  readSubscriptionGuardCache,
  writeSubscriptionGuardCache,
} from "@/lib/subscription-guard-cache";

interface Props {
  children: ReactNode;
}

const SUBSCRIPTION_TIMEOUT_MS = 3500;

const withSubscriptionTimeout = async <T,>(promise: PromiseLike<T>, fallback: T, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[SubscriptionGuard] ${label} demorou demais; usando fallback seguro.`);
      resolve(fallback);
    }, SUBSCRIPTION_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export const SubscriptionGuard = ({ children }: Props) => {
  const { user, sessionReady } = useAuth();
  const { slug } = useParams();
  const { tenant: brandedTenant, loading: brandingLoading } = useBranding();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);
  const [forceShow, setForceShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn("[SubscriptionGuard] Timeout atingido, forçando renderização.");
        setForceShow(true);
      }
    }, 2800);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (!sessionReady || brandingLoading || !user) return;

    const checkSubscriptionAndCompletion = async () => {
      const cached = readSubscriptionGuardCache(user.id, brandedTenant?.id);
      if (cached) {
        setIsCoach(cached.isCoach);
        setStatus(cached.status);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
      const tenant = brandedTenant?.id
        ? { id: brandedTenant.id, owner_user_id: brandedTenant.owner_user_id ?? null }
        : slug && slug !== "demo"
          ? (await withSubscriptionTimeout(
              supabase.from("tenants").select("id, owner_user_id").eq("slug", slug).maybeSingle(),
              { data: null, error: null } as any,
              "Busca do tenant por slug",
            )).data
          : null;

      const pendingVoucher = sessionStorage.getItem("pending_voucher");
      const urlParams = new URLSearchParams(window.location.search);
      const voucherFromUrl = urlParams.get("voucher") || urlParams.get("codigo") || urlParams.get("v");
      
      // Se o aluno tem um código, tentamos resgatar agora mesmo para liberar o acesso
      if ((pendingVoucher || (voucherFromUrl && voucherFromUrl !== "1")) && slug && slug !== "demo") {
        const codeToRedeem = pendingVoucher || voucherFromUrl;
        console.log("[SubscriptionGuard] Tentando resgatar voucher:", codeToRedeem);
        
        try {
          const { data, error } = await supabase.rpc("redeem_voucher", { _code: codeToRedeem });
          if (!error && (data as any)?.ok) {
            console.log("[SubscriptionGuard] Voucher resgatado com sucesso!");
            sessionStorage.removeItem("pending_voucher");
            
            // Limpa params da URL sem recarregar
            const nextUrl = new URL(window.location.href);
            nextUrl.searchParams.delete("voucher");
            nextUrl.searchParams.delete("codigo");
            nextUrl.searchParams.delete("v");
            window.history.replaceState({}, "", nextUrl.toString());
            
            // Espera um pouco mais para o trigger do BD processar a assinatura
            await new Promise(r => setTimeout(r, 1500));
          } else {
            console.warn("[SubscriptionGuard] Falha ao resgatar voucher:", error || (data as any)?.error);
            sessionStorage.removeItem("pending_voucher");
          }
        } catch (err) {
          console.error("[SubscriptionGuard] Erro ao processar voucher:", err);
          sessionStorage.removeItem("pending_voucher");
        }
      } else if (voucherFromUrl === "1") {
        console.log("[SubscriptionGuard] Trigger de voucher detectado, redirecionando para o site.");
        setLoading(false);
        setStatus("redirect_to_site_voucher");
        return;
      }

      if (tenant?.owner_user_id === user.id) {
        console.log("[SubscriptionGuard] Usuário é o dono do tenant, liberando acesso.");
        setIsCoach(true);
        setStatus("active");
        writeSubscriptionGuardCache(user.id, tenant.id, { isCoach: true, status: "active" });
        setLoading(false);
        return;
      }

      // 2. Check if user has an active/trialing subscription
      if (!tenant?.id) {
        console.warn("[SubscriptionGuard] Tenant indisponível; liberando tela para evitar loop.");
        writeSubscriptionGuardCache(user.id, null, { isCoach: false, status: "active" });
        setLoading(false);
        return;
      }

      const { data: sub } = await withSubscriptionTimeout(supabase
        .from("assinaturas")
        .select("status")
        .eq("aluno_id", user.id)
        .eq("tenant_id", tenant?.id)
        .in("status", ["active", "trialing"])
        .maybeSingle(), { data: null, error: null } as any, "Verificação de assinatura");

      const subscriptionStatus = sub?.status || "inactive";
      let nextStatus = subscriptionStatus;

      // 3. Check for profile/onboarding completion
      if (subscriptionStatus === "active" || subscriptionStatus === "trialing") {
        const [{ data: profile }, { count: anamneseCount }, { count: avaliacaoCount }] = await Promise.all([
          withSubscriptionTimeout(
            supabase.from("perfis").select("onboarding_completo").eq("id", user.id).maybeSingle(),
            { data: null, error: null } as any,
            "Verificação de perfil",
          ),
          withSubscriptionTimeout(
            supabase.from("anamnese_aluno").select("id", { count: "exact", head: true }).eq("aluno_id", user.id),
            { count: 0, error: null } as any,
            "Verificação de anamnese",
          ),
          withSubscriptionTimeout(
            supabase.from("avaliacoes_fisicas").select("id", { count: "exact", head: true }).eq("aluno_id", user.id),
            { count: 0, error: null } as any,
            "Verificação de avaliação",
          ),
        ]);

        if (!profile?.onboarding_completo || !anamneseCount || !avaliacaoCount) {
          nextStatus = "incomplete";
        }
      }

      setStatus(nextStatus);
      writeSubscriptionGuardCache(user.id, tenant.id, { isCoach: false, status: nextStatus });
      setLoading(false);
      } catch (error) {
        console.error("[SubscriptionGuard] Erro inesperado; liberando render para evitar loop:", error);
        setLoading(false);
      }
    };

    void checkSubscriptionAndCompletion();
  }, [user, sessionReady, brandingLoading, slug, brandedTenant?.id, brandedTenant?.owner_user_id]);

  if ((!sessionReady || loading) && !forceShow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Se o timeout foi atingido e ainda estamos carregando, tentamos renderizar os filhos por segurança
  if (forceShow && loading) return <>{children}</>;

  if (isCoach) return <>{children}</>;

  if (status === "redirect_to_site_voucher") {
    const landingPath = slug ? `/${slug}` : "/";
    return <Navigate to={landingPath} replace />;
  }

  if (status === "incomplete") {
    const onboardingPath = slug ? `/${slug}/onboarding` : "/onboarding";
    return <Navigate to={onboardingPath} replace />;
  }

  if (status !== "active" && status !== "trialing") {
    const landingPath = slug ? `/${slug}` : "/";
    return <Navigate to={landingPath} replace />;
  }

  return <>{children}</>;
};