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

/**
 * Extract a bearer token from the tool handler's second argument, when the
 * runtime exposes the raw request headers (`extra.requestInfo.headers`) or a
 * verified token accessor (`ctx.getToken()`). Returns null when unavailable.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractBearerToken(extra: any): string | null {
  try {
    const headers = extra?.requestInfo?.headers;
    if (headers) {
      const raw =
        typeof headers.get === "function" ? headers.get("authorization") : headers["authorization"];
      if (raw) {
        const match = /^Bearer\s+(.+)$/i.exec(String(raw).trim());
        return match ? match[1].trim() : String(raw).trim();
      }
    }
    if (typeof extra?.getToken === "function") {
      const token = extra.getToken();
      if (token) return String(token).trim();
    }
    return null;
  } catch {
    return null;
  }
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

/** Resolve tenant from the verified OAuth user (token `sub`). */
export async function resolveTenantByUser(userId: string): Promise<AuthResult> {
  const empty: AuthResult = { ok: false, tenantId: "", tenantSlug: "", tenantName: null, error: "" };
  if (!userId) return { ...empty, error: "Usuário não identificado no token." };
  const supa = getServiceClient();
  const owned = await supa
    .from("tenants")
    .select("id, slug, nome")
    .eq("owner_user_id", userId)
    .limit(1)
    .maybeSingle();
  if (owned.data) {
    const t = owned.data as { id: string; slug: string; nome: string | null };
    return { ok: true, tenantId: t.id, tenantSlug: t.slug ?? "", tenantName: t.nome ?? null, error: "" };
  }
  const role = await supa
    .from("user_roles")
    .select("tenant_id, role, tenants:tenant_id(slug, nome)")
    .eq("user_id", userId)
    .in("role", ["coach", "admin"])
    .not("tenant_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (role.data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = role.data as any;
    return {
      ok: true,
      tenantId: d.tenant_id,
      tenantSlug: d.tenants?.slug ?? "",
      tenantName: d.tenants?.nome ?? null,
      error: "",
    };
  }
  return { ...empty, error: "Esta conta não é coach de nenhum tenant." };
}

/**
 * Resolve o tenant da chamada: primeiro pelo usuário autenticado via OAuth,
 * com fallback para o `mcp_token` (compatibilidade com clientes antigos).
 */
export async function resolveTenantForRequest(
  mcpToken: string | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extra: any,
): Promise<AuthResult> {
  const userId = typeof extra?.getUserId === "function" ? extra.getUserId() : null;
  if (userId) {
    const byUser = await resolveTenantByUser(String(userId));
    if (byUser.ok) return byUser;
    if (!mcpToken) return byUser;
  }
  const token = mcpToken || extractBearerToken(extra) || "";
  return resolveTenant(token);
}
