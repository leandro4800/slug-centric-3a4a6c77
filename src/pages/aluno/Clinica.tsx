import { useState, useRef } from "react";
import { Stethoscope, Upload, FlaskConical, Send, ChevronRight, Loader2, History, FileText, ScanLine } from "lucide-react";
import { useBranding } from "@/contexts/BrandingProvider";
import heroDefault from "@/assets/hero-default.jpg";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AnalysisResults } from "@/components/aluno/clinica/AnalysisResults";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const Clinica = () => {
  const [tab, setTab] = useState<"nova" | "clinica">("nova");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { tenant } = useBranding();
  const queryClient = useQueryClient();
  const hero = tenant?.hero_url || heroDefault;

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
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Por favor, envie um arquivo PDF.");
        return;
      }
      uploadAndAnalyze(file);
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
      icon: FlaskConical, 
      title: "RELATAR PROTOCOLO", 
      sub: "Descreva substâncias, dosagens e ciclos em uso.",
      onClick: () => toast.info("Funcionalidade em desenvolvimento")
    },
    { 
      icon: Send, 
      title: "COLAR EXAMES MANUALMENTE", 
      sub: "Digite ou cole seus resultados laboratoriais.",
      onClick: () => toast.info("Funcionalidade em desenvolvimento")
    },
  ];

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
          <p className="text-xs text-accent font-semibold tracking-wider">{(tenant?.nome || "TIME").toUpperCase()} ORIGINALS</p>
          <h1 className="font-display text-3xl mt-1 leading-tight">CENTRO DE ANÁLISE<br />METABÓLICA</h1>
        </div>
      </div>

      <div className="px-5 pb-6">
        <div className="flex bg-secondary rounded-xl p-1 mb-5">
          <button
            onClick={() => {
              setTab("nova");
              setCurrentAnalysis(null);
            }}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold uppercase tracking-wider transition-colors ${
              tab === "nova" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            }`}
          >
            Nova análise
          </button>
          <button
            onClick={() => setTab("clinica")}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold uppercase tracking-wider transition-colors ${
              tab === "clinica" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            }`}
          >
            Clínica
          </button>
        </div>

        {isAnalyzing ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative w-32 h-40">
              <div className="absolute inset-0 bg-card border-2 border-accent/40 rounded-lg shadow-lg overflow-hidden">
                <FileText className="absolute inset-0 m-auto h-16 w-16 text-accent/30" strokeWidth={1} />
                <div className="absolute inset-x-3 top-3 space-y-1.5">
                  <div className="h-1 bg-accent/20 rounded w-3/4" />
                  <div className="h-1 bg-accent/20 rounded w-full" />
                  <div className="h-1 bg-accent/20 rounded w-2/3" />
                </div>
                <div className="absolute inset-x-3 bottom-3 space-y-1.5">
                  <div className="h-1 bg-accent/20 rounded w-full" />
                  <div className="h-1 bg-accent/20 rounded w-1/2" />
                </div>
                <div className="absolute inset-x-0 h-0.5 bg-accent shadow-[0_0_12px_2px_hsl(var(--accent))] animate-scan" />
                <div className="absolute inset-x-0 h-8 bg-gradient-to-b from-accent/30 to-transparent animate-scan" />
              </div>
              <div className="absolute -top-3 -right-3 bg-accent text-accent-foreground rounded-full p-2 shadow-lg animate-pulse">
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
              <button
                key={a.title}
                onClick={a.onClick}
                className={`w-full bg-card/40 ${a.dashed ? "border-dashed" : ""} border border-accent/40 rounded-2xl p-4 flex items-center gap-4 text-left hover:bg-card/60 transition-colors`}
              >
                <div className="w-12 h-12 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
                  <a.icon className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-display text-base uppercase leading-tight">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.sub}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-accent" />
              </button>
            ))}

            <div className="bg-card/40 border border-border rounded-2xl p-5 mt-5">
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope className="h-4 w-4 text-accent" />
                <h3 className="font-display text-base uppercase">Como funciona</h3>
              </div>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-accent font-bold">1.</span>
                  <span>Envie seu exame (PDF recomendado para maior precisão)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent font-bold">2.</span>
                  <span>O Dr. IA extrai biomarcadores e calcula seu score de performance</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent font-bold">3.</span>
                  <span>Acesse o parecer técnico e as sugestões de otimização</span>
                </li>
              </ol>
            </div>
          </div>
        ) : currentAnalysis ? (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <button 
              onClick={() => setCurrentAnalysis(null)}
              className="mb-4 text-xs text-accent flex items-center gap-1 uppercase font-bold"
            >
              <ChevronRight className="h-3 w-3 rotate-180" /> Fazer nova análise
            </button>
            <AnalysisResults 
              score={currentAnalysis.score_performance}
              parecer={currentAnalysis.parecer_tecnico}
              marcadores={currentAnalysis.marcadores}
            />
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-500">
            {isLoadingAnalyses ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="h-8 w-8 text-accent animate-spin" />
              </div>
            ) : analyses?.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p>Nenhuma análise encontrada.</p>
                <button 
                  onClick={() => setTab("nova")}
                  className="text-accent text-sm font-bold mt-2 uppercase"
                >
                  Começar agora
                </button>
              </div>
            ) : (
              analyses?.map((analise) => (
                <button
                  key={analise.id}
                  onClick={() => setCurrentAnalysis({
                    score_performance: analise.score_performance,
                    parecer_tecnico: analise.parecer_ia,
                    marcadores: analise.exames_biomarcadores.map((b: any) => ({
                      nome: b.nome,
                      valor: b.valor,
                      unidade: b.unidade,
                      status: b.classificacao,
                      observacao: b.observacao
                    }))
                  })}
                  className="w-full bg-card/40 border border-border rounded-2xl p-4 flex items-center gap-4 text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center font-bold text-accent">
                    {analise.score_performance}%
                  </div>
                  <div className="flex-1">
                    <p className="font-display text-base">Análise de {new Date(analise.created_at).toLocaleDateString()}</p>
                    <p className="text-xs text-muted-foreground">{analise.exames_biomarcadores.length} Marcadores detectados</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-accent" />
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Clinica;
