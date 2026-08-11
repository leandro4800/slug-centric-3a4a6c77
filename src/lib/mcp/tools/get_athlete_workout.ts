import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, extractBearerToken, findAthlete, getServiceClient, jsonResult, resolveTenant } from "./_shared";

const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"] as const;

export default defineTool({
  name: "get_athlete_workout",
  title: "Consultar treino do aluno",
  description:
    "Retorna os exercícios prescritos para um aluno. Filtre por dia da semana (segunda, terca, ...) se quiser apenas o treino do dia.",
  inputSchema: {
    mcp_token: z.string().optional().describe("Token MCP do coach. Opcional se enviado via cabeçalho Authorization: Bearer."),
    athlete_id: z.string().uuid().optional(),
    email: z.string().optional(),
    nome: z.string().optional(),
    dia_semana: z.enum(DIAS).optional(),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ mcp_token, athlete_id, email, nome, dia_semana }, extra) => {
    const effectiveToken = mcp_token || extractBearerToken(extra) || "";
    const auth = await resolveTenant(effectiveToken);
    if (!auth.ok) return errorResult(auth.error);
    const found = await findAthlete(auth.tenantId, { athlete_id, email, nome });
    if ("error" in found) return errorResult(found.error);
    const supa = getServiceClient();
    let q = supa
      .from("treinos_prescritos")
      .select("dia_semana, ordem, exercicio, series, repeticoes, cadencia, observacao, status, detalhes_execucao")
      .eq("aluno_id", found.athlete.id)
      .eq("tenant_id", auth.tenantId)
      .order("dia_semana")
      .order("ordem");
    if (dia_semana) q = q.eq("dia_semana", dia_semana);
    const { data, error } = await q;
    if (error) return errorResult(`Erro consultando treino: ${error.message}`);
    return jsonResult({ aluno: found.athlete, dia_semana: dia_semana ?? "todos", exercicios: data ?? [] });
  },
});
