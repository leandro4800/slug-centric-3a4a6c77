// Busca vídeos recentes do canal YouTube do coach e upsert em vlog_posts.
// Requer: tenants_private.youtube_channel_id (ou @handle resolvido via YOUTUBE_API_KEY)
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { assertCoachAccess } from "../_shared/coach-access.ts";
import {
  buildYouTubeThumbnailUrl,
  buildYouTubeWatchUrl,
  parseYouTubeChannelInput,
} from "../_shared/vlog-url.ts";

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

type YtVideo = {
  id: string;
  title: string | null;
  publishedAt: string;
  thumbnailUrl: string | null;
};

const CHANNEL_ID_RE = /^UC[\w-]{10,}$/i;

const decodeXml = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

async function resolveChannelId(raw: string, apiKey?: string): Promise<string> {
  const parsed = parseYouTubeChannelInput(raw);
  if (parsed.channelId) return parsed.channelId;

  const handle = parsed.handle?.trim();
  if (!handle) {
    throw new Error("Informe o Channel ID (UC…) ou o @handle do canal YouTube.");
  }

  if (apiKey) {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${encodeURIComponent(apiKey)}`,
    );
    const payload = await res.json();
    if (res.ok && payload?.items?.[0]?.id) return payload.items[0].id as string;
    const msg = payload?.error?.message;
    if (msg) throw new Error(msg);
  }

  const pageRes = await fetch(`https://www.youtube.com/@${encodeURIComponent(handle)}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; AlphaCoach/1.0; +https://alpha-coach.app)",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!pageRes.ok) {
    throw new Error(
      "Não foi possível resolver o @handle. Use o Channel ID (UC…) ou configure YOUTUBE_API_KEY no Supabase.",
    );
  }
  const html = await pageRes.text();
  const match =
    html.match(/"channelId":"(UC[\w-]{10,})"/) ||
    html.match(/"externalId":"(UC[\w-]{10,})"/) ||
    html.match(/\/channel\/(UC[\w-]{10,})/);
  if (!match?.[1]) {
    throw new Error(
      "Canal não encontrado. Cole o Channel ID (UC…) em Studio → Configurações → Informações básicas.",
    );
  }
  return match[1];
}

function parseRssFeed(xml: string, maxItems: number): YtVideo[] {
  const videos: YtVideo[] = [];
  const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) ?? [];

  for (const entry of entries) {
    if (videos.length >= maxItems) break;

    const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const videoId = idMatch?.[1]?.trim();
    if (!videoId) continue;

    const titleMatch = entry.match(/<title>([^<]*)<\/title>/);
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
    const thumbMatch = entry.match(/<media:thumbnail url="([^"]+)"/);

    videos.push({
      id: videoId,
      title: titleMatch?.[1] ? decodeXml(titleMatch[1].trim()) : null,
      publishedAt: publishedMatch?.[1]?.trim() || new Date().toISOString(),
      thumbnailUrl: thumbMatch?.[1] || buildYouTubeThumbnailUrl(videoId),
    });
  }

  return videos;
}

async function fetchViaRss(channelId: string, maxItems: number): Promise<YtVideo[]> {
  const feedUrl =
    `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  const res = await fetch(feedUrl);
  if (!res.ok) throw new Error("Falha ao buscar feed RSS do YouTube");
  const xml = await res.text();
  return parseRssFeed(xml, maxItems);
}

async function fetchViaDataApi(
  channelId: string,
  apiKey: string,
  maxItems: number,
): Promise<YtVideo[]> {
  const chRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${encodeURIComponent(channelId)}&key=${encodeURIComponent(apiKey)}`,
  );
  const chPayload = await chRes.json();
  if (!chRes.ok) {
    throw new Error(chPayload?.error?.message || "Falha ao buscar canal no YouTube Data API");
  }

  const uploadsPlaylistId = chPayload?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads as
    | string
    | undefined;
  if (!uploadsPlaylistId) throw new Error("Playlist de uploads não encontrada para este canal");

  const videos: YtVideo[] = [];
  let pageToken: string | undefined;

  while (videos.length < maxItems) {
    const params = new URLSearchParams({
      part: "snippet",
      playlistId: uploadsPlaylistId,
      maxResults: String(Math.min(50, maxItems - videos.length)),
      key: apiKey,
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`);
    const payload = await res.json();
    if (!res.ok) {
      throw new Error(payload?.error?.message || "Falha ao listar vídeos do canal");
    }

    for (const item of payload?.items ?? []) {
      const videoId = item?.snippet?.resourceId?.videoId as string | undefined;
      if (!videoId) continue;
      const thumbs = item?.snippet?.thumbnails;
      videos.push({
        id: videoId,
        title: item?.snippet?.title?.trim() || null,
        publishedAt: item?.snippet?.publishedAt || new Date().toISOString(),
        thumbnailUrl:
          thumbs?.maxres?.url ||
          thumbs?.high?.url ||
          thumbs?.medium?.url ||
          thumbs?.default?.url ||
          buildYouTubeThumbnailUrl(videoId),
      });
      if (videos.length >= maxItems) break;
    }

    pageToken = payload?.nextPageToken;
    if (!pageToken) break;
  }

  return videos;
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
    .select("youtube_channel_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (privErr) return json(500, { error: privErr.message });
  if (!priv?.youtube_channel_id?.trim()) {
    return json(400, {
      error: "YouTube não configurado. Salve o Channel ID ou @handle do canal no painel de Vlogs.",
    });
  }

  const apiKey = Deno.env.get("YOUTUBE_API_KEY")?.trim() || undefined;

  let channelId: string;
  try {
    channelId = await resolveChannelId(priv.youtube_channel_id, apiKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao resolver canal YouTube";
    return json(400, { error: message });
  }

  if (channelId !== priv.youtube_channel_id.trim() && CHANNEL_ID_RE.test(channelId)) {
    await supabase
      .from("tenants_private")
      .update({ youtube_channel_id: channelId })
      .eq("tenant_id", tenantId);
  }

  let videos: YtVideo[];
  try {
    videos = apiKey
      ? await fetchViaDataApi(channelId, apiKey, maxItems)
      : await fetchViaRss(channelId, maxItems);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar vídeos do YouTube";
    return json(400, { error: message });
  }

  let imported = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const video of videos) {
    const url = buildYouTubeWatchUrl(video.id);
    const row = {
      tenant_id: tenantId,
      platform: "youtube" as const,
      url,
      title: video.title,
      description: null,
      thumbnail_url: video.thumbnailUrl || buildYouTubeThumbnailUrl(video.id),
      author: null,
      posted_at: video.publishedAt,
      external_id: video.id,
      source: "youtube_sync",
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
      errors.push(`${video.id}: ${upsertErr.message}`);
      continue;
    }

    if (existing?.id) updated += 1;
    else imported += 1;
  }

  return json(200, {
    ok: true,
    channel_id: channelId,
    fetched: videos.length,
    imported,
    updated,
    via: apiKey ? "youtube_data_api" : "rss",
    errors: errors.length ? errors : undefined,
  });
});
