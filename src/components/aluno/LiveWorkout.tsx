import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Clock, Dumbbell, Loader2, Medal, Play, Timer, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ExercisePlayer from "./ExercisePlayer";

export interface LiveWorkoutExercise {
  id: string;
  exercicio: string;
  series: string | null;
  repeticoes: string | null;
  detalhes_execucao?: string | null;
  tempo_descanso_segundos?: number | null;
  video_url?: string | null;
  video_coach_url?: string | null;
}

interface LiveWorkoutProps {
  open: boolean;
  sessaoId: string | null;
  diaSemana: string;
  exercicios: LiveWorkoutExercise[];
  alunoId: string;
  tenantId: string;
  startedAt: number;
  onClose: () => void;
  onFinished?: (resumo: { duracaoMin: number; volume: number; series: number }) => void;
}

type SerieTipo = "aquecimento" | "trabalho";
interface SerieSlot {
  numero: number;
  tipo: SerieTipo;
}

interface SerieState {
  peso: string;
  reps: string;
  done: boolean;
  recorde: boolean;
}

/** Deriva as linhas de série a partir do texto do campo `series`. */
export const parseSeries = (texto: string | null | undefined): SerieSlot[] => {
  const raw = (texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const aquecMatch = raw.match(/(\d+)\s*(?:x\s*)?aquec\w*/);
  const trabMatch = raw.match(/(\d+)\s*(?:x\s*)?trabalh\w*/);
  const aquec = aquecMatch ? Math.min(Number(aquecMatch[1]) || 0, 10) : 0;
  let trab = trabMatch ? Math.min(Number(trabMatch[1]) || 0, 20) : 0;

  if (!aquec && !trab) {
    const n = raw.match(/\d+/);
    trab = n ? Math.min(Math.max(Number(n[0]) || 3, 1), 20) : 3;
  }
  if (!trab && aquec) trab = 0;

  const slots: SerieSlot[] = [];
  let numero = 1;
  for (let i = 0; i < aquec; i++) slots.push({ numero: numero++, tipo: "aquecimento" });
  for (let i = 0; i < trab; i++) slots.push({ numero: numero++, tipo: "trabalho" });
  return slots.length ? slots : [{ numero: 1, tipo: "trabalho" }];
};

const fmtClock = (totalSec: number) => {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

const fmtDescanso = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m && s) return `${m}min ${s}s`;
  if (m) return `${m}min`;
  return `${s}s`;
};

export const LiveWorkout = ({
  open,
  sessaoId,
  diaSemana,
  exercicios,
  alunoId,
  tenantId,
  startedAt,
  onClose,
  onFinished,
}: LiveWorkoutProps) => {
  const [now, setNow] = useState(() => Date.now());
  const [state, setState] = useState<Record<string, SerieState[]>>({});
  const [anteriores, setAnteriores] = useState<Record<string, { volume: number; peso: number; reps: number }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [rest, setRest] = useState<{ remaining: number; total: number } | null>(null);
  const [videoOf, setVideoOf] = useState<LiveWorkoutExercise | null>(null);
  const [showResumo, setShowResumo] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const restRef = useRef<number | null>(null);

  const slotsPorExercicio = useMemo(() => {
    const map: Record<string, SerieSlot[]> = {};
    exercicios.forEach((e) => { map[e.id] = parseSeries(e.series); });
    return map;
  }, [exercicios]);

  // Inicializa estado das séries
  useEffect(() => {
    if (!open) return;
    setState((prev) => {
      const next = { ...prev };
      exercicios.forEach((e) => {
        if (!next[e.id] || next[e.id].length !== slotsPorExercicio[e.id].length) {
          next[e.id] = slotsPorExercicio[e.id].map(() => ({ peso: "", reps: "", done: false, recorde: false }));
        }
      });
      return next;
    });
  }, [open, exercicios, slotsPorExercicio]);

  // Retoma séries já registradas nesta sessão (sessão em andamento)
  useEffect(() => {
    if (!open || !sessaoId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("series_executadas")
        .select("treino_prescrito_id, numero_serie, peso_kg, reps, is_recorde")
        .eq("sessao_id", sessaoId)
        .order("concluida_em", { ascending: true });
      if (cancelled || !data?.length) return;
      setState((prev) => {
        const next = { ...prev };
        data.forEach((r: any) => {
          const exId = r.treino_prescrito_id;
          const slots = slotsPorExercicio[exId];
          if (!exId || !slots) return;
          const idx = slots.findIndex((s) => s.numero === r.numero_serie);
          if (idx < 0) return;
          const arr = [...(next[exId] || slots.map(() => ({ peso: "", reps: "", done: false, recorde: false })))];
          arr[idx] = {
            peso: r.peso_kg != null ? String(r.peso_kg) : "",
            reps: r.reps != null ? String(r.reps) : "",
            done: true,
            recorde: !!r.is_recorde,
          };
          next[exId] = arr;
        });
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [open, sessaoId, slotsPorExercicio]);


  // Cronômetro geral
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);

  // Timer de descanso
  useEffect(() => {
    if (!rest) return;
    const t = setInterval(() => {
      setRest((r) => {
        if (!r) return r;
        if (r.remaining <= 1) return null;
        return { ...r, remaining: r.remaining - 1 };
      });
    }, 1000);
    restRef.current = t as unknown as number;
    return () => clearInterval(t);
  }, [rest?.total, rest !== null]);

  // Histórico da última execução por série
  useEffect(() => {
    if (!open || !exercicios.length) return;
    let cancelled = false;
    (async () => {
      const ids = exercicios.map((e) => e.id).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
      if (!ids.length) return;
      const { data } = await supabase
        .from("series_executadas")
        .select("treino_prescrito_id, numero_serie, peso_kg, reps, volume_kg, concluida_em")
        .eq("aluno_id", alunoId)
        .in("treino_prescrito_id", ids)
        .order("concluida_em", { ascending: false })
        .limit(500);
      if (cancelled || !data) return;
      const map: Record<string, { volume: number; peso: number; reps: number }> = {};
      data.forEach((r: any) => {
        const key = `${r.treino_prescrito_id}:${r.numero_serie}`;
        if (map[key]) return;
        map[key] = {
          volume: Number(r.volume_kg) || 0,
          peso: Number(r.peso_kg) || 0,
          reps: Number(r.reps) || 0,
        };
      });
      setAnteriores(map);
    })();
    return () => { cancelled = true; };
  }, [open, alunoId, exercicios.map((e) => e.id).join("|")]);

  const duracaoSeg = Math.max(0, Math.floor((now - startedAt) / 1000));

  const { volumeTotal, seriesFeitas } = useMemo(() => {
    let volume = 0;
    let series = 0;
    exercicios.forEach((e) => {
      (state[e.id] || []).forEach((s, i) => {
        if (!s.done) return;
        series += 1;
        const tipo = slotsPorExercicio[e.id]?.[i]?.tipo;
        if (tipo === "trabalho") volume += (Number(s.peso) || 0) * (Number(s.reps) || 0);
      });
    });
    return { volumeTotal: volume, seriesFeitas: series };
  }, [state, exercicios, slotsPorExercicio]);

  const setSerie = (exId: string, idx: number, patch: Partial<SerieState>) => {
    setState((prev) => {
      const arr = [...(prev[exId] || [])];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, [exId]: arr };
    });
  };

  const confirmarSerie = async (ex: LiveWorkoutExercise, idx: number) => {
    const slot = slotsPorExercicio[ex.id][idx];
    const s = state[ex.id]?.[idx];
    if (!s) return;
    const peso = Number(String(s.peso).replace(",", "."));
    const reps = Number(s.reps);
    if (!reps || reps <= 0) {
      toast.error("Informe as repetições da série.");
      return;
    }
    const key = `${ex.id}:${idx}`;
    setSaving(key);
    try {
      const anterior = anteriores[`${ex.id}:${slot.numero}`];
      const volume = (peso || 0) * reps;
      const recorde = slot.tipo === "trabalho" && !!anterior && volume > anterior.volume;

      const isUuid = /^[0-9a-f-]{36}$/i.test(ex.id);
      const { error } = await supabase.from("series_executadas").insert({
        tenant_id: tenantId,
        aluno_id: alunoId,
        sessao_id: sessaoId,
        treino_prescrito_id: isUuid ? ex.id : null,
        numero_serie: slot.numero,
        tipo_serie: slot.tipo,
        peso_kg: Number.isFinite(peso) ? peso : null,
        reps,
        is_recorde: recorde,
      } as any);
      if (error) throw error;

      setSerie(ex.id, idx, { done: true, recorde });
      const descanso = ex.tempo_descanso_segundos ?? 90;
      setRest({ remaining: descanso, total: descanso });
      if (recorde) toast.success("Novo recorde nessa série! 🏅");
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível salvar a série.");
    } finally {
      setSaving(null);
    }
  };

  const concluir = async () => {
    setFinishing(true);
    try {
      const duracaoMin = Math.max(1, Math.round(duracaoSeg / 60));
      if (sessaoId) {
        await supabase
          .from("sessoes_treino")
          .update({ duracao_min: duracaoMin, exercicios_total: exercicios.length })
          .eq("id", sessaoId);
      }
      onFinished?.({ duracaoMin, volume: volumeTotal, series: seriesFeitas });
      setShowResumo(false);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao concluir o treino.");
    } finally {
      setFinishing(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto pb-40">
      {/* Cabeçalho */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Voltar"
            className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="font-display text-xl uppercase truncate flex-1">{diaSemana}</h1>
          <button
            type="button"
            onClick={() => setShowResumo(true)}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-display text-sm tracking-wider uppercase shrink-0"
          >
            Concluir
          </button>
        </div>

        {/* Barra de estatísticas */}
        <div className="grid grid-cols-3 border-t border-border/60">
          {[
            { label: "Duração", value: fmtClock(duracaoSeg) },
            { label: "Volume", value: `${volumeTotal.toLocaleString("pt-BR")} kg` },
            { label: "Séries", value: String(seriesFeitas) },
          ].map((s) => (
            <div key={s.label} className="py-2 text-center border-r border-border/40 last:border-r-0">
              <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{s.label}</p>
              <p className="font-display text-lg leading-tight">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Exercícios */}
      <div className="px-4 py-4 space-y-4">
        {exercicios.map((ex) => {
          const slots = slotsPorExercicio[ex.id] || [];
          const descanso = ex.tempo_descanso_segundos ?? 90;
          const videoUrl = ex.video_coach_url || ex.video_url || null;
          return (
            <div key={ex.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 p-3">
                <button
                  type="button"
                  onClick={() => setVideoOf(ex)}
                  aria-label={`Ver vídeo de ${ex.exercicio}`}
                  className="w-14 h-14 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0 relative"
                >
                  {videoUrl ? (
                    <Play className="h-5 w-5 text-foreground/80" />
                  ) : (
                    <Dumbbell className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base leading-tight truncate">{ex.exercicio}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Timer className="h-3 w-3 text-zinc-400" /> Descanso: {fmtDescanso(descanso)}
                  </p>
                  {ex.detalhes_execucao && (
                    <p className="text-[10px] text-muted-foreground/80 mt-1 line-clamp-2">{ex.detalhes_execucao}</p>
                  )}
                </div>
              </div>

              {/* Tabela de séries */}
              <div className="px-3 pb-3">
                <div className="grid grid-cols-[42px_1fr_1fr_1fr_44px] gap-1 text-[9px] uppercase tracking-wider text-muted-foreground px-1 pb-1">
                  <span>Série</span>
                  <span className="text-center">Anterior</span>
                  <span className="text-center">Kg</span>
                  <span className="text-center">Reps</span>
                  <span />
                </div>
                <div className="space-y-1">
                  {slots.map((slot, idx) => {
                    const s = state[ex.id]?.[idx] || { peso: "", reps: "", done: false, recorde: false };
                    const ant = anteriores[`${ex.id}:${slot.numero}`];
                    const isAquec = slot.tipo === "aquecimento";
                    const key = `${ex.id}:${idx}`;
                    return (
                      <div
                        key={key}
                        className={`grid grid-cols-[42px_1fr_1fr_1fr_44px] gap-1 items-center rounded-lg px-1 py-1 ${
                          s.recorde ? "bg-emerald-500/10" : isAquec ? "bg-zinc-500/5" : ""
                        }`}
                      >
                        <span
                          className={`text-xs font-display flex items-center gap-1 ${
                            isAquec ? "text-zinc-400" : "text-foreground"
                          }`}
                        >
                          {s.recorde ? <Medal className="h-4 w-4 text-amber-400" /> : slot.numero}
                          {isAquec && <span className="text-[8px] uppercase text-zinc-500">aq</span>}
                        </span>
                        <span className="text-[11px] text-center text-zinc-400 truncate">
                          {ant ? `${ant.peso}kg x ${ant.reps}` : "—"}
                        </span>
                        <input
                          inputMode="decimal"
                          value={s.peso}
                          disabled={s.done}
                          onChange={(e) => setSerie(ex.id, idx, { peso: e.target.value })}
                          className="h-9 w-full text-center text-sm rounded-md bg-secondary/50 border border-zinc-600/40 text-foreground disabled:opacity-60"
                        />
                        <input
                          inputMode="numeric"
                          value={s.reps}
                          disabled={s.done}
                          onChange={(e) => setSerie(ex.id, idx, { reps: e.target.value })}
                          className="h-9 w-full text-center text-sm rounded-md bg-secondary/50 border border-zinc-600/40 text-foreground disabled:opacity-60"
                        />
                        <button
                          type="button"
                          disabled={s.done || saving === key}
                          onClick={() => confirmarSerie(ex, idx)}
                          aria-label="Confirmar série"
                          className={`h-9 w-9 rounded-md flex items-center justify-center border transition ${
                            s.done
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "bg-secondary/40 border-zinc-600/40 text-zinc-400 active:scale-95"
                          }`}
                        >
                          {saving === key ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Timer de descanso */}
      {rest && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-zinc-900/95 backdrop-blur border-t border-zinc-700 px-4 py-3">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-zinc-400 shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Descanso</p>
              <p className="font-display text-2xl leading-none text-zinc-100">{fmtClock(rest.remaining)}</p>
            </div>
            <button
              type="button"
              onClick={() => setRest((r) => (r ? { ...r, remaining: Math.max(1, r.remaining - 15) } : r))}
              className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs"
            >
              -15s
            </button>
            <button
              type="button"
              onClick={() => setRest((r) => (r ? { ...r, remaining: r.remaining + 15 } : r))}
              className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs"
            >
              +15s
            </button>
            <button
              type="button"
              onClick={() => setRest(null)}
              className="px-3 py-2 rounded-lg bg-zinc-700 text-zinc-100 text-xs"
            >
              Pular
            </button>
          </div>
        </div>
      )}

      {/* Modal de vídeo */}
      {videoOf && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setVideoOf(null)}>
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-display text-sm uppercase text-white truncate">{videoOf.exercicio}</p>
              <button type="button" onClick={() => setVideoOf(null)} aria-label="Fechar vídeo" className="text-white/80">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
              <ExercisePlayer
                videoUrl={videoOf.video_coach_url || videoOf.video_url || null}
                exerciseName={videoOf.exercicio}
                showPlayButton={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* Resumo */}
      {showResumo && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6">
            <h2 className="font-display text-xl uppercase text-center mb-4">Resumo do treino</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Duração</span><span className="font-display">{fmtClock(duracaoSeg)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Volume total</span><span className="font-display">{volumeTotal.toLocaleString("pt-BR")} kg</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Séries</span><span className="font-display">{seriesFeitas}</span></div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowResumo(false)}
                className="flex-1 py-3 rounded-xl bg-secondary text-foreground text-sm"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={finishing}
                onClick={concluir}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-display tracking-wider uppercase text-sm flex items-center justify-center gap-2"
              >
                {finishing && <Loader2 className="h-4 w-4 animate-spin" />} Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveWorkout;
