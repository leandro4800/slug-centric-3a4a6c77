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

      // Se estamos em um tenant específico, e o usuário não tem assinatura,
      // mas temos um voucher pendente, permitimos o acesso para que o Login.tsx processe
      const pendingVoucher = sessionStorage.getItem("pending_voucher");
      if (pendingVoucher && slug && slug !== "demo") {
        setIsCoach(false);
        setLoading(false);
        return;
      }

      if (tenant?.owner_user_id === user.id) {
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

  if (status === "incomplete") {
    return <Navigate to="/onboarding" replace />;
  }

  if (status !== "active" && status !== "trialing") {
    return <Navigate to={`/${slug}/site`} replace />;
  }

  return <>{children}</>;
};