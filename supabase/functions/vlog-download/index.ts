// Baixa vídeo de uma URL pública (Instagram Reel, TikTok, YouTube Short) usando cobalt.tools
// e salva no bucket vlog_videos. Retorna a URL pública do vídeo.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Instâncias públicas do cobalt v10 (POST raiz, JSON). Fallback automático.
const COBALT_INSTANCES = [
  "https://dwnld.nichind.dev/",
  "https://co.eepy.today/",
  "https://cobalt-api.kwiatekmiki.com/",
];

async function fetchVideoUrl(sourceUrl: string): Promise<string | null> {
  for (const api of COBALT_INSTANCES) {
    try {
      const r = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          url: sourceUrl,
          videoQuality: "720",
          filenameStyle: "basic",
          downloadMode: "auto",
        }),
      });
      if (!r.ok) continue;
      const data = await r.json();
      if (data?.status === "redirect" || data?.status === "tunnel") {
        if (data.url) return data.url as string;
      }
      if (data?.status === "picker" && Array.isArray(data.picker)) {
        const v = data.picker.find((p: any) => p.type === "video") || data.picker[0];
        if (v?.url) return v.url as string;
      }
      if (data?.url) return data.url as string;
    } catch {
      continue;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  // Auth
  const auth = req.headers.get("Authorization");
  if (!auth) return json(401, { error: "missing authorization" });
  const { data: userData } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
  if (!userData?.user) return json(401, { error: "invalid session" });

  let body: { url?: string; tenant_id?: string } = {};
  try { body = await req.json(); } catch { return json(400, { error: "invalid json" }); }
  const { url, tenant_id } = body;
  if (!url || !/^https?:\/\//i.test(url)) return json(400, { error: "missing or invalid url" });
  if (!tenant_id) return json(400, { error: "missing tenant_id" });

  // Authorization: caller must be coach of this tenant OR global admin
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .in("role", ["coach", "admin"])
    .or(`tenant_id.eq.${tenant_id},role.eq.admin`)
    .maybeSingle();
  if (!roleRow) return json(403, { error: "not allowed for this tenant" });

  // 1) Resolve direct video URL via cobalt
  const directUrl = await fetchVideoUrl(url);
  if (!directUrl) return json(502, { error: "could not extract video — try another URL or upload manually" });

  // 2) Download bytes
  const videoRes = await fetch(directUrl);
  if (!videoRes.ok) return json(502, { error: `failed to download video: ${videoRes.status}` });
  const bytes = new Uint8Array(await videoRes.arrayBuffer());
  const contentType = videoRes.headers.get("content-type") || "video/mp4";
  const ext = contentType.includes("mp4") ? "mp4" : contentType.split("/")[1]?.split(";")[0] || "mp4";

  // 3) Upload to storage
  const path = `${tenant_id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const { error: upErr } = await supabase.storage.from("vlog_videos").upload(path, bytes, {
    contentType,
    upsert: false,
  });
  if (upErr) return json(500, { error: `upload failed: ${upErr.message}` });

  const { data: pub } = supabase.storage.from("vlog_videos").getPublicUrl(path);
  return json(200, { ok: true, video_url: pub.publicUrl, path, size: bytes.length });
});
