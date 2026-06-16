import { useState, useRef } from "react";
import { Stethoscope, Upload, Send, ChevronRight, Loader2, History, FileText, ScanLine } from "lucide-react";
import { useBranding } from "@/contexts/BrandingProvider";
import scanFigure from "@/assets/scan-figure.png";
// Fundo do Centro de Análise Metabólica é fixo (anéis de scan + boneco holográfico). Hero do tenant não é usado aqui.
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AnalysisResults } from "@/components/aluno/clinica/AnalysisResults";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const Clinica = () => {
  const [tab, setTab] = useState<"nova" | "clinica">("nova");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { tenant } = useBranding();
  const queryClient = useQueryClient();

  // Fetch past analyses
  const { data: analyses, isLoading: isLoadingAnalyses } = useQuery({
    queryKey: ["analises_clinicas"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("analises_clinicas")
        .select(`
          *,
          exames_biomarcadores (*)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: tab === "clinica"
  });

  const uploadAndAnalyze = async (file: File) => {
    try {
      setIsAnalyzing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 1. Upload to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("exames_pdfs")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Call Edge Function
      const { data, error: functionError } = await supabase.functions.invoke("analyze-exams", {
        body: { file_path: fileName }
      });

      if (functionError) throw functionError;

      setCurrentAnalysis(data);
      queryClient.invalidateQueries({ queryKey: ["analises_clinicas"] });
      toast.success("Análise concluída com sucesso!");
    } catch (error: any) {
      console.error("Erro na análise:", error);
      toast.error(error.message || "Erro ao processar análise. Tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permitir reenviar mesmo arquivo
    if (file) {
      const ok = file.type === "application/pdf" || file.type.startsWith("image/");
      if (!ok) {
        toast.error("Envie um PDF ou foto do exame.");
        return;
      }
      uploadAndAnalyze(file);
    }
  };

  const analyzeText = async (texto: string) => {
    try {
      setPasteOpen(false);
      setIsAnalyzing(true);
      const { data, error: functionError } = await supabase.functions.invoke("analyze-exams", {
        body: { texto_exame: texto }
      });
      if (functionError) throw functionError;
      setCurrentAnalysis(data);
      setPasteText("");
      queryClient.invalidateQueries({ queryKey: ["analises_clinicas"] });
      toast.success("Análise concluída com sucesso!");
    } catch (error: any) {
      console.error("Erro na análise:", error);
      toast.error(error.message || "Erro ao processar análise. Tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const actions = [
    {
      icon: Upload,
      title: "ENVIAR PROTOCOLO OU EXAME",
      sub: "PDF (Recomendado)",
      dashed: true,
      onClick: () => fileInputRef.current?.click()
    },
    {
      icon: Send,
      title: "COLAR EXAMES MANUALMENTE",
      sub: "Digite ou cole seus resultados laboratoriais.",
      onClick: () => setPasteOpen(true)
    },
  ];

  return (
    <div className="border border-border rounded-3xl m-3 overflow-hidden min-h-[calc(100vh-120px)] bg-background">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="application/pdf,image/*"
        onChange={handleFileChange}
      />

      <div className="relative h-[460px] min-h-[58vh] overflow-hidden bg-gradient-to-b from-background via-[hsl(0_0%_4%)] to-background">
        {/* Fundo travado: scan de anéis sólidos. Não usa hero do tenant para não trocar com a foto de perfil. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(34,211,238,0.08)_0%,_transparent_60%)]" />

        {/* Rotating tech rings overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-[520px] h-[520px] max-w-[95%] max-h-[95%] rounded-full border-2 border-dashed border-cyan-300/70 animate-[spin_18s_linear_infinite]"
            style={{ boxShadow: "0 0 60px rgba(34,211,238,0.5) inset, 0 0 50px rgba(34,211,238,0.4)" }}
          />
          <div
            className="absolute w-[400px] h-[400px] max-w-[80%] max-h-[80%] rounded-full border-4 animate-[spin_10s_linear_infinite]"
            style={{
              borderTopColor: "rgba(34,211,238,1)",
              borderRightColor: "rgba(34,211,238,0.1)",
              borderBottomColor: "rgba(34,211,238,0.6)",
              borderLeftColor: "rgba(34,211,238,0.1)",
              boxShadow: "0 0 40px rgba(34,211,238,0.6)",
            }}
          />
          <div
            className="absolute w-[280px] h-[280px] max-w-[65%] max-h-[65%] rounded-full border-2 border-dotted border-cyan-200/80 animate-[spin_8s_linear_infinite_reverse]"
            style={{ boxShadow: "0 0 30px rgba(34,211,238,0.5)" }}
          />
          <div className="absolute w-[300px] h-[300px] max-w-[70%] max-h-[70%] rounded-full bg-cyan-400/10 animate-pulse" />
          <div className="absolute h-[78%] flex items-center justify-center" style={{ perspective: "900px" }}>
            <img
              src={scanFigure}
              alt="Boneco holográfico de scan corporal"
              width={512}
              height={896}
              loading="lazy"
              className="h-full w-auto object-contain drop-shadow-[0_0_30px_rgba(34,211,238,0.7)] animate-holo-turn"
            />
          </div>
          <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent animate-scan shadow-[0_0_16px_4px_rgba(34,211,238,0.8)]" />

          {/* HUD: métricas computacionais flutuando ao redor */}
          <div className="absolute inset-0 font-mono text-[9px] text-cyan-300/90 select-none">
            {/* Cantos com blocos de telemetria */}
            <div className="absolute top-3 left-3 space-y-0.5 leading-tight">
              <p className="text-cyan-400/60 tracking-[0.2em]">// SYS.SCAN</p>
              <p>VO2_MAX <span className="text-cyan-200">52.4</span> ml/kg</p>
              <p>HRV     <span className="text-cyan-200 animate-pulse">68</span> ms</p>
              <p>BPM     <span className="text-cyan-200">62</span></p>
              <p>SpO2    <span className="text-cyan-200">98%</span></p>
            </div>
            <div className="absolute top-3 right-3 text-right space-y-0.5 leading-tight">
              <p className="text-cyan-400/60 tracking-[0.2em]">// BIO.MARK</p>
              <p>TST  <span className="text-cyan-200">842</span> ng/dL</p>
              <p>CORT <span className="text-cyan-200">14.2</span> µg/dL</p>
              <p>GLU  <span className="text-cyan-200">88</span> mg/dL</p>
              <p>HB1c <span className="text-cyan-200">5.1%</span></p>
            </div>
            <div className="absolute bottom-24 left-3 space-y-0.5 leading-tight">
              <p className="text-cyan-400/60 tracking-[0.2em]">// MUSC.IDX</p>
              <p>LBM  <span className="text-cyan-200">71.8</span> kg</p>
              <p>BF%  <span className="text-cyan-200">12.4</span></p>
              <p>FFMI <span className="text-cyan-200">22.6</span></p>
            </div>
            <div className="absolute bottom-24 right-3 text-right space-y-0.5 leading-tight">
              <p className="text-cyan-400/60 tracking-[0.2em]">// NEURO</p>
              <p>RT   <span className="text-cyan-200 animate-pulse">214</span> ms</p>
              <p>FOC  <span className="text-cyan-200">94%</span></p>
              <p>SLP  <span className="text-cyan-200">7h32</span></p>
            </div>

            {/* Brackets de targeting */}
            <div className="absolute top-1/2 left-6 -translate-y-1/2 text-cyan-300/70">
              <div className="w-3 h-3 border-l-2 border-t-2" />
              <div className="w-3 h-3 border-l-2 border-b-2 mt-12" />
            </div>
            <div className="absolute top-1/2 right-6 -translate-y-1/2 text-cyan-300/70 flex flex-col items-end">
              <div className="w-3 h-3 border-r-2 border-t-2" />
              <div className="w-3 h-3 border-r-2 border-b-2 mt-12" />
            </div>

            {/* Stream de dados binários */}
            <p className="absolute top-1/3 left-1/2 -translate-x-1/2 text-cyan-400/40 tracking-widest animate-pulse text-[8px]">
              01001000 11010110 10110011 ▮ANALYZING
            </p>
            <p className="absolute bottom-[88px] left-1/2 -translate-x-1/2 text-cyan-400/40 tracking-widest text-[8px]">
              ◢ DEEP_NEURAL_SCAN ▸ {Math.floor(Math.random() * 30) + 70}.{Math.floor(Math.random() * 99)}% ◣
            </p>
          </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/30" />
        <div className="absolute bottom-5 left-5 right-5">
          <p className="text-[11px] text-primary font-bold tracking-[0.25em] uppercase drop-shadow-lg">{(tenant?.nome || "TIME").toUpperCase()} ORIGINALS</p>
          <h1 className="font-display text-4xl mt-1.5 leading-[0.95] drop-shadow-2xl">CENTRO DE ANÁLISE<br />METABÓLICA</h1>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-1 w-10 bg-primary rounded-full shadow-glow" />
            <p className="text-[11px] text-muted-foreground uppercase tracking-[0.2em]">Dr. IA — Performance & Longevidade</p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-6">
        <div className="flex bg-card/80 border border-border rounded-xl p-1 mb-5">
          <Button
            variant={tab === "nova" ? "default" : "ghost"}
            onClick={() => {
              setTab("nova");
              setCurrentAnalysis(null);
            }}
            className="flex-1"
          >
            Nova análise
          </Button>
          <Button
            variant={tab === "clinica" ? "default" : "ghost"}
            onClick={() => setTab("clinica")}
            className="flex-1"
          >
            Clínica
          </Button>
        </div>

        {isAnalyzing ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative w-32 h-40">
              <div className="absolute inset-0 bg-card border-2 border-primary/40 rounded-xl shadow-lg overflow-hidden">
                <FileText className="absolute inset-0 m-auto h-16 w-16 text-primary/30" strokeWidth={1} />
                <div className="absolute inset-x-3 top-3 space-y-1.5">
                  <div className="h-1 bg-primary/20 rounded w-3/4" />
                  <div className="h-1 bg-primary/20 rounded w-full" />
                  <div className="h-1 bg-primary/20 rounded w-2/3" />
                </div>
                <div className="absolute inset-x-3 bottom-3 space-y-1.5">
                  <div className="h-1 bg-primary/20 rounded w-full" />
                  <div className="h-1 bg-primary/20 rounded w-1/2" />
                </div>
                <div className="absolute inset-x-0 h-0.5 bg-primary shadow-[0_0_12px_2px_hsl(var(--primary))] animate-scan" />
                <div className="absolute inset-x-0 h-8 bg-gradient-to-b from-primary/30 to-transparent animate-scan" />
              </div>
              <div className="absolute -top-3 -right-3 bg-primary text-primary-foreground rounded-xl p-2 shadow-lg animate-pulse">
                <ScanLine className="h-4 w-4" />
              </div>
            </div>
            <div>
              <h3 className="font-display text-xl">DR. IA ESTÁ ANALISANDO...</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-[280px] mx-auto">
                Escaneando o documento, extraindo biomarcadores e cruzando com dados de performance.
              </p>
            </div>
          </div>
        ) : tab === "nova" && !currentAnalysis ? (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {actions.map((a) => (
              <Button
                key={a.title}
                variant="secondary"
                onClick={a.onClick}
                className="w-full h-auto py-4 flex items-center gap-4 text-left justify-start"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.5)]">
                  <a.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-display text-base uppercase leading-tight tracking-wide">{a.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 tracking-widest">{a.sub}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-primary" />
              </Button>
            ))}

            <div className="bg-card/40 border border-border rounded-xl p-5 mt-5">
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope className="h-4 w-4 text-primary" />
                <h3 className="font-display text-base uppercase tracking-widest text-primary">Como funciona</h3>
              </div>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">1.</span>
                  <span>Envie seu exame (PDF recomendado para maior precisão)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">2.</span>
                  <span>O Dr. IA extrai biomarcadores e calcula seu score de performance</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">3.</span>
                  <span>Acesse o parecer técnico e as sugestões de otimização</span>
                </li>
              </ol>
            </div>
          </div>
        ) : currentAnalysis ? (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <Button
              variant="link"
              onClick={() => setCurrentAnalysis(null)}
              className="mb-4 text-primary p-0 h-auto self-start"
            >
              <ChevronRight className="h-3 w-3 rotate-180" /> Fazer nova análise
            </Button>
            <AnalysisResults 
              score={currentAnalysis.score_performance}
              parecer={currentAnalysis.parecer_tecnico ?? currentAnalysis.resumo_executivo}
              marcadores={currentAnalysis.marcadores}
              conduta={currentAnalysis.conduta_sugerida}
              sugestoes_medicamentos={currentAnalysis.sugestoes_medicamentos}
              aviso_medico={currentAnalysis.aviso_medico}
            />
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-500">
            {isLoadingAnalyses ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : analyses?.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p>Nenhuma análise encontrada.</p>
                <Button
                  variant="link"
                  onClick={() => setTab("nova")}
                  className="text-primary mt-2"
                >
                  Começar agora
                </Button>
              </div>
            ) : (
              analyses?.map((analise: any) => (
                <Button
                  key={analise.id}
                  variant="secondary"
                  onClick={() => setCurrentAnalysis({
                    score_performance: analise.score_performance,
                    parecer_tecnico: analise.parecer_ia,
                    conduta_sugerida: analise.dados_extraidos?.conduta_sugerida ?? (analise.resumo_clinico ? analise.resumo_clinico.split('\n') : []),
                    sugestoes_medicamentos: analise.dados_extraidos?.sugestoes_medicamentos,
                    aviso_medico: analise.dados_extraidos?.aviso_medico,
                    marcadores: analise.exames_biomarcadores.map((b: any) => ({
                      codigo: b.codigo,
                      nome: b.nome,
                      valor: b.valor,
                      unidade: b.unidade,
                      status: b.classificacao,
                      insight_clinico: b.observacao,
                      sugestao_medicamento: (analise.dados_extraidos?.marcadores ?? []).find((m: any) => m.codigo === b.codigo)?.sugestao_medicamento
                    }))
                  })}
                  className="w-full h-auto py-4 flex items-center gap-4 text-left justify-start"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-primary font-display text-lg shadow-[0_0_20px_-5px_hsl(var(--primary)/0.5)]">
                    {analise.score_performance}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-base uppercase tracking-wide">Análise de {new Date(analise.created_at).toLocaleDateString()}</p>
                    <p className="text-[10px] text-muted-foreground tracking-widest">{analise.exames_biomarcadores.length} marcadores detectados</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-primary shrink-0" />
                </Button>
              ))
            )}
          </div>
        )}
      </div>

      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Colar exames manualmente</DialogTitle>
            <DialogDescription>
              Cole os resultados laboratoriais (nome do marcador, valor e unidade). O Dr. IA vai interpretar e montar sua análise.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"Ex.:\nTestosterona Total: 720 ng/dL\nHematócrito: 48%\nGlicemia: 92 mg/dL\nVitamina D: 28 ng/mL"}
            className="min-h-[220px] font-mono text-sm"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPasteOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => analyzeText(pasteText.trim())}
              disabled={pasteText.trim().length < 20}
            >
              Analisar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clinica;
