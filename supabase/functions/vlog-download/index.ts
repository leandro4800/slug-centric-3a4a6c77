// Baixa vídeo de URL pública (Instagram, TikTok, YouTube) via Cobalt e salva no bucket vlog_videos.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { detectVlogPlatform, normalizeVlogUrl, prepareVlogUrl } from "../_shared/vlog-url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const COBALT_INSTANCES = [
  "https://dwnld.nichind.dev/",
  "https://cobalt.canine.tools/",
  "https://cobalt-backend.canine.tools/",
];

const MANUAL_FALLBACK_MSG =
  "O serviço público de download está instável no momento. Use \"Adicionar link manual\" logo acima (cole a URL do Reel/TikTok/YouTube e o app faz o embed direto) ou \"Enviar vídeo (upload)\" abaixo para subir o arquivo do seu celular.";

const COBALT_ERROR_PT: Record<string, string> = {
  "content.no_valid_content":
    "Este vídeo não permite download automático (privado, restrito ou bloqueado pela plataforma).",
  "error.api.fetch.critical": "Serviço de download indisponível no momento. Tente upload manual do MP4.",
  "error.api.fetch.empty": "Nenhum arquivo de vídeo encontrado neste link.",
  "error.api.link.invalid": "Link inválido. Cole a URL completa do Reel, TikTok ou YouTube.",
};

const platformFallbackMessage = (platform: ReturnType<typeof detectVlogPlatform>): string => {
  if (platform === "instagram") {
    return "Não foi possível baixar este Reel. Salve o vídeo no celular e use “Enviar vídeo (Upload)”, ou “Adicionar link manual” para mostrar na home.";
  }
  if (platform === "youtube") {
    return "Para YouTube na home use “Adicionar link manual”. Para repost, faça upload do MP4 ou tente outro link.";
  }
  return "Não foi possível baixar este vídeo. Tente upload manual do arquivo MP4.";
};

const cobaltInstances = (): string[] => {
  const custom = Deno.env.get("COBALT_API_URL")?.trim();
  if (custom) return [custom.endsWith("/") ? custom : `${custom}/`];
  return COBALT_INSTANCES;
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

async function fetchVideoUrl(
  sourceUrl: string,
  platform: ReturnType<typeof detectVlogPlatform>,
): Promise<{ url: string | null; error: string | null }> {
  let lastError = platformFallbackMessage(platform);

  for (const api of cobaltInstances()) {
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
        console.warn("[vlog-download] cobalt HTTP", api, r.status);
        lastError = "Serviço de download temporariamente indisponível. Tente upload manual do MP4.";
        continue;
      }

      const data = (await r.json()) as Record<string, unknown>;
      if (data.status === "error") {
        const code = (data.error as { code?: string } | undefined)?.code;
        lastError = (code && COBALT_ERROR_PT[code]) || platformFallbackMessage(platform);
        console.warn("[vlog-download] cobalt error", code, sourceUrl);
        continue;
      }

      const directUrl = extractDirectUrl(data);
      if (directUrl) return { url: directUrl, error: null };
    } catch (err) {
      console.warn("[vlog-download] cobalt fetch failed", api, err);
      lastError = "Falha de rede ao contactar serviço de download. Tente upload manual.";
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
  const prepared = prepareVlogUrl(url || "");
  if (!prepared) return json(400, { error: "Informe uma URL válida (https://...)." });
  if (!tenant_id) return json(400, { error: "Tenant não identificado." });

  const normalizedUrl = normalizeVlogUrl(prepared);
  const platform = detectVlogPlatform(normalizedUrl);

  if (platform === "other") {
    return json(400, {
      error: "Link não reconhecido. Use URL completa de Reel/Post do Instagram, TikTok ou YouTube.",
    });
  }

  console.log("[vlog-download] request", { platform, normalizedUrl, tenant_id });

  // YouTube downloads via Cobalt público estão instáveis (instâncias fora do ar / exigem auth).
  // Para YouTube, oriente o coach a usar "Adicionar link manual" (o app faz embed direto).
  if (/(?:youtube\.com|youtu\.be)/i.test(normalizedUrl)) {
    return json(400, {
      error:
        "Para vídeos do YouTube, use \"Adicionar link manual\" logo acima — o app faz o embed direto sem precisar baixar.",
    });
  }

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

  const { url: directUrl, error: cobaltError } = await fetchVideoUrl(normalizedUrl, platform);
  if (!directUrl) {
    return json(502, { error: cobaltError || MANUAL_FALLBACK_MSG });
  }

  let videoRes: Response;
  try {
    videoRes = await fetch(directUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AlphaCoach/1.7)",
        Accept: "video/*,*/*",
      },
      redirect: "follow",
    });
  } catch (err) {
    return json(502, {
      error: `Falha ao baixar o arquivo. ${platformFallbackMessage(platform)}`,
    });
  }

  if (!videoRes.ok) {
    return json(502, { error: platformFallbackMessage(platform) });
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
  return json(200, {
    ok: true,
    video_url: pub.publicUrl,
    path,
    size: bytes.length,
    platform,
    source_url: normalizedUrl,
  });
});
