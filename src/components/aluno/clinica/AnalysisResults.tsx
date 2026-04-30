import { MarkerCard } from "./MarkerCard";
import { Progress } from "@/components/ui/progress";

interface Marker {
  nome: string;
  valor: number;
  unidade: string;
  status: "otimo" | "atencao" | "critico";
  observacao?: string;
}

interface AnalysisResultsProps {
  score: number;
  parecer: string;
  marcadores: Marker[];
}

export const AnalysisResults = ({ score, parecer, marcadores }: AnalysisResultsProps) => {
  return (
    <div className="space-y-6">
      <div className="bg-card/40 border border-border rounded-2xl p-5">
        <div className="flex justify-between items-end mb-4">
          <h3 className="font-display text-lg">SCORE DE PERFORMANCE</h3>
          <span className="text-3xl font-bold text-accent">{score}%</span>
        </div>
        <Progress value={score} className="h-3" />
        <p className="text-xs text-muted-foreground mt-3">
          Este score reflete sua proximidade com os níveis ideais ("ouro") para performance esportiva, baseados no cruzamento de dados científicos.
        </p>
      </div>

      <div className="bg-card/40 border border-border rounded-2xl p-5">
        <h3 className="font-display text-lg mb-4">PARECER TÉCNICO DR. IA</h3>
        <div className="prose prose-invert prose-sm max-w-none text-muted-foreground">
          {parecer.split('\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-display text-lg px-1">BIOMARCADORES DETECTADOS</h3>
        <div className="grid grid-cols-1 gap-3">
          {marcadores.map((m, i) => (
            <MarkerCard key={i} {...m} />
          ))}
        </div>
      </div>
    </div>
  );
};
