// Public webhook to ingest vlog posts from external automations (Make/n8n/Apify/Zapier)
// Auth: tenants.vlog_webhook_secret passed as `secret` (body or query) OR `X-Webhook-Secret` header.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { detectVlogPlatform, normalizeVlogUrl, prepareVlogUrl } from "../_shared/vlog-url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const detectPlatform = detectVlogPlatform;

const extractYouTubeId = (url: string): string | null => {
  const m = url.match(/(?:youtu\.be\/|v=|\/shorts\/|\/live\/|\/embed\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
};

interface OEmbed {
  title?: string;
  thumbnail_url?: string;
  author_name?: string;
}

const fetchOEmbed = async (platform: string, url: string): Promise<OEmbed | null> => {
  try {
    let endpoint: string | null = null;
    if (platform === "youtube") {
      endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
    } else if (platform === "tiktok") {
      endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    }
    if (!endpoint) return null;
    const r = await fetch(endpoint, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) return null;
    return (await r.json()) as OEmbed;
  } catch {
    return null;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "invalid json body" });
  }

  const u = new URL(req.url);
  const headerSecret = req.headers.get("x-webhook-secret");
  const secret = String(payload.secret || u.searchParams.get("secret") || headerSecret || "");
  const rawUrl = String(payload.url || "").trim();
  const url = prepareVlogUrl(rawUrl) || rawUrl;
  const tenantSlug = payload.tenant_slug ? String(payload.tenant_slug) : null;
  const tenantId = payload.tenant_id ? String(payload.tenant_id) : null;

  if (!secret) return json(401, { error: "missing webhook secret" });
  if (!url || !/^https?:\/\//i.test(url)) return json(400, { error: "missing or invalid url" });

  // Resolve tenant by secret (and optionally slug/id for an extra check)
  let q = supabase.from("tenants").select("id, slug, vlog_webhook_secret").eq("vlog_webhook_secret", secret);
  if (tenantId) q = q.eq("id", tenantId);
  if (tenantSlug) q = q.eq("slug", tenantSlug);
  const { data: tenant, error: tErr } = await q.maybeSingle();
  if (tErr) return json(500, { error: tErr.message });
  if (!tenant) return json(401, { error: "invalid webhook secret" });

  const platform = (payload.platform as string | undefined)?.toLowerCase() || detectPlatform(normalizeVlogUrl(url));

  // Enrichment: thumbnail + author via oEmbed (NUNCA salva título em vlogs)
  let thumbnail_url = (payload.thumbnail_url as string | undefined) || null;
  let author = (payload.author as string | undefined) || null;

  if (!thumbnail_url || !author) {
    const oe = await fetchOEmbed(platform, url);
    if (oe) {
      thumbnail_url = thumbnail_url || oe.thumbnail_url || null;
      author = author || oe.author_name || null;
    }
  }
  if (!thumbnail_url && platform === "youtube") {
    const id = extractYouTubeId(url);
    if (id) thumbnail_url = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  }

  const externalId = payload.external_id ? String(payload.external_id) : null;
  const description = payload.description ? String(payload.description) : null;
  const postedAt = payload.posted_at ? new Date(String(payload.posted_at)).toISOString() : new Date().toISOString();

  const { data: row, error: insErr } = await supabase
    .from("vlog_posts")
    .upsert(
      {
        tenant_id: tenant.id,
        platform,
        url: normalizeVlogUrl(url),
        title: null,
        description,
        thumbnail_url,
        author,
        posted_at: postedAt,
        external_id: externalId,
        source: "webhook",
        visivel: true,
      },
      { onConflict: "tenant_id,url" }
    )
    .select()
    .single();

  if (insErr) return json(500, { error: insErr.message });

  return json(200, { ok: true, post: row });
});
