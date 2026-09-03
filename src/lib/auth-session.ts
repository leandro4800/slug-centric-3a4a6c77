import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Só desloga em refresh token morto — nunca em falha de rede. */
export const isFatalAuthError = (err: { message?: string; code?: string; status?: number } | null | undefined) => {
  if (!err) return false;
  const m = `${err.code ?? ""} ${err.message ?? ""}`.toLowerCase();
  if (m.includes("failed to fetch") || m.includes("network") || m.includes("abort") || m.includes("timeout")) {
    return false;
  }
  return (
    m.includes("refresh_token_not_found") ||
    m.includes("invalid refresh token") ||
    m.includes("refresh token not found") ||
    m.includes("session not found") ||
    (m.includes("refresh") && m.includes("revoked"))
  );
};

/**
 * Recupera sessão local e tenta refresh.
 * Nunca chama signOut — quem decide logout é o caller só se `fatal` for true.
 */
export async function recoverSession(): Promise<{ session: Session | null; fatal: boolean }> {
  const { data: stored, error: storedErr } = await supabase.auth.getSession();
  if (stored.session && stored.session.expires_at && stored.session.expires_at * 1000 - Date.now() > 45_000) {
    return { session: stored.session, fatal: false };
  }

  const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
  if (refreshed.session) return { session: refreshed.session, fatal: false };

  const fatal = isFatalAuthError(refreshErr) || isFatalAuthError(storedErr);
  return { session: stored.session ?? null, fatal };
}
