import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarkerCardProps {
  nome: string;
  valor: number;
  unidade: string;
  status: "Otimizado" | "Alerta" | "Critico" | "Subotimizado";
  observacao?: string;
}

export const MarkerCard = ({ nome, valor, unidade, status, observacao }: MarkerCardProps) => {
  const statusConfig = {
    otimo: {
      icon: CheckCircle2,
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/30",
      label: "ÓTIMO"
    },
    atencao: {
      icon: Info,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      label: "ATENÇÃO"
    },
    critico: {
      icon: AlertCircle,
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      label: "CRÍTICO"
    }
  };

  const config = statusConfig[status] || statusConfig.atencao;
  const Icon = config.icon;

  return (
    <div className={cn("rounded-2xl border p-4 transition-all duration-300", config.bg, config.border)}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-display text-base leading-none">{nome}</h4>
          <p className="text-2xl font-bold mt-1">
            {valor} <span className="text-sm font-normal text-muted-foreground">{unidade}</span>
          </p>
        </div>
        <div className={cn("px-2 py-1 rounded text-[10px] font-bold tracking-wider border", config.color, config.border)}>
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
    </div>
  );
};
