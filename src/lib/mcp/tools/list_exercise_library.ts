import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, getServiceClient, jsonResult, resolveTenantForRequest } from "./_shared";

export default defineTool({
  name: "list_exercise_library",
  title: "Listar biblioteca de exercícios e vídeos técnicos",
  description:
    "Lista os exercícios e vídeos técnicos disponíveis para o coach (tabelas referencia_exercicios, referencia_videos e biblioteca_exercicios), incluindo vídeos globais do app. Use antes de montar treino para escolher exercícios com vídeo já cadastrado.",
  inputSchema: {
    mcp_token: z.string().optional().describe("Token MCP do coach. Opcional se enviado via Authorization: Bearer."),
    search: z.string().optional().describe("Filtro por nome do exercício."),
    grupo_muscular: z.string().optional().describe("Filtro por grupamento muscular."),
    apenas_meus: z.boolean().optional().describe("Padrão false: inclui também os vídeos globais do app."),
    limit: z.number().int().min(1).max(300).optional().describe("Máximo por tabela (padrão 100)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ mcp_token, search, grupo_muscular, apenas_meus, limit }, extra) => {
    const auth = await resolveTenantForRequest(mcp_token, extra);
    if (!auth.ok) return errorResult(auth.error);
    const supa = getServiceClient();
    const max = limit ?? 100;
    const tenantFilter = (col = "tenant_id") =>
      apenas_meus ? `${col}.eq.${auth.tenantId}` : `${col}.eq.${auth.tenantId},${col}.is.null`;

    let refQ = supa
      .from("referencia_exercicios")
      .select("id, nome_exercicio, url_video, thumbnail_url, grupamento_muscular, tenant_id, origem")
      .or(tenantFilter())
      .order("nome_exercicio")
      .limit(max);
    if (search?.trim()) refQ = refQ.ilike("nome_exercicio", `%${search.trim()}%`);
    if (grupo_muscular?.trim()) refQ = refQ.ilike("grupamento_muscular", `%${grupo_muscular.trim()}%`);

    let vidQ = supa
      .from("referencia_videos")
      .select("id, nome_exercicio, url_video, video_coach_url, tenant_id")
      .or(tenantFilter())
      .order("nome_exercicio")
      .limit(max);
    if (search?.trim()) vidQ = vidQ.ilike("nome_exercicio", `%${search.trim()}%`);

    let bibQ = supa
      .from("biblioteca_exercicios")
      .select("id, nome, grupo_muscular, equipamento, nivel, series_trabalho, repeticoes, contraindicacoes, video_url, video_coach_url, tenant_id")
      .or(tenantFilter())
      .order("nome")
      .limit(max);
    if (search?.trim()) bibQ = bibQ.ilike("nome", `%${search.trim()}%`);
    if (grupo_muscular?.trim()) bibQ = bibQ.ilike("grupo_muscular", `%${grupo_muscular.trim()}%`);

    const [ref, vid, bib] = await Promise.all([refQ, vidQ, bibQ]);
    const erro = ref.error?.message ?? vid.error?.message ?? bib.error?.message;
    if (erro) return errorResult(`Erro consultando biblioteca: ${erro}`);

    return jsonResult({
      tenant: auth.tenantName,
      referencia_exercicios: ref.data ?? [],
      referencia_videos: vid.data ?? [],
      biblioteca_exercicios: bib.data ?? [],
      totais: {
        referencia_exercicios: ref.data?.length ?? 0,
        referencia_videos: vid.data?.length ?? 0,
        biblioteca_exercicios: bib.data?.length ?? 0,
      },
    });
  },
});
