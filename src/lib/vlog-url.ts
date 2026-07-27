export type VlogPlatform = "youtube" | "instagram" | "tiktok" | "other";

const URL_IN_TEXT = /https?:\/\/[^\s<>"']+/i;
const YOUTUBE_ID_IN_URL = /(?:youtu\.be\/|[?&]v=|\/shorts\/|\/live\/|\/embed\/)([A-Za-z0-9_-]{11})/i;

/** Pulls the first http(s) URL from pasted share text (common on mobile). */
export const extractFirstUrl = (text: string): string | null => {
  const match = text.trim().match(URL_IN_TEXT);
  if (!match) return null;
  return match[0].replace(/[.,!?;:)\]]+$/, "");
};

export const detectVlogPlatform = (url: string): VlogPlatform => {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (
    u.includes("instagram.com") ||
    u.includes("instagr.am") ||
    u.includes("ig.me")
  ) {
    return "instagram";
  }
  if (u.includes("tiktok.com") || u.includes("vm.tiktok.com")) return "tiktok";
  return "other";
};

export const isDownloadableVlogUrl = (url: string) => {
  const platform = detectVlogPlatform(url);
  // YouTube não é baixado pelo Cobalt (instável / bloqueado). Usa embed direto via link manual.
  return platform === "instagram" || platform === "tiktok";
};

export const extractVlogYouTubeId = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const match = url.match(YOUTUBE_ID_IN_URL);
  return match?.[1] ?? null;
};

export const buildYouTubeThumbnailUrl = (videoId: string) =>
  `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

export const isVlogVideoPageUrl = (value: string | null | undefined) => {
  const url = value?.toLowerCase() ?? "";
  return (
    url.includes("youtube.com/watch") ||
    url.includes("youtu.be/") ||
    url.includes("youtube.com/shorts/") ||
    url.includes("youtube.com/live/") ||
    url.includes("youtube.com/embed/") ||
    url.includes("instagram.com/") ||
    url.includes("instagr.am/") ||
    url.includes("tiktok.com/") ||
    url.includes("vm.tiktok.com/")
  );
};

/** Normalizes URLs before saving to DB or sending to vlog-download. */
export const normalizeVlogUrl = (raw: string): string => {
  let input = raw.trim();
  const extracted = extractFirstUrl(input);
  if (extracted) input = extracted;

  if (!/^https?:\/\//i.test(input)) {
    input = `https://${input.replace(/^\/\//, "")}`;
  }

  try {
    const url = new URL(input);

    if (url.hostname === "youtu.be" && url.pathname.length > 1) {
      const id = url.pathname.slice(1).split("/")[0];
      return `https://www.youtube.com/watch?v=${id}`;
    }
    if (url.hostname.includes("youtube.com") && url.pathname === "/watch") {
      const id = url.searchParams.get("v");
      if (id) return `https://www.youtube.com/watch?v=${id}`;
    }

    url.hash = "";
    url.search = "";

    if (url.hostname.includes("youtube.com") && (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/live/") || url.pathname.startsWith("/embed/"))) {
      const id = url.pathname.split("/")[2];
      if (id) return `https://www.youtube.com/watch?v=${id}`;
    }

    if (url.hostname === "instagr.am" || url.hostname.endsWith(".instagr.am")) {
      url.hostname = "www.instagram.com";
    }

    if (url.hostname.includes("instagram.com") || url.hostname === "ig.me") {
      let path = url.pathname.replace(/\/+$/, "");
      path = path.replace("/reels/", "/reel/");
      if (path && !path.endsWith("/")) path += "/";
      return `https://www.instagram.com${path}`;
    }

    if (url.hostname.includes("tiktok.com") || url.hostname === "vm.tiktok.com") {
      return url.toString();
    }

    return url.toString();
  } catch {
    return input;
  }
};

/** Validates and normalizes user input; returns null when no usable URL. */
export const prepareVlogUrl = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const candidate = extractFirstUrl(trimmed) || trimmed;
  if (!/^https?:\/\//i.test(candidate) && !/^[a-z0-9.-]+\.[a-z]{2,}/i.test(candidate)) {
    return null;
  }

  const normalized = normalizeVlogUrl(candidate);
  try {
    new URL(normalized);
    return normalized;
  } catch {
    return null;
  }
};
