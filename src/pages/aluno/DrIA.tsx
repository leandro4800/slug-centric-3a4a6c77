import { useState, useRef } from "react";
import { Stethoscope, Upload, ChevronRight, Loader2, History, LineChart as LineChartIcon } from "lucide-react";
import { useBranding } from "@/contexts/BrandingProvider";
import heroDefault from "@/assets/hero-default.jpg";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AnalysisResults } from "@/components/aluno/clinica/AnalysisResults";
import { useQuery } from "@tanstack/react-query";
import { useDrIA } from "@/hooks/use-dr-ia";
import { EvolutionChart } from "@/components/aluno/clinica/EvolutionChart";

const DrIA = () => {
  const [tab, setTab] = useState<"nova" | "clinica" | "evolucao">("nova");
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { tenant } = useBranding();
  const { uploadExame, isAnalyzing, listarAnalises } = useDrIA();
  const hero = tenant?.hero_url || heroDefault;

  // Fetch past analyses
  const { data: analyses, isLoading: isLoadingAnalyses } = useQuery({
    queryKey: ["analises_clinicas"],
    queryFn: listarAnalises
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Por favor, envie um arquivo PDF.");
        return;
      }
      try {
        const result = await uploadExame(file);
        setCurrentAnalysis(result);
      } catch (err) {
        // Error handled in hook
      }
    }
  };

  return (
    <div className="border border-border rounded-3xl m-3 overflow-hidden min-h-[calc(100vh-120px)] bg-background">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="application/pdf"
        onChange={handleFileChange}
      />

      <div className="relative h-52">
        <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
        <div className="absolute bottom-4 left-5 right-5">
          <div className="flex items-center gap-2 text-white mb-1">
            <Stethoscope className="h-5 w-5" />
            <p className="text-xs font-semibold tracking-wider">ALPHA INSIGHT</p>
          </div>
          <h1 className="font-display text-3xl leading-tight">ANÁLISE INTELIGENTE<br />DOS SEUS EXAMES</h1>
        </div>
      </div>

      <div className="px-5 pb-6">
        <div className="flex bg-card rounded-xl p-1 mb-5">
          <button
            onClick={() => {
              setTab("nova");
              setCurrentAnalysis(null);
            }}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold uppercase tracking-wider transition-colors ${
              tab === "nova" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Nova análise
          </button>
          <button
            onClick={() => setTab("clinica")}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold uppercase tracking-wider transition-colors ${
              tab === "clinica" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Histórico
          </button>
          <button
            onClick={() => setTab("evolucao")}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold uppercase tracking-wider transition-colors ${
              tab === "evolucao" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Evolução
          </button>
        </div>

        {isAnalyzing ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 blur-xl bg-primary/20 rounded-full animate-pulse" />
              <Loader2 className="h-12 w-12 text-primary animate-spin relative" />
            </div>
            <div>
              <h3 className="font-display text-xl">ALPHA INSIGHT ESTÁ ANALISANDO SEU EXAME...</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-[250px] mx-auto">
                Lendo o documento e comparando os resultados com os intervalos de referência informados no exame.
              </p>
            </div>
          </div>
        ) : tab === "nova" && !currentAnalysis ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files?.[0];
                if (file && file.type === "application/pdf") {
                  try {
                    const result = await uploadExame(file);
                    setCurrentAnalysis(result);
                  } catch (err) {}
                } else {
                  toast.error("Por favor, envie um arquivo PDF.");
                }
              }}
              className="w-full bg-card/40 border-2 border-dashed border-primary/40 rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-card/60 transition-colors group"
            >
              <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-display text-xl uppercase mb-1">Analisar Exame</h3>
              <p className="text-sm text-muted-foreground">Arraste seu PDF aqui ou clique para selecionar (Max 10MB)</p>
            </div>

            <div className="bg-card/40 border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope className="h-4 w-4 text-primary" />
                <h3 className="font-display text-base uppercase">Como a leitura funciona</h3>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Comparação com faixas de referência de performance</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Identificação educacional de marcadores fora da faixa</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Parecer informativo — sem recomendações médicas</span>
                </li>
              </ul>
            </div>
          </div>
        ) : currentAnalysis ? (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <button 
              onClick={() => {
                setCurrentAnalysis(null);
                setTab("nova");
              }}
              className="mb-4 text-xs text-primary flex items-center gap-1 uppercase font-bold"
            >
              <ChevronRight className="h-3 w-3 rotate-180" /> Voltar
            </button>
            <AnalysisResults
              parecer={currentAnalysis.parecer_tecnico ?? currentAnalysis.resumo_executivo}
              marcadores={currentAnalysis.marcadores ?? []}

            />
          </div>
        ) : tab === "clinica" ? (
          <div className="space-y-4 animate-in fade-in duration-500">
            {isLoadingAnalyses ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : analyses?.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p>Nenhuma análise encontrada.</p>
                <button 
                  onClick={() => setTab("nova")}
                  className="text-primary text-sm font-bold mt-2 uppercase"
                >
                  Começar agora
                </button>
              </div>
            ) : (
              analyses?.map((analise) => (
                <button
                  key={analise.id}
                  onClick={() => setCurrentAnalysis({
                    parecer_tecnico: analise.parecer_ia,
                    marcadores: analise.exames_biomarcadores.map((b: any) => ({
                      codigo: b.codigo,
                      nome: b.nome,
                      valor: b.valor,
                      unidade: b.unidade,
                      status: b.classificacao,
                      intervalo_referencia: b.valor_referencia,
                      insight_clinico: b.observacao
                    }))
                  })}
                  className="w-full bg-card/40 border border-border rounded-2xl p-4 flex items-center gap-4 text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-primary">
                    {analise.exames_biomarcadores.length}
                  </div>
                  <div className="flex-1">
                    <p className="font-display text-base uppercase">Análise de {new Date(analise.created_at).toLocaleDateString()}</p>
                    <p className="text-xs text-muted-foreground">{analise.exames_biomarcadores.length} Biomarcadores analisados</p>
                  </div>
                  <div className="flex items-center gap-1 text-primary text-xs font-bold uppercase">
                    Ver detalhes
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-6">
              <LineChartIcon className="h-5 w-5 text-primary" />
              <h3 className="font-display text-xl uppercase">Evolução de Biomarcadores</h3>
            </div>
            <EvolutionChart />
          </div>
        )}
      </div>
    </div>
  );
};

export default DrIA;
