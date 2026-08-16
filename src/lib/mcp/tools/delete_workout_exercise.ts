import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, findAthlete, getServiceClient, jsonResult, resolveTenantForRequest } from "./_shared";

const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"] as const;

export default defineTool({
  name: "delete_workout_exercise",
  title: "Remover exercício do treino",
  description:
    "Remove exercícios prescritos do aluno. Use exercise_id para remover um específico, ou dia_semana (+ opcionalmente exercicio) para remover do dia.",
  inputSchema: {
    mcp_token: z.string().optional().describe("Token MCP do coach. Opcional se enviado via Authorization: Bearer."),
    exercise_id: z.string().uuid().optional(),
    athlete_id: z.string().uuid().optional(),
    email: z.string().optional(),
    nome: z.string().optional(),
    dia_semana: z.enum(DIAS).optional(),
    exercicio: z.string().optional().describe("Nome (ou parte) do exercício a remover."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ mcp_token, exercise_id, athlete_id, email, nome, dia_semana, exercicio }, extra) => {
    const auth = await resolveTenantForRequest(mcp_token, extra);
    if (!auth.ok) return errorResult(auth.error);
    const supa = getServiceClient();

    let q = supa.from("treinos_prescritos").delete().eq("tenant_id", auth.tenantId);
    if (exercise_id) {
      q = q.eq("id", exercise_id);
    } else {
      const found = await findAthlete(auth.tenantId, { athlete_id, email, nome });
      if ("error" in found) return errorResult(found.error);
      if (!dia_semana && !exercicio) {
        return errorResult("Informe exercise_id, ou dia_semana e/ou exercicio para evitar apagar tudo.");
      }
      q = q.eq("aluno_id", found.athlete.id);
      if (dia_semana) q = q.eq("dia_semana", dia_semana);
      if (exercicio) q = q.ilike("exercicio", `%${exercicio.trim()}%`);
    }

    const { data, error } = await q.select("id, dia_semana, exercicio");
    if (error) return errorResult(`Erro removendo exercício: ${error.message}`);
    return jsonResult({ ok: true, removidos: data?.length ?? 0, exercicios: data ?? [] });
  },
});
