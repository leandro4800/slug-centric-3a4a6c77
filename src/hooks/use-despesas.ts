import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Despesa } from "@/lib/meu-negocio-metrics";

export type NovaDespesa = Omit<Despesa, "id" | "origem">;

const key = (tenantId: string | undefined) => ["meu-negocio-despesas", tenantId];

/** Despesas do tenant. Filtra tenant_id explicitamente: admins gerais também têm leitura ampla. */
export function useDespesas(tenantId: string | undefined) {
  return useQuery({
    queryKey: key(tenantId),
    enabled: !!tenantId,
    staleTime: 60_000,
    queryFn: async (): Promise<Despesa[]> => {
      const out: Despesa[] = [];
      for (let from = 0; from < 20000; from += 1000) {
        const { data, error } = await supabase
          .from("despesas")
          .select("id, categoria, valor_centavos, data, descricao, fixa, gasto_captacao, origem")
          .eq("tenant_id", tenantId!)
          .order("data", { ascending: false })
          .range(from, from + 999);
        if (error) throw error;
        out.push(...((data ?? []) as Despesa[]));
        if ((data ?? []).length < 1000) break;
      }
      return out;
    },
  });
}

export function useDespesasMutations(tenantId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: key(tenantId) });

  const inserir = useMutation({
    mutationFn: async ({ itens, origem }: { itens: NovaDespesa[]; origem: "manual" | "planilha" }) => {
      if (!tenantId) throw new Error("Sem tenant");
      const { data: u } = await supabase.auth.getUser();
      const rows = itens.map((d) => ({ ...d, tenant_id: tenantId, origem, criado_por: u.user?.id ?? null }));
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase.from("despesas").insert(rows.slice(i, i + 500));
        if (error) throw error;
      }
      return rows.length;
    },
    onSuccess: invalidate,
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("despesas").delete().eq("id", id).eq("tenant_id", tenantId!);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /**
   * Para uma despesa fixa: grava um lançamento comum para cada mês já passado
   * (do mês de início até o atual) e apaga a fixa, preservando o histórico.
   */
  const pararDeRepetir = useMutation({
    mutationFn: async (d: Despesa) => {
      if (!tenantId) throw new Error("Sem tenant");
      const [y, m, dia] = d.data.slice(0, 10).split("-").map(Number);
      const now = new Date();
      const rows: Record<string, unknown>[] = [];
      for (let dt = new Date(y, m - 1, 1); dt <= now; dt = new Date(dt.getFullYear(), dt.getMonth() + 1, 1)) {
        const ultimo = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
        const dd = Math.min(dia, ultimo);
        rows.push({
          tenant_id: tenantId,
          categoria: d.categoria,
          valor_centavos: d.valor_centavos,
          data: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`,
          descricao: d.descricao,
          fixa: false,
          gasto_captacao: d.gasto_captacao,
          origem: d.origem === "planilha" ? "planilha" : "manual",
        });
      }
      if (rows.length) {
        const { error } = await supabase.from("despesas").insert(rows as never);
        if (error) throw error;
      }
      const { error } = await supabase.from("despesas").delete().eq("id", d.id).eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { inserir, excluir, pararDeRepetir };
}
