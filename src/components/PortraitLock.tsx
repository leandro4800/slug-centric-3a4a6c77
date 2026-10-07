import { useEffect } from "react";
import { ScreenOrientation } from "@capacitor/screen-orientation";
import { isNativeApp } from "@/lib/native-platform";

/** Trava o app em retrato. Paisagem só via fullscreen nativo do vídeo. */
export function PortraitLock() {
  useEffect(() => {
    if (!isNativeApp()) return;
    void ScreenOrientation.lock({ orientation: "portrait" }).catch(() => {
      void ScreenOrientation.lock({ orientation: "portrait-primary" }).catch(() => {});
    });
  }, []);
  return null;
}
