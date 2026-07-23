// Baixa vídeo de URL pública (Instagram, TikTok, YouTube) via Cobalt e salva no bucket vlog_videos.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const COBALT_INSTANCES = [
  "https://dwnld.nichind.dev/",
  "https://co.eepy.today/",
];

const COBALT_ERROR_PT: Record<string, string> = {
  "content.no_valid_content": "Este vídeo não permite download (privado, restrito ou indisponível).",
  "error.api.fetch.critical": "Serviço de download indisponível no momento. Tente de novo ou faça upload manual.",
  "error.api.fetch.empty": "Nenhum arquivo de vídeo encontrado neste link.",
  "error.api.link.invalid": "Link inválido. Cole a URL completa do Reel, TikTok ou YouTube.",
};

const normalizeMediaUrl = (raw: string): string => {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    url.hash = "";
    if (url.hostname === "youtu.be" && url.pathname.length > 1) {
      return `https://www.youtube.com/watch?v=${url.pathname.slice(1)}`;
    }
    if (url.hostname.includes("youtube.com") && url.pathname.startsWith("/shorts/")) {
      const id = url.pathname.split("/")[2];
      if (id) return `https://www.youtube.com/watch?v=${id}`;
    }
    return url.toString();
  } catch {
    return trimmed;
  }
};

const extractDirectUrl = (data: Record<string, unknown>): string | null => {
  const status = data.status as string | undefined;
  if ((status === "redirect" || status === "tunnel") && typeof data.url === "string") {
    return data.url;
  }
  if (status === "picker" && Array.isArray(data.picker)) {
    const item =
      (data.picker as Array<{ type?: string; url?: string }>).find((p) => p.type === "video") ||
      (data.picker as Array<{ url?: string }>)[0];
    return item?.url ?? null;
  }
  if (typeof data.url === "string") return data.url;
  return null;
};

async function fetchVideoUrl(sourceUrl: string): Promise<{ url: string | null; error: string | null }> {
  let lastError = "Não foi possível extrair o vídeo deste link.";

  for (const api of COBALT_INSTANCES) {
    try {
      const r = await fetch(api, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          url: sourceUrl,
          videoQuality: "720",
          filenameStyle: "basic",
          downloadMode: "auto",
          alwaysProxy: true,
        }),
      });

      if (!r.ok) {
        lastError = `Serviço ${api} respondeu ${r.status}.`;
        continue;
      }

      const data = (await r.json()) as Record<string, unknown>;
      if (data.status === "error") {
        const code = (data.error as { code?: string } | undefined)?.code;
        lastError = (code && COBALT_ERROR_PT[code]) || COBALT_ERROR_PT["content.no_valid_content"];
        continue;
      }

      const directUrl = extractDirectUrl(data);
      if (directUrl) return { url: directUrl, error: null };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Falha ao contactar serviço de download.";
    }
  }

  return { url: null, error: lastError };
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
  if (!auth) return json(401, { error: "Sessão expirada. Faça login novamente." });
  const token = auth.replace("Bearer ", "");
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (!userData?.user) return json(401, { error: userErr?.message || "Sessão inválida." });

  let body: { url?: string; tenant_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "JSON inválido." });
  }

  const { url, tenant_id } = body;
  if (!url || !/^https?:\/\//i.test(url)) return json(400, { error: "Informe uma URL válida (https://...)." });
  if (!tenant_id) return json(400, { error: "Tenant não identificado." });

  const normalizedUrl = normalizeMediaUrl(url);

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role,tenant_id")
    .eq("user_id", userData.user.id);

  const roleAllowed = (roles ?? []).some(
    (r: { role: string; tenant_id: string | null }) =>
      r.role === "admin" || (r.role === "coach" && r.tenant_id === tenant_id),
  );

  const { data: tenant } = await supabase
    .from("tenants")
    .select("owner_user_id")
    .eq("id", tenant_id)
    .maybeSingle();

  const allowed = roleAllowed || tenant?.owner_user_id === userData.user.id;
  if (!allowed) return json(403, { error: "Sem permissão para baixar vídeos deste tenant." });

  const { url: directUrl, error: cobaltError } = await fetchVideoUrl(normalizedUrl);
  if (!directUrl) {
    return json(502, {
      error:
        cobaltError ||
        "Não foi possível extrair o vídeo. Para YouTube na home, use “Adicionar link manual”. Para repost, tente outro link ou upload direto.",
    });
  }

  let videoRes: Response;
  try {
    videoRes = await fetch(directUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AlphaCoach/1.6)",
        Accept: "video/*,*/*",
      },
      redirect: "follow",
    });
  } catch (err) {
    return json(502, {
      error: `Falha ao baixar bytes do vídeo: ${err instanceof Error ? err.message : "erro de rede"}`,
    });
  }

  if (!videoRes.ok) {
    return json(502, { error: `Download do arquivo falhou (HTTP ${videoRes.status}). Tente upload manual.` });
  }

  const bytes = new Uint8Array(await videoRes.arrayBuffer());
  if (bytes.length === 0) return json(502, { error: "Arquivo de vídeo vazio." });
  if (bytes.length > 100 * 1024 * 1024) {
    return json(413, { error: "Vídeo maior que 100 MB. Comprima ou faça upload manual." });
  }

  const contentType = videoRes.headers.get("content-type") || "video/mp4";
  const ext = contentType.includes("mp4") ? "mp4" : contentType.split("/")[1]?.split(";")[0] || "mp4";
  const path = `${tenant_id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const { error: upErr } = await supabase.storage.from("vlog_videos").upload(path, bytes, {
    contentType,
    upsert: false,
  });
  if (upErr) return json(500, { error: `Falha ao salvar no storage: ${upErr.message}` });

  const { data: pub } = supabase.storage.from("vlog_videos").getPublicUrl(path);
  return json(200, { ok: true, video_url: pub.publicUrl, path, size: bytes.length });
});
