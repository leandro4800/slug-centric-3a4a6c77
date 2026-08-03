import { PRODUCTION_APP_ORIGIN } from "@/lib/app-url";
import { isIOSNativeApp } from "@/lib/native-platform";
import { detectVlogPlatform, normalizeVlogUrl } from "@/lib/vlog-url";

const INSTAGRAM_PROXY_PATH = "/embed/instagram.html";

const INSTAGRAM_POST_PATH =
  /^(\/(?:[^/]+\/)?(?:reel|p|tv)\/[A-Za-z0-9_-]+)(?:\/embed(?:\/captioned)?)?\/?$/i;

/** Canonical Instagram page URL (no embed suffix). */
export const buildInstagramPageUrl = (rawUrl: string): string | null => {
  const normalized = normalizeVlogUrl(rawUrl);
  if (detectVlogPlatform(normalized) !== "instagram") return null;

  try {
    const url = new URL(normalized);
    let path = url.pathname.replace(/\/+$/, "");
    path = path.replace("/reels/", "/reel/");
    path = path.replace(/\/embed(?:\/captioned)?$/i, "");

    const match = path.match(INSTAGRAM_POST_PATH);
    if (!match) return null;

    return `https://www.instagram.com${match[1]}/`;
  } catch {
    return null;
  }
};

/** Instagram iframe embed URL for web players. */
export const buildInstagramEmbedUrl = (rawUrl: string): string | null => {
  const pageUrl = buildInstagramPageUrl(rawUrl);
  if (!pageUrl) return null;

  const path = new URL(pageUrl).pathname.replace(/\/+$/, "");
  return `https://www.instagram.com${path}/embed/captioned/`;
};

/** iOS Capacitor loads Instagram through the hosted proxy (same pattern as YouTube). */
export const buildInstagramPlayerUrl = (rawUrl: string): string | null => {
  const embedUrl = buildInstagramEmbedUrl(rawUrl);
  if (!embedUrl) return null;

  if (typeof window !== "undefined" && isIOSNativeApp()) {
    const params = new URLSearchParams({ url: embedUrl });
    return `${PRODUCTION_APP_ORIGIN}${INSTAGRAM_PROXY_PATH}?${params.toString()}`;
  }

  return embedUrl;
};

export const INSTAGRAM_IFRAME_ALLOW =
  "autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen";

export const INSTAGRAM_IFRAME_REFERRER_POLICY = "strict-origin-when-cross-origin";
