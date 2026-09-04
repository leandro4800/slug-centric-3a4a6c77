import { MarkerCard } from "./MarkerCard";
import { ShieldAlert, Volume2, Loader2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  EXAM_REFERENCES,
  FINAL_DISCLAIMER,
  RESULT_WARNING_TEXT,
  RESULT_WARNING_TITLE,
} from "./exam-references";

interface Marker {
  codigo: string;
  nome: string;
  valor: number;
  unidade: string;
  status?: string | null;
  intervalo_referencia?: string | null;
  insight_clinico?: string;
}

interface AnalysisResultsProps {
  parecer: string;
  marcadores: Marker[];
}

export const AnalysisResults = ({ parecer, marcadores }: AnalysisResultsProps) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSpeak = async () => {
    if (isPlaying) return;

    setIsPlaying(true);
    try {
      const textToSpeak = parecer || "Leitura educacional do exame processada.";

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
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="bg-gradient-to-br from-card/70 to-card/30 border border-border rounded-none p-6">
        <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2 gap-3">
          <div>
            <h3 className="font-display text-lg uppercase tracking-[0.2em] text-primary">Alpha Insight</h3>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Resumo educativo do exame</p>
          </div>
          <button
            onClick={handleSpeak}
            disabled={isPlaying}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors disabled:opacity-50 shrink-0"
          >
            {isPlaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
            {isPlaying ? "Ouvindo..." : "Ouvir resumo"}
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
          <p className="font-display text-sm uppercase tracking-wider text-amber-500 mb-1">{RESULT_WARNING_TITLE}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{RESULT_WARNING_TEXT}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-display text-lg px-1 uppercase tracking-[0.2em] text-primary">Resultados do exame</h3>
        <div className="grid grid-cols-1 gap-3">
          {(marcadores ?? []).map((m, i) => (
            <MarkerCard
              key={i}
              nome={m.nome}
              codigo={m.codigo}
              valor={m.valor}
              unidade={m.unidade}
              status={m.status}
              intervalo_referencia={m.intervalo_referencia}
              observacao={m.insight_clinico}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-border/50 pt-4 space-y-3">
        <p className="font-display text-sm uppercase tracking-[0.2em] text-primary">📚 Referências técnicas</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Os parâmetros e informações utilizados na análise são baseados em referências técnicas, diretrizes de
          saúde pública e publicações de sociedades médicas.
        </p>
        <ul className="space-y-2">
          {EXAM_REFERENCES.map((s) => (
            <li key={s.url} className="text-[11px] text-muted-foreground">
              <span className="block">{s.label}</span>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary/90 underline underline-offset-2 hover:text-primary"
              >
                🔗 Acessar referência
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[10px] text-muted-foreground/90 leading-relaxed border-l-2 border-primary/30 pl-3">
        {FINAL_DISCLAIMER}
      </p>
    </div>
  );
};
