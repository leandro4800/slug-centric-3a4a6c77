import { Capacitor } from "@capacitor/core";
import { extractYouTubeId, isDirectVideo } from "@/lib/utils";
import { buildYouTubeEmbedUrl, type YouTubeEmbedOptions } from "@/lib/youtube-embed";
import {
  buildInstagramPageUrl,
  buildInstagramPlayerUrl,
} from "@/lib/instagram-embed";
import {
  buildYouTubeWatchUrl,
  detectVlogPlatform,
  normalizeVlogUrl,
  prepareVlogUrl,
  type VlogPlatform,
} from "@/lib/vlog-url";
import { isIOSNativeApp } from "@/lib/native-platform";

export type VlogEmbedOptions = {
  muted?: boolean;
  controls?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  /** Modal opened after user tap — allows direct embed attempt on iOS. */
  userInitiated?: boolean;
};

export const normalizeVideoUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  const prepared = prepareVlogUrl(url);
  return prepared ? normalizeVlogUrl(prepared) : url.trim();
};

export const buildTikTokEmbedUrl = (url: string): string | null => {
  const m = url.match(/\/video\/(\d+)/);
  return m ? `https://www.tiktok.com/embed/v2/${m[1]}` : null;
};

/** Returns an iframe `src` for vlog URLs (YouTube, Instagram, TikTok). Direct MP4 returns null. */
export const buildVlogEmbedUrl = (rawUrl: string, opts: VlogEmbedOptions = {}): string | null => {
  const url = normalizeVideoUrl(rawUrl);
  const platform = detectVlogPlatform(url);

  const yt = extractYouTubeId(url);
  if (yt) {
    const embedOpts: YouTubeEmbedOptions = {
      autoplay: opts.autoplay ?? true,
      mute: opts.muted ?? (isIOSNativeApp() ? true : false),
      loop: opts.loop ?? false,
      controls: opts.controls ?? true,
      rel: false,
      modestbranding: true,
      playsinline: true,
      enablejsapi: opts.userInitiated ?? true,
    };
    return buildYouTubeEmbedUrl(yt, embedOpts);
  }

  if (platform === "instagram") {
    return buildInstagramPlayerUrl(url);
  }

  return buildTikTokEmbedUrl(url);
};

export const resolveVideoPlayback = (rawUrl: string, opts: VlogEmbedOptions = {}) => {
  const url = normalizeVideoUrl(rawUrl);
  const platform: VlogPlatform = detectVlogPlatform(url);
  const ytId = extractYouTubeId(url);
  const instagramPageUrl = platform === "instagram" ? buildInstagramPageUrl(url) : null;
  const embedUrl = buildVlogEmbedUrl(url, {
    muted: opts.muted ?? (isIOSNativeApp() ? true : false),
    controls: true,
    autoplay: true,
    userInitiated: opts.userInitiated ?? true,
  });

  const watchUrl = ytId ? buildYouTubeWatchUrl(ytId) : instagramPageUrl || url;

  return {
    url,
    platform,
    ytId,
    instagramPageUrl,
    embedUrl,
    isDirect: isDirectVideo(url),
    watchUrl,
    isInstagram: platform === "instagram",
    isYouTube: platform === "youtube",
    /** Instagram blocks most in-app WebViews — open the official app/browser instead. */
    preferExternalPlayer: platform === "instagram" && Capacitor.isNativePlatform(),
  };
};

export const openVideoExternally = (url: string) => {
  const ytId = extractYouTubeId(url);
  // youtu.be abre direto no app do YouTube no iOS/Android
  const target = ytId ? `https://youtu.be/${ytId}` : url;

  if (Capacitor.isNativePlatform()) {
    const anchor = document.createElement("a");
    anchor.href = target;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return;
  }
  window.open(target, "_blank", "noopener,noreferrer");
};
