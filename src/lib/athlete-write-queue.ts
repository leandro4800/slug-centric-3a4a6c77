/**
 * Fila persistente de escritas do aluno.
 * Wi‑Fi de academia cai — o ✓ não pode sumir com o pacote.
 * Preferences/localStorage até o Supabase confirmar.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  readPersistentValue,
  writePersistentValue,
} from "@/lib/persistent-storage";

const QUEUE_KEY = "athlete_write_outbox_v1";
const MAX_ATTEMPTS = 8;

export type AthleteWriteKind = "series_executada" | "avaliacao_fisica";

export type AthleteWriteJob = {
  id: string;
  kind: AthleteWriteKind;
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  lastError?: string | null;
};

type Listener = (jobs: AthleteWriteJob[]) => void;

const listeners = new Set<Listener>();
let memoryQueue: AthleteWriteJob[] | null = null;
let flushing = false;

const newId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `w_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const isNetworkish = (err: unknown) => {
  const msg = String((err as { message?: string })?.message || err || "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("offline") ||
    msg.includes("timeout") ||
    msg.includes("abort") ||
    msg.includes("load failed")
  );
};

async function loadQueue(): Promise<AthleteWriteJob[]> {
  if (memoryQueue) return memoryQueue;
  const raw = await readPersistentValue(QUEUE_KEY);
  if (!raw) {
    memoryQueue = [];
    return memoryQueue;
  }
  try {
    const parsed = JSON.parse(raw) as AthleteWriteJob[];
    memoryQueue = Array.isArray(parsed) ? parsed : [];
  } catch {
    memoryQueue = [];
  }
  return memoryQueue;
}

async function saveQueue(jobs: AthleteWriteJob[]) {
  memoryQueue = jobs;
  await writePersistentValue(QUEUE_KEY, JSON.stringify(jobs));
  listeners.forEach((fn) => fn(jobs));
}

export function subscribeAthleteWriteQueue(listener: Listener): () => void {
  listeners.add(listener);
  void loadQueue().then((jobs) => listener(jobs));
  return () => {
    listeners.delete(listener);
  };
}

export async function getAthleteWriteQueue(): Promise<AthleteWriteJob[]> {
  return loadQueue();
}

export async function enqueueAthleteWrite(
  kind: AthleteWriteKind,
  payload: Record<string, unknown>,
  id?: string,
): Promise<AthleteWriteJob> {
  const jobs = await loadQueue();
  const jobId = id || newId();
  const existing = jobs.find((j) => j.id === jobId);
  if (existing) return existing;

  const job: AthleteWriteJob = {
    id: jobId,
    kind,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  };
  await saveQueue([job, ...jobs]);
  void flushAthleteWriteQueue();
  return job;
}

async function applySeries(payload: Record<string, unknown>) {
  const sessaoId = String(payload.sessao_id || "");
  const numeroSerie = Number(payload.numero_serie);
  const prescritoId = payload.treino_prescrito_id
    ? String(payload.treino_prescrito_id)
    : null;

  if (sessaoId && Number.isFinite(numeroSerie)) {
    let q = supabase
      .from("series_executadas")
      .select("id")
      .eq("sessao_id", sessaoId)
      .eq("numero_serie", numeroSerie)
      .limit(1);
    q = prescritoId
      ? q.eq("treino_prescrito_id", prescritoId)
      : q.is("treino_prescrito_id", null);
    const { data: existing, error: lookupError } = await q.maybeSingle();
    if (lookupError) throw lookupError;
    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("series_executadas")
        .update({
          peso_kg: payload.peso_kg,
          reps: payload.reps,
          tempo_seg: payload.tempo_seg ?? null,
          tipo_serie: payload.tipo_serie ?? null,
          concluida_em: payload.concluida_em ?? new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (updateError) throw updateError;
      return existing.id;
    }
  }

  const { data, error } = await supabase
    .from("series_executadas")
    .insert(payload as any)
    .select("id")
    .single();
  if (error) {
    // Unique index: retry virar update, não segunda linha
    const code = (error as { code?: string }).code;
    if (code === "23505" && sessaoId && Number.isFinite(numeroSerie)) {
      let q = supabase
        .from("series_executadas")
        .select("id")
        .eq("sessao_id", sessaoId)
        .eq("numero_serie", numeroSerie)
        .limit(1);
      q = prescritoId
        ? q.eq("treino_prescrito_id", prescritoId)
        : q.is("treino_prescrito_id", null);
      const { data: existing } = await q.maybeSingle();
      if (existing?.id) {
        await supabase
          .from("series_executadas")
          .update({
            peso_kg: payload.peso_kg,
            reps: payload.reps,
            tempo_seg: payload.tempo_seg ?? null,
            tipo_serie: payload.tipo_serie ?? null,
            concluida_em: payload.concluida_em ?? new Date().toISOString(),
          })
          .eq("id", existing.id);
        return existing.id;
      }
    }
    throw error;
  }
  return data.id as string;
}

async function applyAvaliacao(payload: Record<string, unknown>) {
  if (!payload.tenant_id) {
    throw new Error("tenant_id obrigatório para salvar avaliação");
  }
  const { error } = await supabase.from("avaliacoes_fisicas").insert(payload as any);
  if (error) throw error;
}

async function applyJob(job: AthleteWriteJob) {
  if (job.kind === "series_executada") return applySeries(job.payload);
  if (job.kind === "avaliacao_fisica") return applyAvaliacao(job.payload);
  throw new Error(`kind desconhecido: ${job.kind}`);
}

export async function flushAthleteWriteQueue(): Promise<{ flushed: number; remaining: number }> {
  if (flushing) {
    const jobs = await loadQueue();
    return { flushed: 0, remaining: jobs.length };
  }
  flushing = true;
  let flushed = 0;
  try {
    let jobs = await loadQueue();
    const keep: AthleteWriteJob[] = [];

    for (const job of jobs) {
      try {
        await applyJob(job);
        flushed += 1;
      } catch (err) {
        const next: AthleteWriteJob = {
          ...job,
          attempts: job.attempts + 1,
          lastError: String((err as { message?: string })?.message || err),
        };
        if (isNetworkish(err) && next.attempts < MAX_ATTEMPTS) {
          keep.push(next);
        } else if (isNetworkish(err)) {
          keep.push(next);
        } else {
          // RLS / validação: mantém 1 tentativa a mais só se for rede; senão descarta com log
          console.error("[athlete-write-queue] drop", next.kind, next.lastError);
          // Avaliações com tenant errado não devem loopar para sempre — drop
          if (job.kind === "avaliacao_fisica" && !isNetworkish(err)) {
            /* drop */
          } else if (next.attempts < MAX_ATTEMPTS) {
            keep.push(next);
          }
        }
      }
    }

    await saveQueue(keep);
    return { flushed, remaining: keep.length };
  } finally {
    flushing = false;
  }
}

/** Grava série: tenta online; se cair a rede, enfileira e devolve pending. */
export async function saveSeriesDurable(
  payload: Record<string, unknown>,
): Promise<{ id: string | null; pending: boolean; jobId: string }> {
  const jobId = newId();
  try {
    const id = await applySeries(payload);
    return { id, pending: false, jobId };
  } catch (err) {
    if (!isNetworkish(err)) throw err;
    await enqueueAthleteWrite("series_executada", payload, jobId);
    return { id: null, pending: true, jobId };
  }
}

/** Grava avaliação: exige tenant; rede cai → fila. */
export async function saveAvaliacaoDurable(
  payload: Record<string, unknown>,
): Promise<{ pending: boolean; jobId: string }> {
  if (!payload.tenant_id) {
    throw new Error("Não foi possível identificar o coach/tenant. Feche e abra o app, depois tente de novo.");
  }
  const jobId = newId();
  try {
    await applyAvaliacao(payload);
    return { pending: false, jobId };
  } catch (err) {
    if (!isNetworkish(err)) throw err;
    await enqueueAthleteWrite("avaliacao_fisica", payload, jobId);
    return { pending: true, jobId };
  }
}
