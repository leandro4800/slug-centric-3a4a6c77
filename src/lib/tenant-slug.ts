import { readDefaultTenantSlug, readStartupBranding } from "@/lib/startup-branding";

export const isSafeTenantSlug = (value: string | null | undefined): value is string =>
  !!value && /^[a-z0-9-]+$/i.test(value) && value !== "index" && value !== "demo";

export const readRememberedTenantSlug = (): string | null => {
  if (typeof window === "undefined") return null;
  const remembered = localStorage.getItem("last_tenant_slug");
  return isSafeTenantSlug(remembered) ? remembered : null;
};

/** Last-resort slug so startup/login always have tenant branding. */
export const readFallbackTenantSlug = (): string | null => {
  return readRememberedTenantSlug() ?? readStartupBranding()?.slug ?? readDefaultTenantSlug();
};

const RESERVED_ROOT_SEGMENTS = new Set([
  "index",
  "marketplace",
  "seja-coach",
  "login",
  "forgot-password",
  "reset-password",
  "checkout",
  "admin",
  "unsubscribe",
  "onboarding",
  "app",
  "site",
  "join",
  "privacy",
  "suporte",
  "support",
  "politica-de-privacidade",
  "demo",
]);

/** Resolves tenant slug for branding on startup, login and deep links. */
export const resolveBrandingSlug = (
  pathname: string,
  paramSlug?: string | null,
): string | null => {
  if (paramSlug && isSafeTenantSlug(paramSlug)) return paramSlug;

  const normalized = pathname.replace(/\/+$/, "") || "/";
  const parts = normalized.split("/").filter(Boolean);
  const first = parts[0];

  if (first && !RESERVED_ROOT_SEGMENTS.has(first)) {
    return first;
  }

  const isStartupPath =
    normalized === "/" ||
    normalized === "/index" ||
    normalized === "/index.html" ||
    normalized === "/login" ||
    (parts.length === 2 && (parts[1] === "login" || parts[1] === "index"));

  if (isStartupPath) return readFallbackTenantSlug();

  return null;
};

export const buildTenantLoginPath = (search = ""): string => {
  const slug = readFallbackTenantSlug() ?? readDefaultTenantSlug();
  return slug ? `/${slug}/login${search}` : `/login${search}`;
};
