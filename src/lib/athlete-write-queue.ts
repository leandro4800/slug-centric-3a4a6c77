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

/** Usa o unique já no banco: (sessao_id, treino_prescrito_id, exercicio_chave, numero_serie). */
async function applySeries(payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("series_executadas")
    .upsert(payload as any, {
      onConflict: "sessao_id,treino_prescrito_id,exercicio_chave,numero_serie",
    })
    .select("id")
    .single();
  if (error) throw error;
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
    const jobs = await loadQueue();
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
          console.error("[athlete-write-queue] drop", next.kind, next.lastError);
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
