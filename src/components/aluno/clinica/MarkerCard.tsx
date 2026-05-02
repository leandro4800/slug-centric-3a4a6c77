import { AlertCircle, CheckCircle2, Info, Pill } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarkerCardProps {
  nome: string;
  valor: number;
  unidade: string;
  status: "Otimizado" | "Alerta" | "Critico" | "Subotimizado";
  observacao?: string;
  sugestao_medicamento?: string;
}

export const MarkerCard = ({ nome, valor, unidade, status, observacao, sugestao_medicamento }: MarkerCardProps) => {
  const statusConfig = {
    Otimizado: {
      icon: CheckCircle2,
      color: "text-green-500",
      bg: "bg-gradient-to-br from-green-500/10 via-card/60 to-card/40",
      border: "border-green-500/30",
      glow: "shadow-[0_0_30px_-10px_hsl(142_76%_36%/0.4)]",
      label: "OTIMIZADO"
    },
    Alerta: {
      icon: Info,
      color: "text-amber-500",
      bg: "bg-gradient-to-br from-amber-500/10 via-card/60 to-card/40",
      border: "border-amber-500/30",
      glow: "shadow-[0_0_30px_-10px_hsl(38_92%_50%/0.4)]",
      label: "ALERTA"
    },
    Critico: {
      icon: AlertCircle,
      color: "text-red-500",
      bg: "bg-gradient-to-br from-red-500/15 via-card/60 to-card/40",
      border: "border-red-500/40",
      glow: "shadow-[0_0_30px_-10px_hsl(0_72%_51%/0.5)]",
      label: "CRÍTICO"
    },
    Subotimizado: {
      icon: Info,
      color: "text-blue-400",
      bg: "bg-gradient-to-br from-blue-500/10 via-card/60 to-card/40",
      border: "border-blue-500/30",
      glow: "shadow-[0_0_30px_-10px_hsl(217_91%_60%/0.4)]",
      label: "SUBOTIMIZADO"
    }
  };

  const config = statusConfig[status] || statusConfig.Alerta;
  const Icon = config.icon;
  const showMed = sugestao_medicamento && status !== "Otimizado";

  return (
    <div className={cn(
      "rounded-none border p-4 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5",
      config.bg, config.border, config.glow
    )}>
      <div className="flex justify-between items-start mb-2 gap-3">
        <div className="min-w-0">
          <h4 className="font-display text-base leading-none uppercase tracking-wide truncate">{nome}</h4>
          <p className="text-2xl font-bold mt-1.5 font-display">
            {valor} <span className="text-sm font-normal text-muted-foreground">{unidade}</span>
          </p>
        </div>
        <div className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider border shrink-0", config.color, config.border)}>
          {config.label}
        </div>
      </div>

      {observacao && (
        <div className="mt-3 flex gap-2 items-start">
          <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", config.color)} />
          <p className="text-xs leading-relaxed text-muted-foreground italic">
            {observacao}
          </p>
        </div>
      )}

      {showMed && (
        <div className="mt-3 pt-3 border-t border-border/50 flex gap-2 items-start">
          <div className="w-6 h-6 rounded-none bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <Pill className="h-3 w-3 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-primary mb-0.5">Sugestão</p>
            <p className="text-xs leading-relaxed text-foreground/90">{sugestao_medicamento}</p>
          </div>
        </div>
      )}
    </div>
  );
};
