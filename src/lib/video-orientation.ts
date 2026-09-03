import { ScreenOrientation } from "@capacitor/screen-orientation";
import { isIOSNativeApp, isNativeApp } from "@/lib/native-platform";

let landscapeActive = false;

type VideoEl = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

const asVideo = (video?: HTMLVideoElement | null): VideoEl | undefined =>
  video ? (video as VideoEl) : undefined;

const isPortrait = () =>
  typeof window !== "undefined" && window.innerHeight > window.innerWidth;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** iOS WKWebView: fullscreen nativo no gesto do usuário. */
export function enterNativeFullscreen(video?: HTMLVideoElement | null): boolean {
  const el = asVideo(video);
  if (!el) return false;

  if (el.webkitEnterFullscreen && (isIOSNativeApp() || /iPhone|iPad|iPod/i.test(navigator.userAgent))) {
    try {
      el.webkitEnterFullscreen();
      return true;
    } catch {
      /* Fullscreen API */
    }
  }

  if (!document.fullscreenElement && el.requestFullscreen) {
    void el.requestFullscreen().catch(() => {});
    return true;
  }

  return false;
}

async function lockNativeLandscape(): Promise<boolean> {
  if (!isNativeApp()) {
    try {
      await screen.orientation?.lock?.("landscape");
      return true;
    } catch {
      return false;
    }
  }

  try {
    await ScreenOrientation.lock({ orientation: "landscape-primary" });
    return true;
  } catch {
    try {
      await ScreenOrientation.lock({ orientation: "landscape" });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Trava paisagem + tenta fullscreen nativo.
 * Se o OS continuar em retrato, o caller deve usar o overlay CSS (rotate 90°).
 */
export async function startLandscapePlayback(
  video?: HTMLVideoElement | null,
): Promise<"native" | "css"> {
  if (typeof window === "undefined") return "css";
  landscapeActive = true;

  enterNativeFullscreen(video);
  await lockNativeLandscape();
  await sleep(180);

  const el = asVideo(video);
  if (el?.webkitDisplayingFullscreen) return "native";
  if (document.fullscreenElement) return "native";
  if (!isPortrait()) return "native";
  return "css";
}

export async function lockLandscapeForVideo(video?: HTMLVideoElement | null) {
  await startLandscapePlayback(video);
}

export async function unlockLandscapeVideo(video?: HTMLVideoElement | null) {
  if (!landscapeActive) return;
  landscapeActive = false;

  const el = asVideo(video);
  try {
    if (el?.webkitDisplayingFullscreen && el.webkitExitFullscreen) {
      el.webkitExitFullscreen();
    }
  } catch {
    /* ok */
  }

  if (isNativeApp()) {
    try {
      await ScreenOrientation.unlock();
      await ScreenOrientation.lock({ orientation: "portrait-primary" });
      await ScreenOrientation.unlock();
    } catch {
      /* ok */
    }
  }

  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  } catch {
    /* ok */
  }

  try {
    screen.orientation?.unlock?.();
  } catch {
    /* ok */
  }
}
