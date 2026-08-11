import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, extractBearerToken, getServiceClient, jsonResult, resolveTenant } from "./_shared";

export default defineTool({
  name: "list_athletes",
  title: "Listar alunos",
  description: "Lista os alunos (perfis) vinculados ao tenant do coach. Retorna id, nome, email e telefone.",
  inputSchema: {
    mcp_token: z.string().optional().describe("Token MCP do coach. Opcional se enviado via cabeçalho Authorization: Bearer."),
    search: z.string().optional().describe("Filtro opcional por nome ou email."),
    limit: z.number().int().min(1).max(200).optional().describe("Máximo de resultados (padrão 50)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ mcp_token, search, limit }, extra) => {
    const effectiveToken = mcp_token || extractBearerToken(extra) || "";
    const auth = await resolveTenant(effectiveToken);
    if (!auth.ok) return errorResult(auth.error);
    const supa = getServiceClient();
    let q = supa
      .from("perfis")
      .select("id, nome_completo, email, telefone, sexo, data_nascimento, onboarding_completo")
      .eq("tenant_id", auth.tenantId)
      .order("nome_completo", { ascending: true })
      .limit(limit ?? 50);
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      q = q.or(`nome_completo.ilike.${s},email.ilike.${s}`);
    }
    const { data, error } = await q;
    if (error) return errorResult(`Erro consultando alunos: ${error.message}`);
    return jsonResult({ tenant: auth.tenantName, total: data?.length ?? 0, alunos: data ?? [] });
  },
});
