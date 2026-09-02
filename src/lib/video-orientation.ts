import { ScreenOrientation } from "@capacitor/screen-orientation";
import { isNativeApp } from "@/lib/native-platform";

let landscapeActive = false;

/** Trava em paisagem ao iniciar vídeo uploadado (MP4/MOV). YouTube não usa isso. */
export async function lockLandscapeForVideo(video?: HTMLVideoElement | null) {
  if (typeof window === "undefined") return;
  landscapeActive = true;

  if (isNativeApp()) {
    try {
      await ScreenOrientation.lock({ orientation: "landscape" });
      return;
    } catch {
      /* fallback web abaixo */
    }
  }

  const el = video as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | undefined;
  if (el?.webkitEnterFullscreen && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    try {
      el.webkitEnterFullscreen();
      return;
    } catch {
      /* continua */
    }
  }

  try {
    if (el && !document.fullscreenElement && el.requestFullscreen) {
      await el.requestFullscreen();
    }
  } catch {
    /* ok */
  }

  try {
    await screen.orientation?.lock?.("landscape");
  } catch {
    /* navegador pode exigir fullscreen ou gesto — já tentamos */
  }
}

/** Restaura orientação ao pausar, terminar ou fechar o player. */
export async function unlockLandscapeVideo() {
  if (!landscapeActive) return;
  landscapeActive = false;

  if (isNativeApp()) {
    try {
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
