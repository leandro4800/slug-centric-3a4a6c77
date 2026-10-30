import { useQuery } from "@tanstack/react-query";
import { Navigate, useParams } from "react-router-dom";
import { Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

/** Resolve the account tenant on the server before any panel data is mounted. */
export default function AtletaAccountGuard({ children }: { children: ReactNode }) {
  const { user, sessionReady } = useAuth();
  const { slug } = useParams();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["athlete-panel-account", user?.id],
    enabled: !!user,
    retry: 1,
    queryFn: async () => {
      const result = await supabase.rpc("get_my_app_destination");
      const destination = result.data?.[0]?.tenant_slug;
      if (result.error || !destination || !/^[a-z0-9-]+$/i.test(destination)) throw new Error("Não foi possível identificar seu painel.");
      return destination;
    },
  });
  if (!sessionReady) return <Loader2 className="m-auto h-6 w-6 animate-spin" />;
  if (!user) return <Navigate to="/login?painel=atleta" replace />;
  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (error) return <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6"><p>Não foi possível identificar seu painel.</p><Button variant="outline" onClick={() => refetch()}><RefreshCw /> Tentar novamente</Button></div>;
  if (data !== slug) return <Navigate to={`/${data}/atleta`} replace />;
  return children;
}