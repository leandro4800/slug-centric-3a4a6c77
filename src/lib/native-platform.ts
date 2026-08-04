import { Capacitor } from "@capacitor/core";

/** True when running inside the native iOS Capacitor shell (App Store build). */
export const isIOSNativeApp = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

/** External checkout / Stripe / Kiwify / Hotmart must not run inside the iOS WebView. */
export const blocksExternalPayments = () => isIOSNativeApp();

/** True when running inside any native Capacitor shell (iOS or Android). */
export const isNativeApp = () => Capacitor.isNativePlatform();
