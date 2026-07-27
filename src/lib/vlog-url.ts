export type VlogPlatform = "youtube" | "instagram" | "tiktok" | "other";

const URL_IN_TEXT = /https?:\/\/[^\s<>"']+/i;
const YOUTUBE_ID_IN_URLS = [
  /(?:youtu\.be\/|[?&]v=|\/shorts\/|\/live\/|\/embed\/|\/v\/)([A-Za-z0-9_-]{11})/i,
  /i\.ytimg\.com\/vi\/([A-Za-z0-9_-]{11})/i,
];

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

export const extractVlogYouTubeId = (url: string | null | undefined): string | null => {
  if (!url) return null;
  for (const regex of YOUTUBE_ID_IN_URLS) {
    const match = url.match(regex);
    if (match?.[1]) return match[1];
  }
  return null;
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

/** Normalizes URLs before saving to DB. */
export const normalizeVlogUrl = (raw: string): string => {
  let input = raw.trim();
  const extracted = extractFirstUrl(input);
  if (extracted) input = extracted;

  if (!/^https?:\/\//i.test(input)) {
    input = `https://${input.replace(/^\/\//, "")}`;
  }

  try {
    const url = new URL(input);

    if (url.hostname.includes("youtube.com") || url.hostname === "youtu.be" || url.hostname.includes("ytimg.com")) {
      const id = extractVlogYouTubeId(url.toString());
      if (id) return `https://www.youtube.com/watch?v=${id}`;
    }

    url.hash = "";
    url.search = "";

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
    if (detectVlogPlatform(normalized) === "youtube" && !extractVlogYouTubeId(normalized)) {
      return null;
    }
    return normalized;
  } catch {
    return null;
  }
};
