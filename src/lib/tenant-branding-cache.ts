export type CachedTenantBranding = {
  id: string;
  slug: string;
  nome: string;
  tagline?: string | null;
  logo_url: string | null;
  hero_url: string | null;
  symbol_url?: string | null;
  primary_hsl?: string;
  accent_hsl?: string;
  theme_overrides?: Record<string, string> | null;
  login_video_url?: string | null;
  splash_video_url?: string | null;
  [key: string]: unknown;
};

const cacheKey = (slug: string) => `branding_${slug}`;

export const readTenantBrandingCache = (slug: string): CachedTenantBranding | null => {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(cacheKey(slug));
    return cached ? (JSON.parse(cached) as CachedTenantBranding) : null;
  } catch {
    localStorage.removeItem(cacheKey(slug));
    return null;
  }
};

export const writeTenantBrandingCache = (slug: string, tenant: CachedTenantBranding | null) => {
  if (typeof window === "undefined") return;
  if (tenant) {
    localStorage.setItem(cacheKey(slug), JSON.stringify(tenant));
  } else {
    localStorage.removeItem(cacheKey(slug));
  }
};
