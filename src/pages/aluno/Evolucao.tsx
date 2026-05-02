import { useState } from "react";
import { TrendingUp, Brain, Plus, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PageHeader } from "@/components/aluno/PageHeader";
import { TenantSymbol } from "@/components/TenantSymbol";
import { useBranding } from "@/contexts/BrandingProvider";

const Evolucao = () => {
  const [tab, setTab] = useState<"PESO" | "BF%">("PESO");
  const { tenant } = useBranding();

  return (
    <>
      <PageHeader icon={TrendingUp} title="EVOLUÇÃO…" subtitle={tenant?.nome || "MEU TIME"} />
      <div className="px-5">
        <div className="bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-xs text-accent mb-5">
          <TenantSymbol size={16} /> Clique no botão + para registrar sua primeira métrica ou foto
        </div>

        <div className="bg-card/40 border border-accent/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg text-accent">PESO CORPORAL</h3>
            <div className="flex bg-card rounded-full p-0.5">
              {(["PESO", "BF%"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    tab === t ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">
            Registre métricas para ver o gráfico
          </div>
        </div>

        <div className="bg-card/40 border border-accent/30 rounded-2xl p-5 mt-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-full bg-accent/15 border border-accent/40 flex items-center justify-center">
              <Brain className="h-4 w-4 text-accent" />
            </div>
            <p className="font-display text-lg text-accent">ANÁLISE {tenant?.nome?.toUpperCase() || "TIME"}</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Registre pelo menos 3 semanas de dados para receber sua análise personalizada de performance. 🧠
          </p>
        </div>

        <Button className="w-full mt-6" variant="default" onClick={() => toast.info("Funcionalidade em desenvolvimento")}>
          <Instagram className="h-5 w-5" /> COMPARTILHAR EVOLUÇÃO NO INSTAGRAM
        </Button>

        <Button className="fixed bottom-24 right-5 w-14 h-14 rounded-full p-0" variant="default">
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </>
  );
};

export default Evolucao;
