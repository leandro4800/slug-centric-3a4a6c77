// Busca Reels recentes da conta Instagram Business via Graph API e upsert em vlog_posts.
// Requer: tenants_private.instagram_access_token + instagram_business_account_id
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { normalizeVlogUrl } from "../_shared/vlog-url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const FB = "https://graph.facebook.com/v21.0";
const MEDIA_FIELDS = "id,caption,media_type,media_product_type,permalink,thumbnail_url,timestamp";

type IgMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp?: string;
};

const isReel = (item: IgMedia) => {
  if (item.media_product_type?.toUpperCase() === "REELS") return true;
  const link = item.permalink?.toLowerCase() ?? "";
  return item.media_type?.toUpperCase() === "VIDEO" && link.includes("/reel/");
};

async function assertCoachAccess(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tenantId: string,
) {
  const { data: ownerTenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (ownerTenant) return true;

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role, tenant_id")
    .eq("user_id", userId)
    .in("role", ["coach", "admin"]);

  return (roles ?? []).some(
    (r) => r.role === "admin" || (r.role === "coach" && r.tenant_id === tenantId),
  );
}

async function fetchAllReels(igId: string, token: string, maxItems: number): Promise<IgMedia[]> {
  const reels: IgMedia[] = [];
  let nextUrl: string | null =
    `${FB}/${igId}/media?fields=${encodeURIComponent(MEDIA_FIELDS)}&limit=25&access_token=${encodeURIComponent(token)}`;

  while (nextUrl && reels.length < maxItems) {
    const res = await fetch(nextUrl);
    const payload = await res.json();
    if (!res.ok) {
      throw new Error(payload?.error?.message || "Falha ao listar mídia do Instagram");
    }

    for (const item of (payload.data as IgMedia[]) ?? []) {
      if (!isReel(item)) continue;
      reels.push(item);
      if (reels.length >= maxItems) break;
    }

    nextUrl = payload?.paging?.next ?? null;
  }

  return reels;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const auth = req.headers.get("Authorization");
  if (!auth) return json(401, { error: "missing authorization" });
  const { data: userData } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
  if (!userData?.user) return json(401, { error: "invalid session" });

  let body: { tenant_id?: string; limit?: number } = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid json" });
  }

  const tenantId = body.tenant_id ? String(body.tenant_id) : "";
  const maxItems = Math.min(Math.max(Number(body.limit) || 25, 1), 50);
  if (!tenantId) return json(400, { error: "missing tenant_id" });

  const allowed = await assertCoachAccess(supabase, userData.user.id, tenantId);
  if (!allowed) return json(403, { error: "not allowed for this tenant" });

  const { data: priv, error: privErr } = await supabase
    .from("tenants_private")
    .select("instagram_access_token, instagram_business_account_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (privErr) return json(500, { error: privErr.message });
  if (!priv?.instagram_access_token || !priv?.instagram_business_account_id) {
    return json(400, {
      error: "Instagram não configurado. Salve o Access Token e o IG Business Account ID no painel de Vlogs.",
    });
  }

  let reels: IgMedia[];
  try {
    reels = await fetchAllReels(
      priv.instagram_business_account_id,
      priv.instagram_access_token,
      maxItems,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar Reels";
    return json(400, { error: message });
  }

  let imported = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const reel of reels) {
    const permalink = reel.permalink?.trim();
    if (!permalink) continue;

    const url = normalizeVlogUrl(permalink);
    const row = {
      tenant_id: tenantId,
      platform: "instagram" as const,
      url,
      title: null,
      description: reel.caption?.trim() || null,
      thumbnail_url: reel.thumbnail_url || null,
      author: null,
      posted_at: reel.timestamp ? new Date(reel.timestamp).toISOString() : new Date().toISOString(),
      external_id: reel.id,
      source: "instagram_sync",
      visivel: true,
    };

    const { data: existing } = await supabase
      .from("vlog_posts")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("url", url)
      .maybeSingle();

    const { error: upsertErr } = await supabase
      .from("vlog_posts")
      .upsert(row, { onConflict: "tenant_id,url" });

    if (upsertErr) {
      errors.push(`${reel.id}: ${upsertErr.message}`);
      continue;
    }

    if (existing?.id) updated += 1;
    else imported += 1;
  }

  return json(200, {
    ok: true,
    fetched: reels.length,
    imported,
    updated,
    errors: errors.length ? errors : undefined,
  });
});
