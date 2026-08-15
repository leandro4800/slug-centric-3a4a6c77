import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, findAthlete, getServiceClient, jsonResult, resolveTenantForRequest } from "./_shared";

export default defineTool({
  name: "get_athlete_progress",
  title: "Consultar evolução do aluno",
  description:
    "Retorna as métricas de evolução do aluno: check-ins (peso, BF%, medidas) e avaliações físicas recentes com composição corporal. Ideal para acompanhar cutting/bulking.",
  inputSchema: {
    mcp_token: z.string().optional().describe("Token MCP do coach. Opcional se enviado via cabeçalho Authorization: Bearer."),
    athlete_id: z.string().uuid().optional(),
    email: z.string().optional(),
    nome: z.string().optional(),
    checkin_limit: z.number().int().min(1).max(60).optional().describe("Quantidade de check-ins recentes (padrão 20)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ mcp_token, athlete_id, email, nome, checkin_limit }, extra) => {
    const auth = await resolveTenantForRequest(mcp_token, extra);
    if (!auth.ok) return errorResult(auth.error);
    const found = await findAthlete(auth.tenantId, { athlete_id, email, nome });
    if ("error" in found) return errorResult(found.error);
    const supa = getServiceClient();
    const limit = checkin_limit ?? 20;

    const [checkinsRes, avaliacoesRes, perfilTreinoRes] = await Promise.all([
      supa
        .from("evolucao_checkins")
        .select("data_checkin, peso_kg, bf_percentual, massa_magra_kg, massa_gorda_kg, observacoes")
        .eq("user_id", found.athlete.id)
        .order("data_checkin", { ascending: false })
        .limit(limit),
      supa
        .from("avaliacoes_fisicas")
        .select(
          "data, peso_kg, altura_cm, bf_pct_calculado, imc, massa_magra_kg, massa_gorda_kg, cintura_cm, quadril_cm, pescoco_cm, perimetro_braco_contraido_dir, perimetro_coxa_media_dir, metodo",
        )
        .eq("aluno_id", found.athlete.id)
        .eq("tenant_id", auth.tenantId)
        .order("data", { ascending: false })
        .limit(10),
      supa
        .from("perfis_treino")
        .select("objetivo, peso_kg, altura_cm, bf_pct, frequencia_semanal, tempo_treino")
        .eq("aluno_id", found.athlete.id)
        .maybeSingle(),
    ]);

    const checkins = checkinsRes.data ?? [];
    let delta: Record<string, number | null> | null = null;
    if (checkins.length >= 2) {
      const last = checkins[0];
      const first = checkins[checkins.length - 1];
      const dias = Math.max(
        1,
        Math.round(
          (new Date(last.data_checkin).getTime() - new Date(first.data_checkin).getTime()) / 86400000,
        ),
      );
      const dPeso = last.peso_kg != null && first.peso_kg != null ? Number(last.peso_kg) - Number(first.peso_kg) : null;
      const dBf =
        last.bf_percentual != null && first.bf_percentual != null
          ? Number(last.bf_percentual) - Number(first.bf_percentual)
          : null;
      delta = {
        dias,
        delta_peso_kg: dPeso,
        delta_bf_pp: dBf,
        ritmo_semanal_kg: dPeso != null ? (dPeso / dias) * 7 : null,
      };
    }

    return jsonResult({
      aluno: found.athlete,
      perfil_treino: perfilTreinoRes.data,
      resumo: delta,
      checkins,
      avaliacoes_fisicas: avaliacoesRes.data ?? [],
    });
  },
});
