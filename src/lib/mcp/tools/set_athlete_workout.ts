import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, findAthlete, getServiceClient, jsonResult, resolveTenantForRequest } from "./_shared";

const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"] as const;

const exercicioSchema = z.object({
  exercicio: z.string().min(1).describe("Nome do exercício."),
  series: z.string().optional().describe('Ex: "4".'),
  repeticoes: z.string().optional().describe('Ex: "8-10".'),
  cadencia: z.string().optional(),
  observacao: z.string().optional(),
  detalhes_execucao: z.string().optional(),
  video_url: z.string().optional(),
});

export default defineTool({
  name: "set_athlete_workout",
  title: "Definir treino do dia",
  description:
    "Substitui (sobrescreve) o treino de um dia da semana do aluno pela lista de exercícios enviada. Use replace=false para apenas acrescentar exercícios ao final do dia.",
  inputSchema: {
    mcp_token: z.string().optional().describe("Token MCP do coach. Opcional se enviado via Authorization: Bearer."),
    athlete_id: z.string().uuid().optional(),
    email: z.string().optional(),
    nome: z.string().optional(),
    dia_semana: z.enum(DIAS),
    replace: z.boolean().optional().describe("Padrão true: apaga os exercícios existentes do dia antes de inserir."),
    exercicios: z.array(exercicioSchema).min(1).describe("Lista de exercícios na ordem desejada."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ mcp_token, athlete_id, email, nome, dia_semana, replace, exercicios }, extra) => {
    const auth = await resolveTenantForRequest(mcp_token, extra);
    if (!auth.ok) return errorResult(auth.error);
    const found = await findAthlete(auth.tenantId, { athlete_id, email, nome });
    if ("error" in found) return errorResult(found.error);
    const supa = getServiceClient();

    let startOrder = 0;
    if (replace === false) {
      const { data: last } = await supa
        .from("treinos_prescritos")
        .select("ordem")
        .eq("aluno_id", found.athlete.id)
        .eq("tenant_id", auth.tenantId)
        .eq("dia_semana", dia_semana)
        .order("ordem", { ascending: false })
        .limit(1)
        .maybeSingle();
      startOrder = Number((last as { ordem?: number } | null)?.ordem ?? 0);
    } else {
      const { error: delErr } = await supa
        .from("treinos_prescritos")
        .delete()
        .eq("aluno_id", found.athlete.id)
        .eq("tenant_id", auth.tenantId)
        .eq("dia_semana", dia_semana);
      if (delErr) return errorResult(`Erro limpando treino do dia: ${delErr.message}`);
    }

    // Preenche o vídeo técnico automaticamente quando o coach não informar,
    // buscando pelo nome na biblioteca do tenant (ou nos vídeos globais do app).
    async function lookupVideo(nome: string): Promise<string | null> {
      const like = `%${nome.trim()}%`;
      const ref = await supa
        .from("referencia_exercicios")
        .select("url_video, tenant_id")
        .ilike("nome_exercicio", like)
        .or(`tenant_id.eq.${auth.tenantId},tenant_id.is.null`)
        .order("tenant_id", { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      const refUrl = (ref.data as { url_video?: string } | null)?.url_video;
      if (refUrl) return refUrl;
      const vid = await supa
        .from("referencia_videos")
        .select("url_video")
        .ilike("nome_exercicio", like)
        .or(`tenant_id.eq.${auth.tenantId},tenant_id.is.null`)
        .limit(1)
        .maybeSingle();
      return (vid.data as { url_video?: string } | null)?.url_video ?? null;
    }

    const rows = await Promise.all(
      exercicios.map(async (ex, i) => ({
        tenant_id: auth.tenantId,
        aluno_id: found.athlete.id,
        dia_semana,
        ordem: startOrder + i + 1,
        exercicio: ex.exercicio,
        series: ex.series ?? null,
        repeticoes: ex.repeticoes ?? null,
        cadencia: ex.cadencia ?? null,
        observacao: ex.observacao ?? null,
        detalhes_execucao: ex.detalhes_execucao ?? null,
        video_url: ex.video_url ?? (await lookupVideo(ex.exercicio)),
        status: "ativo",
      })),
    );


    const { data, error } = await supa.from("treinos_prescritos").insert(rows).select("id, ordem, exercicio");
    if (error) return errorResult(`Erro salvando treino: ${error.message}`);
    return jsonResult({
      ok: true,
      aluno: found.athlete,
      dia_semana,
      modo: replace === false ? "acrescentado" : "substituido",
      total: data?.length ?? 0,
      exercicios: data ?? [],
    });
  },
});
