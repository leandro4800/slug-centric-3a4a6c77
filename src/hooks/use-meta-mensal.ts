import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const META_CHAVE = "meta_mensal_centavos";

/** Meta mensal de vendas do tenant, em centavos (null = não definida). */
export function useMetaMensal(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["meta-mensal", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_tenant")
        .select("valor")
        .eq("tenant_id", tenantId!)
        .eq("chave", META_CHAVE)
        .maybeSingle();
      if (error) throw error;
      const n = Number(data?.valor);
      return Number.isFinite(n) && n > 0 ? n : null;
    },
  });
  const salvar = useMutation({
    mutationFn: async (centavos: number) => {
      const { error } = await supabase
        .from("configuracoes_tenant")
        .upsert(
          { tenant_id: tenantId!, chave: META_CHAVE, valor: String(Math.round(centavos)), updated_at: new Date().toISOString() },
          { onConflict: "tenant_id,chave" },
        );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meta-mensal", tenantId] }),
  });
  return { meta: query.data ?? null, isLoading: query.isLoading, salvar };
}
