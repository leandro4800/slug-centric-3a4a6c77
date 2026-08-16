import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, findAthlete, getServiceClient, jsonResult, resolveTenantForRequest } from "./_shared";

const itemSchema = z.object({
  alimento: z.string().min(1).describe("Nome do alimento (busca na base TACO; se não achar, entra como texto na descrição)."),
  quantidade_g: z.number().positive().optional(),
  substituicoes: z.string().optional(),
});

const refeicaoSchema = z.object({
  nome: z.string().min(1).describe('Ex: "Café da manhã".'),
  horario: z.string().optional().describe('Formato HH:MM, ex: "07:30".'),
  descricao_ia: z.string().optional().describe("Descrição livre da refeição."),
  itens: z.array(itemSchema).optional(),
});

export default defineTool({
  name: "set_athlete_diet",
  title: "Montar dieta do aluno",
  description:
    "Cria e publica uma nova dieta para o aluno, com objetivo, kcal alvo, macros e refeições (com horários e alimentos). Substitui a dieta anterior como a mais recente.",
  inputSchema: {
    mcp_token: z.string().optional().describe("Token MCP do coach. Opcional se enviado via Authorization: Bearer."),
    athlete_id: z.string().uuid().optional(),
    email: z.string().optional(),
    nome: z.string().optional(),
    objetivo: z.string().optional().describe('Ex: "emagrecimento", "hipertrofia".'),
    kcal_alvo: z.number().positive().optional(),
    macros_alvo: z
      .object({ proteina_g: z.number().optional(), carbo_g: z.number().optional(), gordura_g: z.number().optional() })
      .optional(),
    observacoes_clinicas: z.string().optional(),
    publicar: z.boolean().optional().describe("Padrão true: já publica a dieta para o aluno."),
    refeicoes: z.array(refeicaoSchema).min(1),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, extra) => {
    const auth = await resolveTenantForRequest(input.mcp_token, extra);
    if (!auth.ok) return errorResult(auth.error);
    const found = await findAthlete(auth.tenantId, {
      athlete_id: input.athlete_id,
      email: input.email,
      nome: input.nome,
    });
    if ("error" in found) return errorResult(found.error);
    const supa = getServiceClient();

    const { data: dieta, error: dietaErr } = await supa
      .from("dietas")
      .insert({
        user_id: found.athlete.id,
        objetivo: input.objetivo ?? null,
        kcal_alvo: input.kcal_alvo ?? null,
        macros_alvo: input.macros_alvo ?? null,
        observacoes_clinicas: input.observacoes_clinicas ?? null,
        is_published: input.publicar !== false,
      })
      .select("id")
      .single();
    if (dietaErr || !dieta) return errorResult(`Erro criando dieta: ${dietaErr?.message ?? "sem detalhes"}`);

    const dietaId = (dieta as { id: string }).id;
    const criadas: Array<{ id: string; nome: string; itens: number }> = [];

    for (let i = 0; i < input.refeicoes.length; i++) {
      const r = input.refeicoes[i];
      const { data: ref, error: refErr } = await supa
        .from("refeicoes")
        .insert({
          dieta_id: dietaId,
          nome: r.nome,
          horario: r.horario ?? null,
          ordem: i + 1,
          descricao_ia: r.descricao_ia ?? null,
        })
        .select("id")
        .single();
      if (refErr || !ref) return errorResult(`Erro criando refeição "${r.nome}": ${refErr?.message ?? ""}`);
      const refId = (ref as { id: string }).id;

      const itens = r.itens ?? [];
      let inseridos = 0;
      for (const it of itens) {
        const { data: alimento } = await supa
          .from("alimentos_taco")
          .select("id")
          .ilike("nome", `%${it.alimento.trim()}%`)
          .limit(1)
          .maybeSingle();
        const alimentoId = (alimento as { id?: string } | null)?.id ?? null;
        const sub = alimentoId ? it.substituicoes ?? null : [it.alimento, it.substituicoes].filter(Boolean).join(" — ");
        const { error: itemErr } = await supa.from("itens_refeicao").insert({
          refeicao_id: refId,
          alimento_id: alimentoId,
          quantidade_g: it.quantidade_g ?? null,
          substituicoes: sub || null,
        });
        if (!itemErr) inseridos++;
      }
      criadas.push({ id: refId, nome: r.nome, itens: inseridos });
    }

    return jsonResult({
      ok: true,
      aluno: found.athlete,
      dieta_id: dietaId,
      publicada: input.publicar !== false,
      refeicoes: criadas,
    });
  },
});
