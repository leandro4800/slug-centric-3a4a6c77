import { AlertCircle, CheckCircle2, Info, Pill, Volume2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MarkerCardProps {
  nome: string;
  valor: number;
  unidade: string;
  status: "Otimizado" | "Alerta" | "Critico" | "Subotimizado";
  observacao?: string;
  sugestao_medicamento?: string;
}

export const MarkerCard = ({ nome, valor, unidade, status, observacao, sugestao_medicamento }: MarkerCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSpeak = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) return;
    
    setIsPlaying(true);
    try {
      const textToSpeak = `${nome}: ${valor} ${unidade}. Status: ${status}. ${observacao || ""}`;
      
      const { data, error } = await supabase.functions.invoke('knowledge-qa', {
        body: { 
          action: 'text-to-speech',
          text: textToSpeak
        }
      });

      if (error) throw error;
      if (!data?.audioContent) throw new Error("Falha ao gerar áudio");

      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      await audio.play();
    } catch (err: any) {
      console.error("Erro ao gerar áudio:", err);
      toast.error("Não foi possível gerar o áudio.");
      setIsPlaying(false);
    }
  };
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
      color: "text-primary",
      bg: "bg-gradient-to-br from-primary/15 via-card/60 to-card/40",
      border: "border-primary/40",
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
