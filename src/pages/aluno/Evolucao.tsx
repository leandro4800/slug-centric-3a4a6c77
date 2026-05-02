import { useState } from "react";
import { TrendingUp, Brain, Plus, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/aluno/PageHeader";
import { TenantSymbol } from "@/components/TenantSymbol";
import { useBranding } from "@/contexts/BrandingProvider";
import { EvolutionChart } from "@/components/aluno/evolucao/EvolutionChart";
import { BeforeAfterSlider } from "@/components/aluno/evolucao/BeforeAfterSlider";
import { CheckInModal } from "@/components/aluno/evolucao/CheckInModal";
import { InstagramCardGenerator } from "@/components/aluno/evolucao/InstagramCardGenerator";

const Evolucao = () => {
  const [tab, setTab] = useState<"PESO" | "BF%">("PESO");
  const { tenant } = useBranding();

  // Mock data for initial state
  const weightData = [
    { date: "01/05", value: 85.5 },
    { date: "08/05", value: 84.2 },
    { date: "15/05", value: 83.8 },
    { date: "22/05", value: 82.5 },
  ];

  const bfData = [
    { date: "01/05", value: 22.5 },
    { date: "08/05", value: 22.1 },
    { date: "15/05", value: 21.8 },
    { date: "22/05", value: 21.2 },
  ];

  const chartData = tab === "PESO" ? weightData : bfData;

  // Imagens mock para o slider (substitua pelas URLs reais do usuário no futuro)
  const mockBefore = "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop&q=60";
  const mockAfter = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=60";

  return (
    <div className="pb-32">
      <PageHeader icon={TrendingUp} title="EVOLUÇÃO…" subtitle={tenant?.nome || "MEU TIME"} />
      
      <div className="px-5">
        <div className="bg-primary/10 border border-primary/30 rounded-none px-4 py-3 flex items-center justify-center gap-2 text-[10px] text-primary mb-5 uppercase tracking-widest font-bold">
          <TenantSymbol size={16} /> Painel de Conquistas Alpha
        </div>

        {/* Comparativo Antes e Depois */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-display text-lg text-white tracking-widest uppercase underline decoration-primary underline-offset-4 decoration-2">Visual</h3>
          </div>
          <BeforeAfterSlider beforeUrl={mockBefore} afterUrl={mockAfter} />
        </div>

        {/* Gráfico de Performance */}
        <div className="bg-card/40 border border-border rounded-none p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg text-primary tracking-widest uppercase">{tab === "PESO" ? "Peso Corporal" : "Gordura Corporal"}</h3>
            <div className="flex bg-card/80 border border-border rounded-none p-0.5">
              {(["PESO", "BF%"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1 rounded-none text-xs font-semibold uppercase tracking-widest transition-all duration-300 ${
                    tab === t ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          
          <EvolutionChart data={chartData} type={tab} />
        </div>

        {/* Inteligência Alpha */}
        <div className="bg-card/40 border border-border rounded-none p-5 mt-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-none bg-primary/15 border border-primary/40 flex items-center justify-center">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <p className="font-display text-lg text-primary tracking-widest uppercase">Análise de Performance</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sua perda de peso está constante em 1.2kg por semana. Mantendo este ritmo, você atingirá sua meta em <span className="text-primary font-bold">4 semanas</span>. 🧠
          </p>
        </div>

        {/* Gerador de Card Instagram */}
        <InstagramCardGenerator 
          userName="Seu Nome" 
          weightLoss="3.0" 
          beforeImg={mockBefore} 
          afterImg={mockAfter} 
        />

        {/* Botão de Check-in (Modal) */}
        <CheckInModal />
      </div>
    </div>
  );
};

export default Evolucao;
