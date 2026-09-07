import { Capacitor } from "@capacitor/core";

export type StartupBranding = {
  slug: string;
  nome: string;
  logo_url: string | null;
  hero_url?: string | null;
};

const STARTUP_BRANDING_KEY = "startup_branding_v1";

const isSafeSlug = (value: string | null | undefined): value is string =>
  !!value && /^[a-z0-9-]+$/i.test(value) && value !== "index" && value !== "demo";

/** Só white-labels com bundle id explícito. Sem VITE_NATIVE_APP_ID → sem default (evita vazar alphateam/Leandro). */
const NATIVE_APP_DEFAULT_SLUG: Record<string, string> = {
  "app.leandro.alphacoach": "alphateam",
};

export const readDefaultTenantSlug = (): string | null => {
  const fromEnv = import.meta.env.VITE_DEFAULT_TENANT_SLUG as string | undefined;
  if (isSafeSlug(fromEnv)) return fromEnv;

  if (Capacitor.isNativePlatform()) {
    const appId = import.meta.env.VITE_NATIVE_APP_ID as string | undefined;
    if (!appId) return null;
    const fromBundle = NATIVE_APP_DEFAULT_SLUG[appId];
    if (isSafeSlug(fromBundle)) return fromBundle;
  }

  return null;
};

/** Limpa memória de tenant entre contas — logout / troca de usuário. */
export const clearSessionTenantMemory = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("last_tenant_slug");
    localStorage.removeItem(STARTUP_BRANDING_KEY);
  } catch {
    /* ignore */
  }
};

export const readStartupBranding = (): StartupBranding | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STARTUP_BRANDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StartupBranding;
    if (!isSafeSlug(parsed.slug)) return null;
    return parsed;
  } catch {
    localStorage.removeItem(STARTUP_BRANDING_KEY);
    return null;
  }
};

export const writeStartupBranding = (branding: StartupBranding) => {
  if (typeof window === "undefined") return;
  if (!isSafeSlug(branding.slug)) return;
  localStorage.setItem(STARTUP_BRANDING_KEY, JSON.stringify(branding));
};
