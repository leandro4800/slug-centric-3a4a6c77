export const PRODUCTION_APP_ORIGIN = "https://alpha-coach.app";

const isUnsafeAuthOrigin = (origin: string) => {
  try {
    const url = new URL(origin);
    return (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.endsWith(".local") ||
      url.protocol === "capacitor:" ||
      url.protocol === "ionic:"
    );
  } catch {
    return true;
  }
};

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