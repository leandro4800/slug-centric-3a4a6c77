import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, findAthlete, getServiceClient, jsonResult, resolveTenant } from "./_shared";

export default defineTool({
  name: "get_athlete_anamnesis",
  title: "Consultar anamnese do aluno",
  description:
    "Retorna a anamnese completa do aluno: histórico de saúde, sono, estresse, alimentação, suplementos, treino e ergogênicos.",
  inputSchema: {
    mcp_token: z.string(),
    athlete_id: z.string().uuid().optional(),
    email: z.string().optional(),
    nome: z.string().optional(),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ mcp_token, athlete_id, email, nome }) => {
    const auth = await resolveTenant(mcp_token);
    if (!auth.ok) return errorResult(auth.error);
    const found = await findAthlete(auth.tenantId, { athlete_id, email, nome });
    if ("error" in found) return errorResult(found.error);
    const supa = getServiceClient();
    const { data, error } = await supa
      .from("anamnese_aluno")
      .select("*")
      .eq("aluno_id", found.athlete.id)
      .maybeSingle();
    if (error) return errorResult(`Erro consultando anamnese: ${error.message}`);
    return jsonResult({ aluno: found.athlete, anamnese: data });
  },
});
