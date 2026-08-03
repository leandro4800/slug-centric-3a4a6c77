import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const isNative = () => Capacitor.isNativePlatform();

export async function readPersistentValue(key: string): Promise<string | null> {
  if (isNative()) {
    const { value } = await Preferences.get({ key });
    if (value != null) return value;
  }

  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function writePersistentValue(key: string, value: string): Promise<void> {
  if (isNative()) {
    await Preferences.set({ key, value });
  }
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export async function removePersistentValue(key: string): Promise<void> {
  if (isNative()) {
    await Preferences.remove({ key });
  }
  try {
    localStorage.removeItem(key);
  } catch {}
}

/** Supabase auth storage — Preferences on native (survives iOS WebView restarts). */
export const createSupabaseAuthStorage = () => ({
  getItem: async (key: string) => {
    const fromNative = isNative() ? (await Preferences.get({ key })).value : null;
    if (fromNative != null) return fromNative;

    try {
      const legacy = localStorage.getItem(key);
      if (legacy && isNative()) {
        await Preferences.set({ key, value: legacy });
      }
      return legacy;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    if (isNative()) {
      await Preferences.set({ key, value });
    }
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
  removeItem: async (key: string) => {
    if (isNative()) {
      await Preferences.remove({ key });
    }
    try {
      localStorage.removeItem(key);
    } catch {}
  },
});
