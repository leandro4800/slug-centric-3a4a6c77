import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { fmtTempo, isCountdown, timerDisplaySeconds, timerDuration } from "@/lib/box-wod";
import { Play, Square, RotateCcw } from "lucide-react";

/** Cronômetro do WOD pelo relógio real (sobrevive a sair da tela). */
export default function WodTimer({ wodId, formato, timeCapSeg, rounds, onStop }: {
  wodId: string; formato: string; timeCapSeg: number | null; rounds: number | null; onStop?: (elapsedSeg: number) => void;
}) {
  const key = `box-timer-${wodId}`;
  const [start, setStart] = useState<number | null>(() => {
    const v = localStorage.getItem(key);
    return v ? Number(v) : null;
  });
  const [stopped, setStopped] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const duration = timerDuration(formato, timeCapSeg, rounds);

  useEffect(() => {
    if (!start || stopped) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [start, stopped]);

  const elapsed = start ? ((stopped ?? now) - start) / 1000 : 0;
  const { value, done } = timerDisplaySeconds(formato, elapsed, duration);

  useEffect(() => {
    if (done && start && !stopped) {
      setStopped(Date.now());
      navigator.vibrate?.([300, 150, 300]);
    }
  }, [done, start, stopped]);

  const iniciar = () => { const s = Date.now(); localStorage.setItem(key, String(s)); setStart(s); setStopped(null); setNow(s); };
  const parar = () => { setStopped(Date.now()); onStop?.(Math.floor(elapsed)); };
  const zerar = () => { localStorage.removeItem(key); setStart(null); setStopped(null); };

  const display = start ? value : isCountdown(formato) ? duration ?? 0 : 0;

  return (
    <div className="border border-border bg-card p-4 text-center space-y-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {isCountdown(formato) ? "Contagem regressiva" : "Cronômetro"}{duration ? ` · cap ${fmtTempo(duration)}` : ""}
      </p>
      <p className={`font-display text-6xl tabular-nums ${done ? "text-primary" : "text-foreground"}`}>{fmtTempo(display)}</p>
      {done && <p className="text-xs font-bold uppercase tracking-widest text-primary">Tempo!</p>}
      <div className="flex justify-center gap-2">
        {!start || stopped ? (
          <Button className="rounded-none" onClick={iniciar}><Play className="h-4 w-4 mr-1" />{start ? "Reiniciar" : "Iniciar"}</Button>
        ) : (
          <Button className="rounded-none" variant="secondary" onClick={parar}><Square className="h-4 w-4 mr-1" />Parar</Button>
        )}
        {start && <Button className="rounded-none" variant="outline" onClick={zerar}><RotateCcw className="h-4 w-4" /></Button>}
      </div>
    </div>
  );
}
