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

const isNetworkError = (err: { message?: string; code?: string } | null | undefined) => {
  const m = `${err?.code ?? ""} ${err?.message ?? ""}`.toLowerCase();
  return m.includes("failed to fetch") || m.includes("network") || m.includes("abort") || m.includes("timeout");
};

const isFresh = (session: Session | null | undefined) =>
  !!session && (!session.expires_at || session.expires_at * 1000 - Date.now() > 45_000);

/**
 * Recupera sessão local e tenta refresh.
 * Nunca chama signOut — quem decide logout é o caller só se `fatal` for true.
 * Uma sessão já expirada NUNCA é devolvida como válida (causava 401 "JWT expired"
 * em cascata em todas as queries).
 */
export async function recoverSession(): Promise<{ session: Session | null; fatal: boolean }> {
  const { data: stored, error: storedErr } = await supabase.auth.getSession();
  if (isFresh(stored.session)) {
    return { session: stored.session, fatal: false };
  }

  let refreshErr: { message?: string; code?: string } | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (isFresh(refreshed.session)) return { session: refreshed.session, fatal: false };
    refreshErr = error ?? null;
    if (isNetworkError(error)) break;
    if (attempt === 0) await new Promise((r) => setTimeout(r, 600));
  }

  if (isFatalAuthError(refreshErr) || isFatalAuthError(storedErr)) {
    return { session: null, fatal: true };
  }

  // Sessão local expirada e o refresh não trouxe token novo (sem ser erro de rede):
  // não dá para seguir com JWT vencido — manda para o login em vez de quebrar a tela.
  if (stored.session && !isFresh(stored.session) && !isNetworkError(refreshErr)) {
    return { session: null, fatal: true };
  }

  return { session: null, fatal: false };
}

