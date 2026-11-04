export type WodFormato = "AMRAP" | "EMOM" | "FOR_TIME" | "RFT" | "CHIPPER" | "TABATA" | "LADDER";
export type Escala = "rx" | "scaled";

export const WOD_FORMATOS: { value: WodFormato; label: string }[] = [
  { value: "AMRAP", label: "AMRAP" },
  { value: "EMOM", label: "EMOM" },
  { value: "FOR_TIME", label: "For Time" },
  { value: "RFT", label: "Rounds for Time" },
  { value: "CHIPPER", label: "Chipper" },
  { value: "TABATA", label: "Tabata" },
  { value: "LADDER", label: "Ladder" },
];

export const formatoLabel = (f: string) => WOD_FORMATOS.find((x) => x.value === f)?.label ?? f;

/** Formatos com contagem regressiva (tempo fixo); os demais contam progressivo até o time cap. */
export const isCountdown = (f: string) => f === "AMRAP" || f === "EMOM" || f === "TABATA";

/** Formatos cujo resultado é rounds + reps (quanto mais, melhor). */
export const scoreIsRounds = (f: string) => f === "AMRAP" || f === "EMOM" || f === "TABATA";

export interface WodMovimento { rx: string; scaled: string }

export interface ResultadoRank {
  aluno_id: string;
  escala: Escala;
  tempo_seg: number | null;
  rounds: number | null;
  reps: number | null;
  carga_kg?: number | null;
}

/** Duração total do timer em segundos. */
export function timerDuration(formato: string, timeCapSeg: number | null, rounds?: number | null): number | null {
  if (formato === "TABATA") return (rounds || 8) * 30;
  return timeCapSeg && timeCapSeg > 0 ? timeCapSeg : null;
}

/**
 * Valor exibido no timer a partir dos segundos decorridos (relógio real).
 * Regressivo: restante (mín. 0). Progressivo: decorrido, parando no time cap.
 */
export function timerDisplaySeconds(formato: string, elapsed: number, durationSeg: number | null): { value: number; done: boolean } {
  const e = Math.max(0, Math.floor(elapsed));
  if (isCountdown(formato)) {
    const d = durationSeg ?? 0;
    return { value: Math.max(0, d - e), done: d > 0 && e >= d };
  }
  if (durationSeg && e >= durationSeg) return { value: durationSeg, done: true };
  return { value: e, done: false };
}

export function fmtTempo(seg: number | null | undefined): string {
  if (seg == null) return "--:--";
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Ranking do dia: Rx antes de Scaled; dentro de cada escala, pelo critério do formato. */
export function rankResultados<T extends ResultadoRank>(formato: string, list: T[], totalReps?: number): T[] {
  const rounds = scoreIsRounds(formato);
  const score = (r: T) => {
    if (rounds) return -((r.rounds ?? 0) * 10000 + (r.reps ?? 0));
    // For Time: quem terminou (tempo) vem antes de quem estourou o cap (reps)
    if (r.tempo_seg != null) return r.tempo_seg;
    return 1e9 - ((r.rounds ?? 0) * 10000 + (r.reps ?? 0));
  };
  return [...list].sort((a, b) => {
    if (a.escala !== b.escala) return a.escala === "rx" ? -1 : 1;
    return score(a) - score(b);
  });
}

export function resultadoTexto(formato: string, r: ResultadoRank): string {
  if (scoreIsRounds(formato)) return `${r.rounds ?? 0} rds + ${r.reps ?? 0}`;
  if (r.tempo_seg != null) return fmtTempo(r.tempo_seg);
  if (r.reps != null || r.rounds != null) return `CAP · ${r.rounds ?? 0} rds + ${r.reps ?? 0}`;
  if (r.carga_kg != null) return `${r.carga_kg} kg`;
  return "-";
}
