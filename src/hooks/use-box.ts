import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type BoxTurma = { id: string; tenant_id: string; nome: string; horario: string | null; ativo: boolean };
export type BoxWod = {
  id: string; tenant_id: string; turma_id: string; data: string; titulo: string | null;
  aquecimento: string | null; forca_skill: any; acessorio: string | null; formato: string;
  time_cap_seg: number | null; rounds: number | null; movimentos: { rx: string; scaled: string }[];
  benchmark_nome: string | null; publicado: boolean;
};
export type BoxResultado = {
  id: string; tenant_id: string; wod_id: string; aluno_id: string; escala: "rx" | "scaled";
  tempo_seg: number | null; rounds: number | null; reps: number | null; carga_kg: number | null; observacao: string | null;
};

export const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function useTenantMembros(tenantId?: string | null) {
  return useQuery({
    queryKey: ["box-membros", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_community_members", { _tenant_id: tenantId! });
      if (error) throw error;
      const map: Record<string, { nome: string; avatar: string | null }> = {};
      for (const m of (data as any[]) || []) map[m.id] = { nome: m.nome_completo || "Aluno", avatar: m.avatar_url };
      return map;
    },
  });
}

export function useBoxTurmas(tenantId?: string | null) {
  return useQuery({
    queryKey: ["box-turmas", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await db.from("box_turmas").select("*").eq("tenant_id", tenantId).order("nome");
      if (error) throw error;
      return (data || []) as BoxTurma[];
    },
  });
}

export function useBoxTurmaAlunos(tenantId?: string | null) {
  return useQuery({
    queryKey: ["box-turma-alunos", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await db.from("box_turma_alunos").select("id, turma_id, aluno_id").eq("tenant_id", tenantId);
      if (error) throw error;
      return (data || []) as { id: string; turma_id: string; aluno_id: string }[];
    },
  });
}

export function useBoxWods(tenantId: string | null | undefined, inicio: string, fim: string, turmaId?: string | null) {
  return useQuery({
    queryKey: ["box-wods", tenantId, inicio, fim, turmaId ?? "all"],
    enabled: !!tenantId,
    queryFn: async () => {
      let q = db.from("box_wods").select("*").eq("tenant_id", tenantId).gte("data", inicio).lte("data", fim).order("data");
      if (turmaId) q = q.eq("turma_id", turmaId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as BoxWod[];
    },
  });
}

export function useBoxResultados(wodIds: string[]) {
  return useQuery({
    queryKey: ["box-resultados", wodIds],
    enabled: wodIds.length > 0,
    queryFn: async () => {
      const { data, error } = await db.from("box_resultados").select("*").in("wod_id", wodIds);
      if (error) throw error;
      return (data || []) as BoxResultado[];
    },
  });
}

export function useBoxPresets() {
  return useQuery({
    queryKey: ["box-presets"],
    queryFn: async () => {
      const { data, error } = await db.from("box_presets").select("*").order("frequencia");
      if (error) throw error;
      return (data || []) as { id: string; nivel: string; frequencia: number; titulo: string; semana: any[] }[];
    },
  });
}

export function useBoxPrs(tenantId?: string | null, alunoId?: string | null) {
  return useQuery({
    queryKey: ["box-prs", tenantId, alunoId],
    enabled: !!tenantId && !!alunoId,
    queryFn: async () => {
      const { data, error } = await db.from("box_benchmark_prs").select("*").eq("tenant_id", tenantId).eq("aluno_id", alunoId).order("data", { ascending: false });
      if (error) throw error;
      return (data || []) as { id: string; benchmark: string; escala: string; resultado: string; data: string }[];
    },
  });
}

/** Mutação genérica em tabelas box_* com invalidação. */
export function useBoxMutation<T>(fn: (v: T) => Promise<void>, keys: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}

export { db as boxDb };
