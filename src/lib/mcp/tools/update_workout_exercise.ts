import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, findAthlete, getServiceClient, jsonResult, resolveTenantForRequest } from "./_shared";

const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"] as const;

export default defineTool({
  name: "update_workout_exercise",
  title: "Editar exercício do treino",
  description:
    "Edita um exercício já prescrito (séries, repetições, cadência, observação, nome ou vídeo). Identifique pelo exercise_id (retornado por get_athlete_workout) ou pelo nome do exercício + dia da semana.",
  inputSchema: {
    mcp_token: z.string().optional().describe("Token MCP do coach. Opcional se enviado via Authorization: Bearer."),
    exercise_id: z.string().uuid().optional().describe("ID da linha em treinos_prescritos."),
    athlete_id: z.string().uuid().optional(),
    email: z.string().optional(),
    nome: z.string().optional(),
    dia_semana: z.enum(DIAS).optional(),
    exercicio_atual: z.string().optional().describe("Nome (ou parte) do exercício a editar, quando não usar exercise_id."),
    novo_exercicio: z.string().optional(),
    series: z.string().optional(),
    repeticoes: z.string().optional(),
    cadencia: z.string().optional(),
    observacao: z.string().optional(),
    detalhes_execucao: z.string().optional(),
    video_url: z.string().optional(),
    ordem: z.number().int().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, extra) => {
    const auth = await resolveTenantForRequest(input.mcp_token, extra);
    if (!auth.ok) return errorResult(auth.error);
    const supa = getServiceClient();

    const patch: Record<string, unknown> = {};
    if (input.novo_exercicio !== undefined) patch.exercicio = input.novo_exercicio;
    if (input.series !== undefined) patch.series = input.series;
    if (input.repeticoes !== undefined) patch.repeticoes = input.repeticoes;
    if (input.cadencia !== undefined) patch.cadencia = input.cadencia;
    if (input.observacao !== undefined) patch.observacao = input.observacao;
    if (input.detalhes_execucao !== undefined) patch.detalhes_execucao = input.detalhes_execucao;
    if (input.video_url !== undefined) patch.video_url = input.video_url;
    if (input.ordem !== undefined) patch.ordem = input.ordem;
    if (Object.keys(patch).length === 0) return errorResult("Informe ao menos um campo para alterar.");
    patch.updated_at = new Date().toISOString();

    let q = supa.from("treinos_prescritos").update(patch).eq("tenant_id", auth.tenantId);

    if (input.exercise_id) {
      q = q.eq("id", input.exercise_id);
    } else {
      const found = await findAthlete(auth.tenantId, {
        athlete_id: input.athlete_id,
        email: input.email,
        nome: input.nome,
      });
      if ("error" in found) return errorResult(found.error);
      if (!input.exercicio_atual) return errorResult("Informe exercise_id ou exercicio_atual.");
      q = q.eq("aluno_id", found.athlete.id).ilike("exercicio", `%${input.exercicio_atual.trim()}%`);
      if (input.dia_semana) q = q.eq("dia_semana", input.dia_semana);
    }

    const { data, error } = await q.select("id, dia_semana, ordem, exercicio, series, repeticoes, cadencia, observacao");
    if (error) return errorResult(`Erro atualizando exercício: ${error.message}`);
    if (!data || data.length === 0) return errorResult("Nenhum exercício encontrado com esses critérios.");
    return jsonResult({ ok: true, atualizados: data.length, exercicios: data });
  },
});
