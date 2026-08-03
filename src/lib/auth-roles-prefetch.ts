import type { AppRole } from "@/hooks/use-auth";

const KEY = "auth_roles_prefetch_v1";

export type PrefetchedRole = {
  role: AppRole;
  tenant_id: string | null;
};

export function stashAuthRolesPrefetch(roles: PrefetchedRole[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(roles));
  } catch {}
}

export function consumeAuthRolesPrefetch(): PrefetchedRole[] | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PrefetchedRole[]) : null;
  } catch {
    return null;
  }
}
