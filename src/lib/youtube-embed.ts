import { PRODUCTION_APP_ORIGIN } from "@/lib/app-url";
import { isIOSNativeApp } from "@/lib/native-platform";

export type YouTubeEmbedOptions = {
  autoplay?: boolean;
  mute?: boolean;
  loop?: boolean;
  controls?: boolean;
  playsinline?: boolean;
  rel?: boolean;
  modestbranding?: boolean;
  showinfo?: boolean;
  disablekb?: boolean;
  iv_load_policy?: number;
  enablejsapi?: boolean;
  /** Override YouTube JS API origin (must match window.location.origin for postMessage control). */
  origin?: string;
};

const YOUTUBE_PROXY_PATH = "/embed/youtube.html";

const appendParams = (params: URLSearchParams, videoId: string, opts: YouTubeEmbedOptions) => {
  if (opts.autoplay) params.set("autoplay", "1");
  if (opts.mute) params.set("mute", "1");
  if (opts.loop) {
    params.set("loop", "1");
    params.set("playlist", videoId);
  }
  if (opts.controls === false) params.set("controls", "0");
  else if (opts.controls === true) params.set("controls", "1");
  if (opts.playsinline !== false) params.set("playsinline", "1");
  if (opts.rel === false) params.set("rel", "0");
  if (opts.modestbranding) params.set("modestbranding", "1");
  if (opts.showinfo === false) params.set("showinfo", "0");
  if (opts.disablekb) params.set("disablekb", "1");
  if (opts.iv_load_policy !== undefined) params.set("iv_load_policy", String(opts.iv_load_policy));
  if (opts.enablejsapi) params.set("enablejsapi", "1");
  params.set("origin", opts.origin ?? PRODUCTION_APP_ORIGIN);
};

/** Builds a YouTube embed URL that works in Safari and Capacitor iOS (Error 153). */
export const buildYouTubeEmbedUrl = (videoId: string, opts: YouTubeEmbedOptions = {}): string => {
  const params = new URLSearchParams();
  appendParams(params, videoId, opts);

  if (typeof window !== "undefined" && isIOSNativeApp()) {
    params.set("v", videoId);
    return `${PRODUCTION_APP_ORIGIN}${YOUTUBE_PROXY_PATH}?${params.toString()}`;
  }

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
};

export const YOUTUBE_IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";

export const YOUTUBE_IFRAME_REFERRER_POLICY = "strict-origin-when-cross-origin";
