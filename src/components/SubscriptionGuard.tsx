import { ReactNode, useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useBranding } from "@/contexts/BrandingProvider";

interface Props {
  children: ReactNode;
}

export const SubscriptionGuard = ({ children }: Props) => {
  const { user, isLoading: authLoading } = useAuth();
  const { slug } = useParams();
  const { tenant: brandedTenant, loading: brandingLoading } = useBranding();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);

  useEffect(() => {
    if (authLoading || brandingLoading || !user) return;

    const checkSubscriptionAndCompletion = async () => {
      setLoading(true);
      
      // 1. Resolve tenant with ownership explicitly.
      const { data: tenant } = brandedTenant?.id
        ? await supabase.from("tenants").select("id, owner_user_id").eq("id", brandedTenant.id).maybeSingle()
        : slug && slug !== "demo"
          ? await supabase.from("tenants").select("id, owner_user_id").eq("slug", slug).maybeSingle()
          : { data: null };

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
            const nextUrl = new URL(window.location.href);
            nextUrl.searchParams.delete("voucher");
            nextUrl.searchParams.delete("codigo");
            nextUrl.searchParams.delete("v");
            window.history.replaceState({}, "", nextUrl.toString());
            
            // Pequeno delay para o Supabase processar a nova assinatura antes da próxima consulta
            await new Promise(r => setTimeout(r, 500));
          } else {
            console.warn("[SubscriptionGuard] Falha ao resgatar voucher:", error || (data as any)?.error);
            sessionStorage.removeItem("pending_voucher");
          }
        } catch (err) {
          console.error("[SubscriptionGuard] Erro ao processar voucher:", err);
          sessionStorage.removeItem("pending_voucher");
        }
      } else if (voucherFromUrl === "1") {
        // Se for apenas o trigger ?voucher=1, redirecionamos para o site para abrir o modal
        console.log("[SubscriptionGuard] Trigger de voucher detectado, redirecionando para o site.");
        setLoading(false);
        setStatus("redirect_to_site_voucher");
        return;
      }

      if (tenant?.owner_user_id === user.id) {
        console.log("[SubscriptionGuard] Usuário é o dono do tenant, liberando acesso.");
        setIsCoach(true);
        setLoading(false);
        return;
      }

      // 2. Check if user has an active/trialing subscription
      const { data: sub } = await supabase
        .from("assinaturas")
        .select("status")
        .eq("aluno_id", user.id)
        .eq("tenant_id", tenant?.id)
        .in("status", ["active", "trialing"])
        .maybeSingle();

      const subscriptionStatus = sub?.status || "inactive";
      setStatus(subscriptionStatus);

      // 3. Check for profile/onboarding completion
      if (subscriptionStatus === "active" || subscriptionStatus === "trialing") {
        const { data: profile } = await supabase
          .from("perfis")
          .select("onboarding_completo")
          .eq("id", user.id)
          .maybeSingle();

        const { count: anamneseCount } = await supabase
          .from("anamnese_aluno")
          .select("id", { count: 'exact', head: true })
          .eq("aluno_id", user.id);

        const { count: avaliacaoCount } = await supabase
          .from("avaliacoes_fisicas")
          .select("id", { count: 'exact', head: true })
          .eq("aluno_id", user.id);

        if (!profile?.onboarding_completo || !anamneseCount || !avaliacaoCount) {
          setStatus("incomplete");
        }
      }

      setLoading(false);
    };

    void checkSubscriptionAndCompletion();
  }, [user, authLoading, brandingLoading, slug, brandedTenant?.id]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isCoach) return <>{children}</>;

  if (status === "redirect_to_site_voucher") {
    return <Navigate to={`/${slug}/site?voucher=1`} replace />;
  }

  if (status === "incomplete") {
    return <Navigate to="/onboarding" replace />;
  }

  if (status !== "active" && status !== "trialing") {
    return <Navigate to={`/${slug}/site`} replace />;
  }

  return <>{children}</>;
};