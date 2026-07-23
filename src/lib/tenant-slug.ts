export const isSafeTenantSlug = (value: string | null | undefined): value is string =>
  !!value && /^[a-z0-9-]+$/i.test(value) && value !== "index" && value !== "demo";

export const readRememberedTenantSlug = (): string | null => {
  if (typeof window === "undefined") return null;
  const remembered = localStorage.getItem("last_tenant_slug");
  return isSafeTenantSlug(remembered) ? remembered : null;
};

export const buildTenantLoginPath = (search = ""): string => {
  const remembered = readRememberedTenantSlug();
  return remembered ? `/${remembered}/login${search}` : `/login${search}`;
};
