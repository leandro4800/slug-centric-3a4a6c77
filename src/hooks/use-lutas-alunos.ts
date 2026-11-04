import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FIGHT_MODALIDADES, modalidadeLabel } from "@/lib/fightModalidades";

const NIVEL_LABEL: Record<string, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

export type LutaAluno = { modalidade: string; nivel: string | null };

/** Lutas/níveis por aluno do tenant (só carrega em tenants de luta). */
export function useLutasAlunos(tenantId: string | null | undefined, enabled: boolean, alunoId?: string | null) {
  return useQuery({
    queryKey: ["lutas-alunos", tenantId, alunoId ?? "all"],
    enabled: enabled && !!tenantId,
    queryFn: async () => {
      let q = supabase
        .from("aluno_modalidades_luta")
        .select("aluno_id, modalidade, nivel, created_at")
        .eq("tenant_id", tenantId!)
        .order("created_at");
      if (alunoId) q = q.eq("aluno_id", alunoId);
      const { data, error } = await q;
      if (error) throw error;
      const map: Record<string, LutaAluno[]> = {};
      for (const r of data || []) (map[r.aluno_id] ||= []).push({ modalidade: r.modalidade, nivel: r.nivel });
      return map;
    },
  });
}

/** "Jiu-Jitsu · Intermediário  |  MMA · Iniciante" */
export const formatLutas = (lutas?: LutaAluno[]) =>
  (lutas || [])
    .map((l) => {
      const nome = l.modalidade === "bjj" ? "Jiu-Jitsu" : modalidadeLabel(l.modalidade) || FIGHT_MODALIDADES.find((m) => m.slug === l.modalidade)?.label;
      return l.nivel && NIVEL_LABEL[l.nivel] ? `${nome} · ${NIVEL_LABEL[l.nivel]}` : nome;
    })
    .join("  |  ");
