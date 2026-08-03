import { Capacitor } from "@capacitor/core";
import { readPersistentValue, removePersistentValue, writePersistentValue } from "@/lib/persistent-storage";

const REMEMBER_KEY = "login_remember_v1";
const EMAIL_KEY = "login_email_v1";
const PASSWORD_KEY = "login_password_v1";

export type SavedLoginCredentials = {
  email: string;
  password: string;
  remember: boolean;
};

export const defaultRememberLogin = () => Capacitor.isNativePlatform();

export async function loadSavedLoginCredentials(): Promise<SavedLoginCredentials | null> {
  const rememberRaw = await readPersistentValue(REMEMBER_KEY);
  const remember = rememberRaw === "1" || (rememberRaw == null && defaultRememberLogin());
  if (!remember) {
    const email = await readPersistentValue(EMAIL_KEY);
    return email ? { email, password: "", remember: false } : null;
  }

  const email = await readPersistentValue(EMAIL_KEY);
  if (!email) return null;

  const password = (await readPersistentValue(PASSWORD_KEY)) ?? "";
  return { email, password, remember: true };
}

export async function saveLoginCredentials(
  email: string,
  password: string,
  remember: boolean,
): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  await writePersistentValue(REMEMBER_KEY, remember ? "1" : "0");
  await writePersistentValue(EMAIL_KEY, cleanEmail);

  if (remember) {
    await writePersistentValue(PASSWORD_KEY, password);
    return;
  }

  await removePersistentValue(PASSWORD_KEY);
}

export async function clearSavedLoginPassword(): Promise<void> {
  await removePersistentValue(PASSWORD_KEY);
}
