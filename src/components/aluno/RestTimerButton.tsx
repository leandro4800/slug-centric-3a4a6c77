import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Timer, X, OctagonX } from "lucide-react";

const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

const R = 46;
const CIRC = 2 * Math.PI * R;

/** Contagem regressiva do descanso definido pelo coach. Usa o relógio real.
 *  Ao iniciar, abre uma versão grande na tela para facilitar a leitura. */
export const RestTimerButton = ({ seconds }: { seconds: number }) => {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [open, setOpen] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!endAt) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= endAt) {
        setEndAt(null);
        setFinished(true);
        try { navigator.vibrate?.([300, 150, 300]); } catch { /* ignora */ }
      }
    }, 250);
    return () => clearInterval(t);
  }, [endAt]);

  // O aviso "PRONTO" some sozinho, mas a contagem já terminou.
  useEffect(() => {
    if (!finished) return;
    const t = setTimeout(() => {
      setFinished(false);
      setOpen(false);
    }, 2500);
    return () => clearTimeout(t);
  }, [finished]);

  const restante = endAt ? Math.max(0, Math.ceil((endAt - now) / 1000)) : seconds;
  const ativo = !!endAt;
  const progresso = seconds > 0 ? Math.min(1, Math.max(0, restante / seconds)) : 0;

  const parar = () => {
    setEndAt(null);
    setFinished(false);
    setOpen(false);
  };

  const iniciar = () => {
    setNow(Date.now());
    setEndAt(Date.now() + seconds * 1000);
    setFinished(false);
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (ativo) parar();
          else iniciar();
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

      {(ativo || finished) &&
        open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Contagem regressiva do descanso"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-background/95 backdrop-blur-sm px-6 select-none"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-muted-foreground">
              {finished ? "Fim do descanso" : "Descanso"}
            </p>

            <div className="relative">
              <svg
                viewBox="0 0 100 100"
                className="h-[min(74vw,340px)] w-[min(74vw,340px)] -rotate-90"
                aria-hidden="true"
              >
                <circle cx="50" cy="50" r={R} fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" />
                <circle
                  cx="50"
                  cy="50"
                  r={R}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={CIRC * (1 - progresso)}
                  style={{ transition: "stroke-dashoffset 0.25s linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="font-mono font-bold tabular-nums leading-none text-foreground"
                  style={{
                    fontSize: finished ? "clamp(26px, 9vw, 58px)" : "clamp(58px, 21vw, 150px)",
                  }}
                >
                  {finished ? "PRONTO" : fmt(restante)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={parar}
                className="flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground active:scale-95"
              >
                <OctagonX className="h-4 w-4" />
                Parar
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-foreground active:scale-95"
              >
                <X className="h-4 w-4" />
                Fechar
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground">
              {finished
                ? "Comece a próxima série"
                : "Toque fora do número para fechar sem parar a contagem"}
            </p>
          </div>,
          document.body
        )}
    </>
  );
};
