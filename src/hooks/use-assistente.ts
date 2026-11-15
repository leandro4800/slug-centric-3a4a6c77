import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { adiarAte, CONFIG_INICIAL, type Alerta, type AssistenteConfig } from "@/lib/assistente";

const db = supabase as any; // tabelas do assistente ainda fora dos tipos gerados

export function useAlertas(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["assistente-alertas", tenantId],
    enabled: !!tenantId,
    staleTime: 60_000,
    queryFn: async (): Promise<Alerta[]> => {
      const { data, error } = await db
        .from("assistente_alertas")
        .select("id, tenant_id, aluno_id, aluno_nome, tipo, prioridade, titulo, detalhe, estado, adiar_ate, created_at")
        .eq("tenant_id", tenantId)
        .in("estado", ["novo", "visto", "adiado"])
        .order("prioridade")
        .order("created_at")
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Alerta[];
    },
  });
}

export function useAlertaAcoes(tenantId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["assistente-alertas", tenantId] });
  /** Chamar / Já falei: aluno sai dos alertas por 7 dias. */
  const adiar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("assistente_alertas").update({ estado: "adiado", adiar_ate: adiarAte() }).eq("id", id).eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const dispensar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("assistente_alertas").update({ estado: "dispensado" }).eq("id", id).eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  return { adiar, dispensar };
}

export function useAssistenteConfig(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["assistente-config", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<AssistenteConfig> => {
      const { data, error } = await db
        .from("assistente_config")
        .select("resumo_ativo, resumo_hora, canal_email, canal_push, tipos")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { ...CONFIG_INICIAL, tipos: { ...CONFIG_INICIAL.tipos } };
      return { ...data, tipos: { ...CONFIG_INICIAL.tipos, ...(data.tipos ?? {}) } } as AssistenteConfig;
    },
  });
}

export function useSalvarAssistenteConfig(tenantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cfg: AssistenteConfig) => {
      const { error } = await db.from("assistente_config").upsert({ tenant_id: tenantId, ...cfg }, { onConflict: "tenant_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assistente-config", tenantId] }),
  });
}

export async function chamarIA<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("assistente-ia", { body });
  if (error) {
    let detalhe: any = null;
    try {
      detalhe = await (error as any).context?.json?.();
    } catch {
      /* sem corpo */
    }
    const codigo = detalhe?.error ?? "falha";
    const msg =
      codigo === "limite_mensal"
        ? `Você usou as ${detalhe?.limite ?? ""} consultas de IA deste mês.`
        : codigo === "sem_creditos_ia"
          ? "A IA está sem créditos no momento."
          : codigo === "ia_ocupada"
            ? "A IA está ocupada. Tente de novo em alguns minutos."
            : "Não foi possível falar com a IA agora.";
    throw new Error(msg);
  }
  return data as T;
}

export function useUsoIA(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["assistente-uso", tenantId],
    enabled: !!tenantId,
    staleTime: 30_000,
    queryFn: () => chamarIA<{ usadas: number; limite: number }>({ acao: "uso", tenant_id: tenantId }),
  });
}
