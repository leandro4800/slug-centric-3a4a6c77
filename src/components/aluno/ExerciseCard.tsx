import { useEffect, useRef, useState } from "react";
import { Play, Lightbulb, Share2, Clock, CheckCircle2, Loader2, Youtube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractYouTubeId, isDirectVideo } from "@/lib/utils";

export interface ExerciseCardData {
  id: string;
  exercicio: string;
  series: string | null;
  repeticoes: string | null;
  cadencia?: string | null;
  detalhes_execucao?: string | null;
  observacao: string | null;
  /** Vídeo do YouTube de demonstração (referência técnica) */
  video_url?: string | null;
  /** Vídeo gravado pelo coach (demo personalizada) */
  video_coach_url?: string | null;
  is_extra?: boolean;
}

interface CargaAnterior {
  carga_kg: number;
  repeticoes_feitas: number;
  data_treino: string;
}

interface ExerciseCardProps {
  data: ExerciseCardData;
  isOpen: boolean;
  onToggle: () => void;
  cargaAnterior?: CargaAnterior;
  userId: string | null;
  tenantId: string | null;
  onCargaSaved?: (nome: string, carga: number, reps: number) => void;
}


const fmtTime = (s: number) => {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const r = (s % 60).toString().padStart(2, "0");
  return `${m}:${r}`;
};

const parseSeries = (s: string | null) => {
  if (!s) return 4;
  const n = parseInt(String(s).match(/\d+/)?.[0] || "4");
  return Math.min(Math.max(n, 1), 8);
};

export const ExerciseCard = ({
  data,
  isOpen,
  onToggle,
  cargaAnterior,
  userId,
  tenantId,
  onCargaSaved,
}: ExerciseCardProps) => {
  const totalSlots = parseSeries(data.series);
  const [slots, setSlots] = useState(() =>
    Array.from({ length: totalSlots }, () => ({
      carga: cargaAnterior?.carga_kg ? String(cargaAnterior.carga_kg) : "",
      reps: cargaAnterior?.repeticoes_feitas ? String(cargaAnterior.repeticoes_feitas) : "",
      done: false,
    }))
  );
  const [savingAll, setSavingAll] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [showYT, setShowYT] = useState(false);

  // Timer
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const intRef = useRef<number | null>(null);
  useEffect(() => {
    if (running) {
      intRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (intRef.current) {
      window.clearInterval(intRef.current);
    }
    return () => {
      if (intRef.current) window.clearInterval(intRef.current);
    };
  }, [running]);

  const ytId = extractYouTubeId(data.video_url);
  const coachUrl = data.video_coach_url || null;
  const coachIsYT = extractYouTubeId(coachUrl);
  const coachIsDirect = isDirectVideo(coachUrl);

  // Vídeo principal exibido no topo (preferimos coach se existir, senão YT)
  const hasCoach = !!coachUrl;
  const hasYT = !!ytId;

  const updateSlot = (i: number, field: "carga" | "reps", val: string) =>
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)));

  const toggleDone = (i: number) =>
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, done: !s.done } : s)));

  const handleFinalizar = async () => {
    if (!userId || !tenantId) {
      toast.error("Você precisa estar logado.");
      return;
    }
    const valid = slots
      .map((s) => ({ k: parseFloat(s.carga.replace(",", ".")), r: parseInt(s.reps) }))
      .filter((s) => !isNaN(s.k) && !isNaN(s.r));
    if (valid.length === 0) {
      toast.error("Preencha pelo menos uma série.");
      return;
    }
    setSavingAll(true);
    const rows = valid.map((s) => ({
      tenant_id: tenantId,
      user_id: userId,
      exercicio_nome: data.exercicio,
      carga_kg: s.k,
      repeticoes_feitas: s.r,
    }));
    const { error } = await supabase.from("historico_cargas").insert(rows);
    setSavingAll(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const last = valid[valid.length - 1];
    toast.success(`${valid.length} série(s) registrada(s)!`);
    onCargaSaved?.(data.exercicio, last.k, last.r);
    setRunning(false);
  };

  return (
    <div className="bg-card/50 border border-primary/30 rounded-xl overflow-hidden">
      {/* Player grande no topo — sempre visível (com poster placeholder se não houver vídeo) */}
      <div className="relative aspect-video bg-black">
        {hasCoach && (showCoach || !showYT) ? (
          coachIsYT ? (
            <iframe
              src={`https://www.youtube.com/embed/${coachIsYT}?autoplay=1`}
              title={`${data.exercicio} - Coach`}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          ) : coachIsDirect ? (
            <video
              src={coachUrl!}
              controls
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-contain bg-black"
            />
          ) : (
            <a
              href={coachUrl!}
              target="_blank"
              rel="noreferrer"
              className="absolute inset-0 flex items-center justify-center text-sm text-primary underline"
            >
              Abrir vídeo do coach
            </a>
          )
        ) : showYT && ytId ? (
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
            title={data.exercicio}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        ) : (
          // Poster (com thumb do YT se houver, ou placeholder escuro)
          <button
            onClick={() => {
              if (hasCoach) setShowCoach(true);
              else if (hasYT) setShowYT(true);
            }}
            disabled={!hasCoach && !hasYT}
            className="absolute inset-0 w-full h-full group"
          >
            {ytId ? (
              <img
                src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-90"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black flex items-center justify-center">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">
                  Vídeo em breve
                </p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60" />
            <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-emerald-500/80 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            {(hasCoach || hasYT) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-[0_0_50px_-10px_rgba(224,0,0,0.6)] group-hover:scale-110 transition-all duration-500 relative overflow-hidden border border-white/30">
                  <div className="absolute inset-0 bg-[var(--btn-mirror)] opacity-80" />
                  <Play className="h-9 w-9 fill-white text-white ml-1 relative z-10" />
                </div>
              </div>
            )}
          </button>
        )}

        {/* Botões flutuantes inferiores */}
        <div className="absolute bottom-2 left-2 flex gap-2 z-10">
          <button className="w-9 h-9 rounded-full bg-background/70 backdrop-blur flex items-center justify-center">
            <Share2 className="h-4 w-4 text-white" />
          </button>
          <button className="w-9 h-9 rounded-full bg-background/70 backdrop-blur flex items-center justify-center">
            <Clock className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Tabs de fonte do vídeo (Coach / YouTube) — sempre visíveis quando há ao menos um */}
        {(hasCoach || hasYT) && (
          <div className="absolute bottom-2 right-2 z-10 flex gap-1.5 bg-background/70 backdrop-blur rounded-full p-1">
            {hasCoach && (
              <button
                onClick={() => { setShowCoach(true); setShowYT(false); }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition ${
                  showCoach || !showYT ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                Coach
              </button>
            )}
            {hasYT && (
              <button
                onClick={() => { setShowYT(true); setShowCoach(false); }}
                className={`px-2.5 py-1 rounded-none text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition relative overflow-hidden ${
                  showYT ? "bg-primary text-primary-foreground border border-white/20" : "text-muted-foreground border border-transparent"
                }`}
              >
                {showYT && <div className="absolute inset-0 bg-[var(--btn-mirror)] opacity-40" />}
                <Youtube className="h-3 w-3 relative z-10" /> <span className="relative z-10">YouTube</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Header do card (clicável para abrir o modo execução) */}
      <button onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-lg leading-tight">{data.exercicio.toUpperCase()}</p>
          {data.is_extra && (
            <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-accent/20 text-accent shrink-0">
              Extra IA
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {data.series && data.repeticoes && (
            <span className="px-3 py-1 rounded-full bg-secondary text-xs">
              {data.series}x {data.repeticoes}
            </span>
          )}
          {cargaAnterior && (
            <span className="px-3 py-1 rounded-full bg-primary/15 text-primary text-xs">
              Última: {cargaAnterior.carga_kg}kg × {cargaAnterior.repeticoes_feitas}
            </span>
          )}
        </div>

        {!isOpen && (
          <div className="mt-3 w-full py-3 rounded-none bg-primary text-primary-foreground font-display text-base flex items-center justify-center gap-2 relative overflow-hidden border border-white/20 shadow-lg">
            <div className="absolute inset-0 bg-[var(--btn-mirror)] opacity-60" />
            <span className="relative z-10">▶ EXECUTAR</span>
          </div>
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          {/* Detalhes Pacho */}
          <div className="space-y-2">
            {data.cadencia && (
              <div className="flex items-center gap-2 text-xs font-bold text-accent bg-accent/10 px-3 py-1.5 rounded-full w-fit">
                <Clock className="h-3 w-3" /> CADÊNCIA: {data.cadencia}
              </div>
            )}
            {data.detalhes_execucao && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-1">
                <p className="text-[10px] uppercase font-bold text-primary tracking-widest">Metodologia AlphaCoach</p>
                <p className="text-xs text-foreground/90 leading-relaxed">{data.detalhes_execucao}</p>
              </div>
            )}
            {data.observacao && (
              <div className="bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <span className="italic text-muted-foreground">{data.observacao}</span>
              </div>
            )}
          </div>

          {/* Iniciar exercício + timer */}
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <button
              onClick={() => setRunning((r) => !r)}
              className="px-6 py-4 rounded-none bg-primary text-primary-foreground font-display text-sm leading-tight flex items-center gap-3 relative overflow-hidden border border-white/20 shadow-lg transition-all active:scale-95"
            >
              <div className="absolute inset-0 bg-[var(--btn-mirror)] opacity-60" />
              <Play className="h-5 w-5 fill-current relative z-10" />
              <span className="relative z-10">{running ? "PAUSAR" : "INICIAR"}<br/>EXERCÍCIO</span>
            </button>
            <div className="rounded-lg border border-accent/30 bg-secondary/30 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tempo atual</p>
                <p className="font-mono text-2xl text-accent">{fmtTime(seconds)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Player</p>
                <p className="text-xs font-bold">EXECUÇÃO DINÂMICA</p>
              </div>
            </div>
          </div>

          {/* Séries de trabalho */}
          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Séries de trabalho</p>
            <p className="text-[11px] text-accent font-bold">{totalSlots} slots</p>
          </div>

          <div className="space-y-2">
            {slots.map((slot, i) => (
              <div key={i} className="border border-border rounded-lg p-3 space-y-2 bg-background/40">
                <button
                  onClick={() => toggleDone(i)}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                >
                  <CheckCircle2 className={`h-4 w-4 ${slot.done ? "text-emerald-500" : "text-muted-foreground"}`} />
                  S{i + 1}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Carga (kg)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={slot.carga}
                      onChange={(e) => updateSlot(i, "carga", e.target.value)}
                      placeholder="0"
                      className="w-full mt-1 bg-secondary/70 border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Reps</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={slot.reps}
                      onChange={(e) => updateSlot(i, "reps", e.target.value)}
                      placeholder="0"
                      className="w-full mt-1 bg-secondary/70 border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleFinalizar}
            disabled={savingAll}
            className="w-full py-4 rounded-none bg-primary text-primary-foreground font-display text-lg flex items-center justify-center gap-3 relative overflow-hidden border border-white/30 shadow-[0_10px_40px_-10px_rgba(224,0,0,0.4)] transition-all active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-[var(--btn-mirror)] opacity-70" />
            {savingAll ? <Loader2 className="h-5 w-5 animate-spin relative z-10" /> : null}
            <span className="relative z-10 tracking-[0.1em]">FINALIZAR TREINO</span>
          </button>
        </div>
      )}
    </div>
  );
};
