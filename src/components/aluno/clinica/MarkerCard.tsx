import { CircleHelp, CircleAlert, CheckCircle2, Volume2, Loader2, ExternalLink, Lightbulb, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MARKER_REFERENCE_URL, normalizeMarkerStatus } from "./exam-references";
import { getMarkerEducation, EDUCATION_CLOSING } from "./exam-education";

interface MarkerCardProps {
  nome: string;
  codigo?: string;
  valor: number;
  unidade: string;
  status?: string | null;
  intervalo_referencia?: string | null;
  observacao?: string;
}

export const MarkerCard = ({ nome, codigo, valor, unidade, status, intervalo_referencia, observacao }: MarkerCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showEducation, setShowEducation] = useState(false);
  const normalized = normalizeMarkerStatus(status);
  const education = getMarkerEducation(nome, codigo);

  const statusConfig = {
    DentroReferencia: {
      icon: CheckCircle2,
      color: "text-green-500",
      bg: "bg-gradient-to-br from-green-500/10 via-card/60 to-card/40",
      border: "border-green-500/30",
      glow: "shadow-[0_0_30px_-10px_hsl(142_76%_36%/0.4)]",
      label: "🟢 DENTRO DO INTERVALO DE REFERÊNCIA",
    },
    ForaReferencia: {
      icon: CircleAlert,
      color: "text-amber-500",
      bg: "bg-gradient-to-br from-amber-500/10 via-card/60 to-card/40",
      border: "border-amber-500/30",
      glow: "shadow-[0_0_30px_-10px_hsl(38_92%_50%/0.4)]",
      label: "🟡 FORA DO INTERVALO DE REFERÊNCIA",
    },
    NaoIdentificado: {
      icon: CircleHelp,
      color: "text-muted-foreground",
      bg: "bg-gradient-to-br from-muted/10 via-card/60 to-card/40",
      border: "border-border",
      glow: "",
      label: "INTERVALO DE REFERÊNCIA NÃO IDENTIFICADO",
    },
  } as const;

  const config = statusConfig[normalized];
  const Icon = config.icon;

  const handleSpeak = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) return;

    setIsPlaying(true);
    try {
      const textToSpeak = `${nome}: ${valor} ${unidade}. ${config.label.replace(/[🟢🟡]/g, "").trim()}. ${observacao || ""}`;

      const { data, error } = await supabase.functions.invoke("knowledge-qa", {
        body: { action: "text-to-speech", text: textToSpeak },
      });

      if (error) throw error;
      if (!data?.audioContent) throw new Error("Falha ao gerar áudio");

      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      await audio.play();
    } catch (err: unknown) {
      console.error("Erro ao gerar áudio:", err);
      toast.error("Não foi possível gerar o áudio.");
      setIsPlaying(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-none border p-4 transition-all duration-300",
        config.bg,
        config.border,
        config.glow,
      )}
    >
      <div className="flex justify-between items-start mb-2 gap-3">
        <div className="min-w-0">
          <h4 className="font-display text-base leading-none uppercase tracking-wide truncate">{nome}</h4>
          <p className="text-2xl font-bold mt-1.5 font-display">
            {valor} <span className="text-sm font-normal text-muted-foreground">{unidade}</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Intervalo de referência do exame:{" "}
            <span className="text-foreground/80">{intervalo_referencia || "não identificado"}</span>
          </p>
        </div>
        <button
          onClick={handleSpeak}
          disabled={isPlaying}
          className="p-1.5 rounded-full hover:bg-primary/10 transition-colors disabled:opacity-50 shrink-0"
          title="Ouvir explicação"
        >
          {isPlaying ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          ) : (
            <Volume2 className="h-3.5 w-3.5 text-primary" />
          )}
        </button>
      </div>

      <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider border", config.color, config.border)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </div>

      {observacao && (
        <p className="text-xs leading-relaxed text-muted-foreground mt-3">{observacao}</p>
      )}

      <a
        href={MARKER_REFERENCE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-[10px] text-primary/90 underline underline-offset-2 hover:text-primary"
      >
        Fonte da informação: 🔗 Ver referência técnica
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
};
