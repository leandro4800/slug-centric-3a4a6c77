import { ReactNode, useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
}

export const SubscriptionGuard = ({ children }: Props) => {
  const { user, isLoading: authLoading } = useAuth();
  const { slug } = useParams();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);

  useEffect(() => {
    if (authLoading || !user || !slug) return;

    const checkSubscription = async () => {
      setLoading(true);
      
      // 1. Check if user is the coach of this tenant
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, owner_user_id")
        .eq("slug", slug)
        .maybeSingle();

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

      setStatus(sub?.status || "inactive");
      setLoading(false);
    };

    void checkSubscription();
  }, [user, authLoading, slug]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isCoach) return <>{children}</>;

  if (status !== "active" && status !== "trialing") {
    return <Navigate to={`/${slug}`} replace />;
  }

  return <>{children}</>;
};
