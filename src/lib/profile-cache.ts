const KEY_PREFIX = "profile_snapshot_v1";

export type ProfileSnapshot = {
  profile: Record<string, unknown> | null;
  lastEval: Record<string, unknown> | null;
  isCoach: boolean;
  at: number;
};

const snapshotKey = (userId: string) => `${KEY_PREFIX}:${userId}`;

export function readProfileSnapshot(userId: string): ProfileSnapshot | null {
  try {
    const raw = localStorage.getItem(snapshotKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfileSnapshot;
    if (!parsed?.at || Date.now() - parsed.at > 10 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeProfileSnapshot(userId: string, snapshot: Omit<ProfileSnapshot, "at">) {
  try {
    localStorage.setItem(
      snapshotKey(userId),
      JSON.stringify({ ...snapshot, at: Date.now() }),
    );
  } catch {}
}
