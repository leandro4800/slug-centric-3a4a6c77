// Publica um Reel no Instagram usando Graph API (v21.0)
// Requer: tenants_private.instagram_access_token + instagram_business_account_id
// Fluxo: POST /{ig-user-id}/media (container) -> poll status -> POST /{ig-user-id}/media_publish
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const FB = "https://graph.facebook.com/v21.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const auth = req.headers.get("Authorization");
  if (!auth) return json(401, { error: "missing authorization" });
  const { data: userData } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
  if (!userData?.user) return json(401, { error: "invalid session" });

  let body: { tenant_id?: string; video_url?: string; caption?: string; media_type?: "REELS" | "STORIES" } = {};
  try { body = await req.json(); } catch { return json(400, { error: "invalid json" }); }
  const { tenant_id, video_url, caption } = body;
  const media_type = body.media_type || "REELS";
  if (!tenant_id || !video_url) return json(400, { error: "missing tenant_id or video_url" });

  // Authorization: user must be coach of the tenant or admin (NOT student/aluno)
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .in("role", ["coach", "admin"])
    .or(`tenant_id.eq.${tenant_id},role.eq.admin`)
    .maybeSingle();
  if (!roleRow) return json(403, { error: "not allowed for this tenant" });

  // Load IG credentials
  const { data: priv, error: pErr } = await supabase
    .from("tenants_private")
    .select("instagram_access_token, instagram_business_account_id")
    .eq("tenant_id", tenant_id)
    .maybeSingle();
  if (pErr) return json(500, { error: pErr.message });
  if (!priv?.instagram_access_token || !priv?.instagram_business_account_id) {
    return json(400, { error: "Instagram não configurado para este tenant. Cole o Access Token e o IG Business Account ID no painel de Vlogs." });
  }

  const igId = priv.instagram_business_account_id;
  const token = priv.instagram_access_token;

  // 1) Create media container
  const params = new URLSearchParams({
    media_type,
    video_url,
    caption: caption || "",
    access_token: token,
  });
  if (media_type === "REELS") params.set("share_to_feed", "true");

  const containerRes = await fetch(`${FB}/${igId}/media`, { method: "POST", body: params });
  const containerData = await containerRes.json();
  if (!containerRes.ok || !containerData.id) {
    return json(400, { error: "Falha criando container", details: containerData });
  }
  const creationId = containerData.id;

  // 2) Poll status (Reels demoram processar)
  let status = "IN_PROGRESS";
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const stRes = await fetch(`${FB}/${creationId}?fields=status_code,status&access_token=${token}`);
    const st = await stRes.json();
    status = st.status_code || st.status || "IN_PROGRESS";
    if (status === "FINISHED") break;
    if (status === "ERROR" || status === "EXPIRED") {
      return json(400, { error: "Vídeo rejeitado pelo Instagram", details: st });
    }
  }
  if (status !== "FINISHED") return json(408, { error: "Timeout aguardando processamento do Instagram" });

  // 3) Publish
  const pubRes = await fetch(`${FB}/${igId}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({ creation_id: creationId, access_token: token }),
  });
  const pubData = await pubRes.json();
  if (!pubRes.ok || !pubData.id) return json(400, { error: "Falha publicando", details: pubData });

  // 4) Fetch permalink and save to vlog_posts
  const linkRes = await fetch(`${FB}/${pubData.id}?fields=permalink,thumbnail_url,caption,timestamp&access_token=${token}`);
  const linkData = await linkRes.json();

  await supabase.from("vlog_posts").upsert(
    {
      tenant_id,
      url: linkData.permalink || `https://www.instagram.com/reel/${pubData.id}/`,
      platform: "instagram",
      title: (linkData.caption || caption || "").slice(0, 120),
      thumbnail_url: linkData.thumbnail_url || null,
      external_id: pubData.id,
      source: "graph_api",
      posted_at: linkData.timestamp || new Date().toISOString(),
      visivel: true,
    },
    { onConflict: "tenant_id,url" }
  );

  return json(200, { ok: true, ig_media_id: pubData.id, permalink: linkData.permalink });
});
