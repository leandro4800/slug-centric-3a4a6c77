const cache = new Map<string, { at: number; isCoach: boolean; status: string | null }>();
const TTL_MS = 5 * 60 * 1000;

const cacheKey = (userId: string, tenantId: string | null | undefined) =>
  `${userId}:${tenantId ?? "none"}`;

export function readSubscriptionGuardCache(userId: string, tenantId: string | null | undefined) {
  const hit = cache.get(cacheKey(userId, tenantId));
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    cache.delete(cacheKey(userId, tenantId));
    return null;
  }
  return hit;
}

export function writeSubscriptionGuardCache(
  userId: string,
  tenantId: string | null | undefined,
  value: { isCoach: boolean; status: string | null },
) {
  cache.set(cacheKey(userId, tenantId), { ...value, at: Date.now() });
}
