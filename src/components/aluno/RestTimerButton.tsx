import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

/** Contagem regressiva do descanso definido pelo coach. Usa o relógio real. */
export const RestTimerButton = ({ seconds }: { seconds: number }) => {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!endAt) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= endAt) {
        setEndAt(null);
        try { navigator.vibrate?.([300, 150, 300]); } catch { /* ignora */ }
      }
    }, 250);
    return () => clearInterval(t);
  }, [endAt]);

  const restante = endAt ? Math.max(0, Math.ceil((endAt - now) / 1000)) : seconds;
  const ativo = !!endAt;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (ativo) setEndAt(null);
        else { setNow(Date.now()); setEndAt(Date.now() + seconds * 1000); }
      }}
      aria-pressed={ativo}
      title={ativo ? "Toque para parar o descanso" : "Toque ao terminar a série para contar o descanso"}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all tabular-nums ${
        ativo
          ? "bg-primary text-primary-foreground border-primary animate-pulse"
          : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
      }`}
    >
      <Timer className="h-3 w-3" />
      {ativo ? `Descanso ${fmt(restante)}` : `Descanso ${fmt(seconds)}`}
    </button>
  );
};
