import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const isNative = () => Capacitor.isNativePlatform();
const memory = new Map<string, string>();

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const prefsGet = async (key: string): Promise<string | null> => {
  for (let i = 0; i < 6; i++) {
    try {
      const { value } = await Preferences.get({ key });
      if (value != null) return value;
    } catch {
      /* plugin ainda não pronto no cold start do WebView */
    }
    await wait(40 * (i + 1));
  }
  return null;
};

export async function readPersistentValue(key: string): Promise<string | null> {
  if (memory.has(key)) return memory.get(key)!;

  if (isNative()) {
    const value = await prefsGet(key);
    if (value != null) {
      memory.set(key, value);
      return value;
    }
  }

  try {
    const legacy = localStorage.getItem(key);
    if (legacy) {
      memory.set(key, legacy);
      if (isNative()) {
        await Preferences.set({ key, value: legacy }).catch(() => {});
      }
      return legacy;
    }
  } catch {
    /* ok */
  }
  return null;
}

export async function writePersistentValue(key: string, value: string): Promise<void> {
  memory.set(key, value);
  if (isNative()) {
    await Preferences.set({ key, value }).catch(() => {});
  }
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export async function removePersistentValue(key: string): Promise<void> {
  memory.delete(key);
  if (isNative()) {
    await Preferences.remove({ key }).catch(() => {});
  }
  try {
    localStorage.removeItem(key);
  } catch {}
}

/** Supabase auth storage — memória + Preferences. Sobrevive a kill do WKWebView. */
export const createSupabaseAuthStorage = () => ({
  getItem: (key: string) => readPersistentValue(key),
  setItem: (key: string, value: string) => writePersistentValue(key, value),
  removeItem: (key: string) => removePersistentValue(key),
});
