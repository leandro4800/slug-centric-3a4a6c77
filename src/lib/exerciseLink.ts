import { supabase } from "@/integrations/supabase/client";

/**
 * Vínculo entre o exercício prescrito e a biblioteca (referencia_exercicios).
 * O vídeo exibido para o aluno vem SEMPRE deste vínculo por ID — nunca de
 * comparação de texto na hora de exibir.
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
 * Só vincula automaticamente acima de AUTO_LINK_SCORE.
 */
export async function resolveExercicioIds(
  tenantId: string,
  nomes: string[],
): Promise<Record<string, string | null>> {
  const unicos = [...new Set(nomes.map((n) => (n || "").trim()).filter(Boolean))];
  const out: Record<string, string | null> = {};
  await Promise.all(
    unicos.map(async (nome) => {
      const m = await matchExercicio(tenantId, nome);
      out[nome] = m && m.score >= AUTO_LINK_SCORE ? m.id : null;
    }),
  );
  return out;
}
