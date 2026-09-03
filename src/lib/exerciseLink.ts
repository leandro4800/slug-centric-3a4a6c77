import { supabase } from "@/integrations/supabase/client";

/**
 * Vínculo entre o exercício prescrito e a biblioteca (referencia_exercicios).
 * O vídeo exibido para o aluno vem SEMPRE deste vínculo por ID — nunca de
 * comparação de texto na hora de exibir.
 *
 * REGRA ÚNICA DE COMPARAÇÃO: `normalizarNomeExercicio` (sem acento, minúsculo,
 * espaços colapsados). É a MESMA normalização usada pela função SQL
 * `normalizar_nome_exercicio`, e deve ser usada em TODOS os pontos de match
 * (editor do coach, salvamento e resultado da IA).
 */
export const AUTO_LINK_SCORE = 0.75;
export const REVIEW_SCORE = 0.5;

export interface ExerciseMatch {
  id: string;
  nome_exercicio: string;
  url_video: string | null;
  tenant_id: string | null;
  score: number;
}

/** Normaliza igual à função SQL `normalizar_nome_exercicio`. */
export function normalizarNomeExercicio(nome: string): string {
  return (nome || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface ExercicioRef {
  id: string;
  nome_exercicio: string;
  url_video: string | null;
  tenant_id: string | null;
}

/**
 * Índice normalizado da biblioteca de vídeos: entradas do tenant + globais.
 * Entradas do próprio tenant têm prioridade sobre as globais.
 */
export async function carregarIndiceReferencias(
  tenantId: string,
): Promise<Map<string, ExercicioRef>> {
  const idx = new Map<string, ExercicioRef>();
  const { data, error } = await (supabase as any)
    .from("referencia_exercicios")
    .select("id, nome_exercicio, url_video, tenant_id")
    .not("url_video", "is", null)
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
  if (error) {
    console.error("carregarIndiceReferencias:", error.message);
    return idx;
  }
  for (const row of (data as ExercicioRef[]) || []) {
    const key = normalizarNomeExercicio(row.nome_exercicio);
    if (!key) continue;
    const atual = idx.get(key);
    // tenant-specific vence global
    if (!atual || (!atual.tenant_id && row.tenant_id)) idx.set(key, row);
  }
  return idx;
}

export async function matchExercicio(
  tenantId: string,
  nome: string,
): Promise<ExerciseMatch | null> {
  if (!nome?.trim()) return null;
  const { data, error } = await (supabase as any).rpc("match_referencia_exercicio", {
    _tenant_id: tenantId,
    _nome: nome,
    _limit: 1,
  });
  if (error) {
    console.error("match_referencia_exercicio:", error.message);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : null;
  return row ? { ...row, score: Number(row.score) || 0 } : null;
}

/**
 * Resolve o `referencia_exercicio_id` de uma lista de nomes.
 * 1º passo: match EXATO por nome normalizado no índice (tenant + globais).
 * 2º passo (fallback): fuzzy via RPC, só acima de AUTO_LINK_SCORE.
 *
 * O mapa retornado é indexado pelo NOME NORMALIZADO — use
 * `normalizarNomeExercicio(nome)` para consultar.
 */
export async function resolveExercicioIds(
  tenantId: string,
  nomes: string[],
): Promise<Record<string, string | null>> {
  const chaves = [...new Set(nomes.map((n) => normalizarNomeExercicio(n)).filter(Boolean))];
  const out: Record<string, string | null> = {};
  if (!chaves.length || !tenantId) return out;

  const indice = await carregarIndiceReferencias(tenantId);
  const pendentes: string[] = [];
  for (const chave of chaves) {
    const hit = indice.get(chave);
    if (hit) out[chave] = hit.id;
    else pendentes.push(chave);
  }

  await Promise.all(
    pendentes.map(async (chave) => {
      const m = await matchExercicio(tenantId, chave);
      if (!m) {
        out[chave] = null;
        return;
      }
      const exato = normalizarNomeExercicio(m.nome_exercicio) === chave;
      out[chave] = exato || m.score >= AUTO_LINK_SCORE ? m.id : null;
    }),
  );
  return out;
}

/** Consulta segura no mapa retornado por `resolveExercicioIds`. */
export function linkIdPara(
  linkMap: Record<string, string | null>,
  nome: string | null | undefined,
): string | null {
  return linkMap[normalizarNomeExercicio(nome || "")] ?? null;
}
