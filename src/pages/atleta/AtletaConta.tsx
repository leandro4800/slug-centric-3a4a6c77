import { useAuth } from "@/hooks/use-auth";
import { useAthletePanelData } from "@/hooks/use-athlete-panel-data";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { KeyRound, UserRound } from "lucide-react";

export default function AtletaConta() {
  const { user } = useAuth();
  const { data } = useAthletePanelData();
  return <div className="space-y-6"><h1 className="font-display text-3xl tracking-normal">Minha conta</h1><section className="flex items-center gap-4 border-y border-border py-6">{data?.profile?.avatar_url ? <img src={data.profile.avatar_url} alt="Minha foto" className="h-20 w-20 rounded-full object-cover" /> : <UserRound className="h-12 w-12 text-muted-foreground" />}<div className="min-w-0"><p className="break-words text-xl font-semibold">{data?.profile?.nome_completo || "Atleta"}</p><p className="mt-1 break-all text-sm text-muted-foreground">{user?.email}</p></div></section><Button asChild variant="outline" className="text-xs tracking-normal"><Link to="/forgot-password"><KeyRound /> Redefinir senha</Link></Button></div>;
}