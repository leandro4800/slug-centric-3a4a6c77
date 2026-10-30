import { useAuth } from "@/hooks/use-auth";
import { useAthletePanelData } from "@/hooks/use-athlete-panel-data";

export default function AtletaConta() {
  const { user } = useAuth();
  const { data } = useAthletePanelData();
  return <div className="space-y-6"><h1 className="font-display text-3xl tracking-normal">Minha conta</h1><section className="border-y border-border py-6"><p className="break-words text-xl font-semibold">{data?.profile?.nome_completo || "Atleta"}</p><p className="mt-1 break-all text-sm text-muted-foreground">{user?.email}</p></section></div>;
}