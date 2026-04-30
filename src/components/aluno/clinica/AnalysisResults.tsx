import { MarkerCard } from "./MarkerCard";
import { cn } from "@/lib/utils";
import { Pill, ShieldAlert, Stethoscope } from "lucide-react";

interface Marker {
  codigo: string;
  nome: string;
  valor: number;
  unidade: string;
  status: "Otimizado" | "Alerta" | "Critico" | "Subotimizado";
  insight_clinico?: string;
  sugestao_medicamento?: string;
}

interface AnalysisResultsProps {
  score: number;
  parecer: string;
  marcadores: Marker[];
  conduta?: string[];
  sugestoes_medicamentos?: string[];
  aviso_medico?: string;
}

export const AnalysisResults = ({ score, parecer, marcadores, conduta, sugestoes_medicamentos, aviso_medico }: AnalysisResultsProps) => {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-green-500";
    if (s >= 50) return "text-accent";
    return "text-red-500";
  };

  const scoreColor = getScoreColor(score);
  const meds = sugestoes_medicamentos ?? [];
  const aviso = aviso_medico ?? "Esta análise é educativa e não substitui consulta médica. Procure sempre um médico antes de iniciar qualquer medicamento ou suplemento.";

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* SCORE — Hero card cinematográfico */}
      <div className="relative bg-gradient-to-br from-card via-card/80 to-background border border-border rounded-3xl p-6 flex flex-col items-center text-center overflow-hidden shadow-[0_20px_60px_-20px_hsl(0_0%_0%/0.8)]">
        <div className={cn("absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 blur-[80px] opacity-30 rounded-full", scoreColor.replace("text-", "bg-"))} />

        <div className="flex items-center gap-2 mb-4 relative z-10">
          <Stethoscope className="h-4 w-4 text-accent" />
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
          "Seu corpo está {score}% próximo do potencial máximo de performance baseado nos biomarcadores analisados."
        </p>
      </div>

      {/* RESUMO */}
      <div className="bg-gradient-to-br from-card/70 to-card/30 border border-border rounded-3xl p-6">
        <h3 className="font-display text-lg mb-4 uppercase tracking-wider text-accent border-b border-accent/20 pb-2">Resumo Executivo</h3>
        <div className="prose prose-invert prose-sm max-w-none text-muted-foreground leading-relaxed">
          {(parecer ?? "").split('\n').map((para, i) => (
            para.trim() ? <p key={i} className="mb-4 last:mb-0">{para}</p> : null
          ))}
        </div>
      </div>

      {/* CONDUTA */}
      <div className="bg-gradient-to-br from-card/70 to-card/30 border border-border rounded-3xl p-6">
        <h3 className="font-display text-lg mb-4 uppercase tracking-wider text-accent border-b border-accent/20 pb-2">Conduta Sugerida</h3>
        <ul className="space-y-3">
          {conduta && conduta.length > 0 ? (
            conduta.map((item, i) => (
              <li key={i} className="flex gap-3 text-sm text-muted-foreground items-start">
                <span className="text-accent font-bold mt-1 shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))
          ) : (
            <p className="text-sm text-muted-foreground italic">Consulte o resumo executivo para as recomendações.</p>
          )}
        </ul>
      </div>

      {/* SUGESTÕES DE MEDICAMENTOS */}
      {meds.length > 0 && (
        <div className="bg-gradient-to-br from-accent/10 via-card/60 to-card/30 border border-accent/30 rounded-3xl p-6 shadow-[0_0_40px_-15px_hsl(var(--accent)/0.4)]">
          <div className="flex items-center gap-2 mb-4 border-b border-accent/20 pb-2">
            <Pill className="h-5 w-5 text-accent" />
            <h3 className="font-display text-lg uppercase tracking-wider text-accent">Sugestões de Suporte</h3>
          </div>
          <ul className="space-y-3">
            {meds.map((m, i) => (
              <li key={i} className="flex gap-3 text-sm text-foreground/90 items-start">
                <div className="w-5 h-5 rounded-md bg-accent/20 border border-accent/40 flex items-center justify-center shrink-0 mt-0.5">
                  <Pill className="h-3 w-3 text-accent" />
                </div>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AVISO MÉDICO */}
      <div className="bg-gradient-to-br from-amber-500/10 to-card/30 border border-amber-500/30 rounded-3xl p-5 flex gap-3 items-start">
        <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-display text-sm uppercase tracking-wider text-amber-500 mb-1">Aviso Médico</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{aviso}</p>
        </div>
      </div>

      {/* BIOMARCADORES */}
      <div className="space-y-4">
        <h3 className="font-display text-lg px-1 uppercase tracking-wider">Biomarcadores</h3>
        <div className="grid grid-cols-1 gap-3">
          {(marcadores ?? []).map((m, i) => (
            <MarkerCard
              key={i}
              {...m}
              observacao={m.insight_clinico}
              sugestao_medicamento={m.sugestao_medicamento}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
