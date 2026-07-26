import { Capacitor } from "@capacitor/core";
import { extractYouTubeId, isDirectVideo } from "@/lib/utils";
import { buildYouTubeEmbedUrl, type YouTubeEmbedOptions } from "@/lib/youtube-embed";

export type VlogEmbedOptions = {
  muted?: boolean;
  controls?: boolean;
  autoplay?: boolean;
  loop?: boolean;
};

export const buildYouTubeWatchUrl = (videoId: string) =>
  `https://www.youtube.com/watch?v=${videoId}`;

export const normalizeInstagramEmbedUrl = (url: string): string => {
  let clean = url.split("?")[0].split("#")[0];
  clean = clean.replace("/reels/", "/reel/");
  if (!clean.endsWith("/")) clean += "/";
  return `${clean}embed/captioned/`;
};

export const buildTikTokEmbedUrl = (url: string): string | null => {
  const m = url.match(/\/video\/(\d+)/);
  return m ? `https://www.tiktok.com/embed/v2/${m[1]}` : null;
};

/** Returns an iframe `src` for vlog URLs (YouTube, Instagram, TikTok). Direct MP4 returns null. */
export const buildVlogEmbedUrl = (url: string, opts: VlogEmbedOptions = {}): string | null => {
  const yt = extractYouTubeId(url);
  if (yt) {
    const embedOpts: YouTubeEmbedOptions = {
      autoplay: opts.autoplay ?? true,
      mute: opts.muted ?? true,
      loop: opts.loop ?? false,
      controls: opts.controls ?? true,
      rel: false,
      modestbranding: true,
      playsinline: true,
    };
    return buildYouTubeEmbedUrl(yt, embedOpts);
  }

  if (url.includes("instagram.com")) {
    return normalizeInstagramEmbedUrl(url);
  }

  return buildTikTokEmbedUrl(url);
};

export const resolveVideoPlayback = (url: string) => {
  const ytId = extractYouTubeId(url);
  const embedUrl = buildVlogEmbedUrl(url, { muted: false, controls: true, autoplay: true });
  return {
    url,
    ytId,
    embedUrl,
    isDirect: isDirectVideo(url),
    watchUrl: ytId ? buildYouTubeWatchUrl(ytId) : url,
  };
};

export const openVideoExternally = (url: string) => {
  if (Capacitor.isNativePlatform()) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
};
