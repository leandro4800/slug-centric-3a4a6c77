import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, extractBearerToken, findAthlete, getServiceClient, jsonResult, resolveTenant } from "./_shared";

export default defineTool({
  name: "get_athlete_diet",
  title: "Consultar dieta do aluno",
  description:
    "Retorna a dieta publicada do aluno com objetivo, kcal alvo, macros, refeições, horários e alimentos de cada refeição.",
  inputSchema: {
    mcp_token: z.string().optional().describe("Token MCP do coach. Opcional se enviado via cabeçalho Authorization: Bearer."),
    athlete_id: z.string().uuid().optional(),
    email: z.string().optional(),
    nome: z.string().optional(),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ mcp_token, athlete_id, email, nome }, extra) => {
    const effectiveToken = mcp_token || extractBearerToken(extra) || "";
    const auth = await resolveTenant(effectiveToken);
    if (!auth.ok) return errorResult(auth.error);
    const found = await findAthlete(auth.tenantId, { athlete_id, email, nome });
    if ("error" in found) return errorResult(found.error);
    const supa = getServiceClient();
    const { data: dieta, error } = await supa
      .from("dietas")
      .select("id, objetivo, tmb_estimada, kcal_alvo, macros_alvo, observacoes_clinicas, is_published, created_at")
      .eq("user_id", found.athlete.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return errorResult(`Erro consultando dieta: ${error.message}`);
    if (!dieta) return jsonResult({ aluno: found.athlete, dieta: null, refeicoes: [] });
    const { data: refeicoes } = await supa
      .from("refeicoes")
      .select("id, nome, horario, ordem, descricao_ia")
      .eq("dieta_id", dieta.id)
      .order("ordem");
    const ids = (refeicoes ?? []).map((r) => r.id);
    let itens: unknown[] = [];
    if (ids.length) {
      const { data: it } = await supa
        .from("itens_refeicao")
        .select("refeicao_id, quantidade_g, substituicoes, alimento_id, alimentos_taco:alimento_id(nome, kcal_100g, proteina_g, carbo_g, gordura_g)")
        .in("refeicao_id", ids);
      itens = it ?? [];
    }
    return jsonResult({ aluno: found.athlete, dieta, refeicoes: refeicoes ?? [], itens });
  },
});
