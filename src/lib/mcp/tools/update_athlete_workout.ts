import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, findAthlete, getServiceClient, jsonResult, resolveTenantForRequest } from "./_shared";

const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"] as const;

export default defineTool({
  name: "update_athlete_workout",
  title: "Criar/editar/remover exercício do treino",
  description:
    "Cria, atualiza ou remove um exercício prescrito do aluno. Use action='upsert' (com exercise_id para editar, sem ele para criar) ou action='delete' (exige exercise_id).",
  inputSchema: {
    mcp_token: z.string().optional().describe("Token MCP do coach. Opcional se enviado via Authorization: Bearer."),
    athlete_id: z.string().uuid().optional(),
    email: z.string().optional(),
    nome: z.string().optional(),
    action: z.enum(["upsert", "delete"]).describe("upsert = criar/editar; delete = remover."),
    exercise_id: z.string().uuid().optional().describe("ID da linha em treinos_prescritos."),
    dia_semana: z.enum(DIAS).optional().describe("Obrigatório ao criar um novo exercício."),
    exercicio: z.string().optional().describe("Nome do exercício. Obrigatório ao criar."),
    series: z.string().optional(),
    repeticoes: z.string().optional(),
    observacao: z.string().optional(),
    cadencia: z.string().optional(),
    detalhes_execucao: z.string().optional(),
    ordem: z.number().int().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (input, extra) => {
    const auth2 = await resolveTenantForRequest(input.mcp_token, extra);
    if (!auth2.ok) return errorResult(auth2.error);

    const found = await findAthlete(auth2.tenantId, {
      athlete_id: input.athlete_id,
      email: input.email,
      nome: input.nome,
    });
    if ("error" in found) return errorResult(found.error);

    const supa = getServiceClient();
    const alunoId = found.athlete.id;
    const SELECT =
      "id, dia_semana, ordem, exercicio, series, repeticoes, cadencia, observacao, detalhes_execucao, status";

    if (input.action === "delete") {
      if (!input.exercise_id) return errorResult("Informe exercise_id para remover um exercício.");
      const { data, error } = await supa
        .from("treinos_prescritos")
        .delete()
        .eq("id", input.exercise_id)
        .eq("tenant_id", auth2.tenantId)
        .eq("aluno_id", alunoId)
        .select(SELECT);
      if (error) return errorResult(`Erro removendo exercício: ${error.message}`);
      if (!data || data.length === 0) return errorResult("Exercício não encontrado para este aluno/tenant.");
      return jsonResult({ ok: true, acao: "removido", aluno: found.athlete, exercicio: data[0] });
    }

    // upsert
    if (input.exercise_id) {
      const patch: Record<string, unknown> = {};
      if (input.dia_semana !== undefined) patch.dia_semana = input.dia_semana;
      if (input.exercicio !== undefined) patch.exercicio = input.exercicio;
      if (input.series !== undefined) patch.series = input.series;
      if (input.repeticoes !== undefined) patch.repeticoes = input.repeticoes;
      if (input.observacao !== undefined) patch.observacao = input.observacao;
      if (input.cadencia !== undefined) patch.cadencia = input.cadencia;
      if (input.detalhes_execucao !== undefined) patch.detalhes_execucao = input.detalhes_execucao;
      if (input.ordem !== undefined) patch.ordem = input.ordem;
      if (Object.keys(patch).length === 0) return errorResult("Informe ao menos um campo para alterar.");
      patch.updated_at = new Date().toISOString();

      const { data, error } = await supa
        .from("treinos_prescritos")
        .update(patch)
        .eq("id", input.exercise_id)
        .eq("tenant_id", auth2.tenantId)
        .eq("aluno_id", alunoId)
        .select(SELECT);
      if (error) return errorResult(`Erro atualizando exercício: ${error.message}`);
      if (!data || data.length === 0) return errorResult("Exercício não encontrado para este aluno/tenant.");
      return jsonResult({ ok: true, acao: "atualizado", aluno: found.athlete, exercicio: data[0] });
    }

    if (!input.dia_semana) return errorResult("Informe dia_semana para criar um exercício.");
    if (!input.exercicio) return errorResult("Informe exercicio para criar um exercício.");

    let ordem = input.ordem;
    if (ordem === undefined) {
      const { data: last } = await supa
        .from("treinos_prescritos")
        .select("ordem")
        .eq("tenant_id", auth2.tenantId)
        .eq("aluno_id", alunoId)
        .eq("dia_semana", input.dia_semana)
        .order("ordem", { ascending: false })
        .limit(1)
        .maybeSingle();
      ordem = Number((last as { ordem?: number } | null)?.ordem ?? 0) + 1;
    }

    // dia_ordem: reutiliza a do dia existente; se for um dia novo, vai para o fim da sequência
    const { data: diasExistentes } = await supa
      .from("treinos_prescritos")
      .select("dia_semana, dia_ordem")
      .eq("tenant_id", auth2.tenantId)
      .eq("aluno_id", alunoId);
    const diasRows = (diasExistentes ?? []) as { dia_semana: string; dia_ordem: number | null }[];
    const diaAtual = diasRows.find((r) => r.dia_semana === input.dia_semana && r.dia_ordem != null);
    const diaOrdem = diaAtual
      ? Number(diaAtual.dia_ordem)
      : diasRows.reduce((m, r) => Math.max(m, Number(r.dia_ordem) || 0), 0) + 1;

    const { data, error } = await supa
      .from("treinos_prescritos")
      .insert({
        tenant_id: auth2.tenantId,
        aluno_id: alunoId,
        dia_semana: input.dia_semana,
        dia_ordem: diaOrdem,
        exercicio: input.exercicio,
        series: input.series ?? null,
        repeticoes: input.repeticoes ?? null,
        observacao: input.observacao ?? null,
        cadencia: input.cadencia ?? null,
        detalhes_execucao: input.detalhes_execucao ?? null,
        ordem,
        status: "ativo",
      })
      .select(SELECT);
    if (error) return errorResult(`Erro criando exercício: ${error.message}`);
    return jsonResult({ ok: true, acao: "criado", aluno: found.athlete, exercicio: data?.[0] ?? null });
  },
});
