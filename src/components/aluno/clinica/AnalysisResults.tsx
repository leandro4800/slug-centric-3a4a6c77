import { MarkerCard } from "./MarkerCard";
import { cn } from "@/lib/utils";
import { ShieldAlert, Stethoscope, Volume2, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SCIENTIFIC_SOURCES = [
  { label: "NIH — Interpretação de exames laboratoriais", url: "https://www.ncbi.nlm.nih.gov/books/NBK204/" },
  { label: "MedlinePlus — Resultados de exames", url: "https://medlineplus.gov/lab-tests/" },
  { label: "OMS — Saúde", url: "https://www.who.int/health-topics" },
  { label: "PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/" },
] as const;

interface Marker {
  codigo: string;
  nome: string;
  valor: number;
  unidade: string;
  status: "Otimizado" | "Alerta" | "Critico" | "Subotimizado";
  insight_clinico?: string;
}

interface AnalysisResultsProps {
  score: number;
  parecer: string;
  marcadores: Marker[];
}

export const AnalysisResults = ({ score, parecer, marcadores }: AnalysisResultsProps) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSpeak = async () => {
    if (isPlaying) return;

    setIsPlaying(true);
    try {
      const textToSpeak = parecer || "Análise laboratorial processada.";

      const { data, error } = await supabase.functions.invoke("knowledge-qa", {
        body: {
          action: "text-to-speech",
          text: textToSpeak,
        },
      });

      if (error) throw error;
      if (!data?.audioContent) throw new Error("Falha ao gerar áudio");

      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      await audio.play();
    } catch (err: unknown) {
      console.error("Erro ao gerar áudio:", err);
      toast.error("Não foi possível gerar o áudio do parecer.");
      setIsPlaying(false);
    }
  };

  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-green-500";
    if (s >= 50) return "text-primary";
    return "text-primary";
  };

  const scoreColor = getScoreColor(score);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="relative bg-gradient-to-br from-card via-card/80 to-background border border-border rounded-3xl p-6 flex flex-col items-center text-center overflow-hidden shadow-[0_20px_60px_-20px_hsl(0_0%_0%/0.8)]">
        <div className={cn("absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 blur-[80px] opacity-30 rounded-full", scoreColor.replace("text-", "bg-"))} />

        <div className="flex items-center gap-2 mb-4 relative z-10">
          <Stethoscope className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm uppercase tracking-[0.25em] text-muted-foreground">Score de Performance</h3>
        </div>

        <div className="relative w-44 h-44 mb-6 z-10">
          <svg className="w-full h-full -rotate-90">
            <circle cx="88" cy="88" r="78" className="fill-none stroke-secondary stroke-[10]" />
            <circle
              cx="88" cy="88" r="78"
              className={cn("fill-none stroke-[10] transition-all duration-1000 drop-shadow-[0_0_8px_currentColor]", scoreColor.replace("text-", "stroke-"))}
              strokeDasharray={490}
              strokeDashoffset={490 - (490 * score) / 100}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-6xl font-bold font-display leading-none", scoreColor)}>{score}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] mt-1">/ 100</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground max-w-xs relative z-10 italic">
          Comparação educacional dos biomarcadores com faixas de referência de performance.
        </p>
      </div>

      <div className="bg-gradient-to-br from-card/70 to-card/30 border border-border rounded-none p-6">
        <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
          <h3 className="font-display text-lg uppercase tracking-[0.2em] text-primary">Resumo Executivo</h3>
          <button
            onClick={handleSpeak}
            disabled={isPlaying}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
          >
            {isPlaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
            {isPlaying ? "Ouvindo..." : "Parecer em Áudio"}
          </button>
        </div>
        <div className="prose prose-invert prose-sm max-w-none text-muted-foreground leading-relaxed">
          {(parecer ?? "").split("\n").map((para, i) =>
            para.trim() ? <p key={i} className="mb-4 last:mb-0">{para}</p> : null,
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-500/10 to-card/30 border border-amber-500/30 rounded-none p-5 flex gap-3 items-start">
        <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-display text-sm uppercase tracking-wider text-amber-500 mb-1">Aviso</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Interpretação educacional de exames laboratoriais. Não substitui consulta, diagnóstico ou
            prescrição médica. Discuta seus resultados com um profissional de saúde.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-display text-lg px-1 uppercase tracking-[0.2em] text-primary">Biomarcadores</h3>
        <div className="grid grid-cols-1 gap-3">
          {(marcadores ?? []).map((m, i) => (
            <MarkerCard key={i} {...m} observacao={m.insight_clinico} />
          ))}
        </div>
      </div>

      <div className="border-t border-border/50 pt-4 space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Fontes científicas</p>
        <ul className="space-y-1.5">
          {SCIENTIFIC_SOURCES.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-primary/90 underline underline-offset-2 hover:text-primary"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
