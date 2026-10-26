import { Mic } from "lucide-react";
import { RestTimerButton } from "@/components/aluno/RestTimerButton";

// Prévia temporária apenas para conferir visualmente o timer de descanso.
export default function RestPreview() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="rounded-lg border border-accent/30 bg-secondary/30 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tempo atual</p>
            <p className="font-mono text-2xl text-accent">06:40</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Player</p>
            <p className="text-xs font-bold">EXECUÇÃO DINÂMICA</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="self-start flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-secondary/60 text-muted-foreground border-border"
          >
            <Mic className="h-3 w-3" />
            🎤 Modo voz
          </button>
          <RestTimerButton seconds={81} />
        </div>
      </div>
    </div>
  );
}
