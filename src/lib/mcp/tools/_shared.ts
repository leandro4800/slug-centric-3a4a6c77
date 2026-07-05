import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/** Service-role client used inside MCP tool handlers. Never exposed to the caller. */
export function getServiceClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configurados no ambiente da função.");
  }
  cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}

export interface AuthResult {
  ok: boolean;
  tenantId: string;
  tenantSlug: string;
  tenantName: string | null;
  error: string;
}

/** Resolve the tenant that owns the given mcp_token. */
export async function resolveTenant(mcpToken: string): Promise<AuthResult> {
  const empty: AuthResult = { ok: false, tenantId: "", tenantSlug: "", tenantName: null, error: "" };
  const token = (mcpToken ?? "").trim();
  if (!token) return { ...empty, error: "mcp_token obrigatório." };
  const supa = getServiceClient();
  const { data, error } = await supa
    .from("tenants_private")
    .select("tenant_id, tenants:tenant_id(slug, nome)")
    .eq("mcp_token", token)
    .maybeSingle();
  if (error) return { ...empty, error: `Falha ao validar token: ${error.message}` };
  if (!data) return { ...empty, error: "mcp_token inválido." };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = (data as any).tenants;
  return {
    ok: true,
    tenantId: (data as { tenant_id: string }).tenant_id,
    tenantSlug: t?.slug ?? "",
    tenantName: t?.nome ?? null,
    error: "",
  };
}

export function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export function jsonResult(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload as Record<string, unknown>,
  };
}

/** Find an athlete inside a tenant by id, email, or (partial) name. */
export async function findAthlete(
  tenantId: string,
  ref: { athlete_id?: string; email?: string; nome?: string },
) {
  const supa = getServiceClient();
  let q = supa
    .from("perfis")
    .select("id, nome_completo, email, telefone, sexo, data_nascimento")
    .eq("tenant_id", tenantId)
    .limit(1);
  if (ref.athlete_id) q = q.eq("id", ref.athlete_id);
  else if (ref.email) q = q.ilike("email", ref.email.trim());
  else if (ref.nome) q = q.ilike("nome_completo", `%${ref.nome.trim()}%`);
  else return { error: "Informe athlete_id, email ou nome do aluno." as const };
  const { data, error } = await q.maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Aluno não encontrado neste tenant." as const };
  return { athlete: data };
}
