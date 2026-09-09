export const PRODUCTION_APP_ORIGIN = "https://alpha-coach.app";

export const PRIVACY_POLICY_URL = `${PRODUCTION_APP_ORIGIN}/politica-de-privacidade`;

const isUnsafeAuthOrigin = (origin: string) => {
  try {
    const url = new URL(origin);
    return (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.endsWith(".local") ||
      url.hostname.endsWith(".lovable.app") ||
      url.hostname.endsWith(".lovable.dev") ||
      url.hostname.endsWith(".lovableproject.com") ||
      url.protocol === "capacitor:" ||
      url.protocol === "ionic:"
    );
  } catch {
    return true;
  }
};

/**
 * Assets Lovable (`.asset.json`) usam path relativo `/__l5e/...`.
 * No Capacitor/ionic isso aponta pro WebView local e quebra.
 * Sempre resolve para o origin público de produção.
 */
export const resolvePublicAssetUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith("/__l5e/")) return `${PRODUCTION_APP_ORIGIN}${url}`;
  if (url.startsWith("/") && typeof window !== "undefined" && isUnsafeAuthOrigin(window.location.origin)) {
    return `${PRODUCTION_APP_ORIGIN}${url}`;
  }
  return url;
};

export const getPublicAppOriginForced = () => PRODUCTION_APP_ORIGIN;

export const getPublicAppOrigin = () => {
  if (typeof window === "undefined") return PRODUCTION_APP_ORIGIN;

  const currentOrigin = window.location.origin;
  
  // Se estivermos em localhost, priorizamos o domínio de produção para os links de auth
  // Isso evita que e-mails enviados em desenvolvimento apontem para localhost
  if (isUnsafeAuthOrigin(currentOrigin)) {
    console.log("[Auth] Origin insegura detectada, usando:", PRODUCTION_APP_ORIGIN);
    return PRODUCTION_APP_ORIGIN;
  }

  return currentOrigin;
};

export const buildAuthRedirectUrl = (path: string, params?: Record<string, string | null | undefined>) => {
  const url = new URL(path, getPublicAppOrigin());
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return url.toString();
};