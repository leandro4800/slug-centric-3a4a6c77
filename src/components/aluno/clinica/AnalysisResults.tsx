import { MarkerCard } from "./MarkerCard";
import { cn } from "@/lib/utils";

interface Marker {
  codigo: string;
  nome: string;
  valor: number;
  unidade: string;
  status: "Otimizado" | "Alerta" | "Critico" | "Subotimizado";
  observacao?: string;
}

interface AnalysisResultsProps {
  score: number;
  parecer: string;
  marcadores: Marker[];
  conduta?: string[];
}

export const AnalysisResults = ({ score, parecer, marcadores, conduta }: AnalysisResultsProps) => {
  // Color based on score
  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-green-500";
    if (s >= 50) return "text-accent"; // Amarelo/Dourado do app
    return "text-red-500";
  };

  const scoreColor = getScoreColor(score);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="bg-card/40 border border-border rounded-3xl p-6 flex flex-col items-center text-center relative overflow-hidden">
        {/* Background glow */}
        <div className={cn("absolute inset-0 blur-[60px] opacity-10 rounded-full", scoreColor.replace("text-", "bg-"))} />
        
        <h3 className="font-display text-lg uppercase mb-6 tracking-widest relative z-10">Score de Performance</h3>
        
        <div className="relative w-40 h-40 mb-6 z-10">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="80"
              cy="80"
              r="74"
              className="fill-none stroke-secondary stroke-[10]"
            />
            <circle
              cx="80"
              cy="80"
              r="74"
              className={cn("fill-none stroke-[10] transition-all duration-1000", scoreColor.replace("text-", "stroke-"))}
              strokeDasharray={465}
              strokeDashoffset={465 - (465 * score) / 100}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-5xl font-bold font-display", scoreColor)}>{score}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter -mt-1">Pontos</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground max-w-xs relative z-10 italic">
          "Seu corpo está {score}% próximo do potencial máximo de performance atlética baseado nos biomarcadores analisados."
        </p>
      </div>

      <div className="bg-card/40 border border-border rounded-3xl p-6">
        <h3 className="font-display text-lg mb-4 uppercase tracking-wider text-accent border-b border-accent/10 pb-2">Resumo Executivo</h3>
        <div className="prose prose-invert prose-sm max-w-none text-muted-foreground leading-relaxed">
          {parecer.split('\n').map((para, i) => (
            para.trim() ? <p key={i} className="mb-4 last:mb-0">{para}</p> : null
          ))}
        </div>
      </div>

      <div className="bg-card/40 border border-border rounded-3xl p-6">
        <h3 className="font-display text-lg mb-4 uppercase tracking-wider text-accent border-b border-accent/10 pb-2">Conduta Sugerida</h3>
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

      <div className="space-y-4">
        <h3 className="font-display text-lg px-1 uppercase tracking-wider">Biomarcadores</h3>
        <div className="grid grid-cols-1 gap-3">
          {marcadores.map((m, i) => (
            <MarkerCard key={i} {...m} />
          ))}
        </div>
      </div>
    </div>
  );
};

