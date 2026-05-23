import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "coach" | "aluno";

interface UserRole {
  role: AppRole;
  tenant_id: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  sessionReady: boolean;
  isLoading: boolean;
  roles: UserRole[];
  signOut: () => Promise<void>;
  hasRole: (role: AppRole, tenantId?: string | null) => boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  sessionReady: false,
  isLoading: true,
  roles: [],
  signOut: async () => {},
  hasRole: () => false,
});

export const useAuth = () => useContext(AuthContext);

const ROLE_FETCH_TIMEOUT_MS = 6000;
const SESSION_RESTORE_TIMEOUT_MS = 4500;

const withTimeout = async <T,>(promise: Promise<T>, fallback: T, label: string, timeoutMs = ROLE_FETCH_TIMEOUT_MS): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[Auth] ${label} demorou demais; seguindo sem travar a tela.`);
      resolve(fallback);
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const roleRequestId = useRef(0);

  const fetchRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role, tenant_id")
      .eq("user_id", userId);
    
    if (error) {
      console.error("Error fetching roles:", error);
      return [];
    }
    return data as UserRole[];
  };

  useEffect(() => {
    let mounted = true;
    let restoreSettled = false;

    const clearSplashMarks = () => {
      try {
        Object.keys(sessionStorage)
          .filter((k) => k.startsWith("splash_shown"))
          .forEach((k) => sessionStorage.removeItem(k));
      } catch {}
    };

    const applySession = (sess: Session | null) => {
      if (!mounted) return;
      setSession(sess);
      setSessionReady(true);
    };

    const validateStoredSession = async (sess: Session | null) => {
      if (!sess) return null;

      // Confia na sessão persistida. O autoRefreshToken cuida da renovação.
      // Tentamos validar com getUser, mas SE der timeout/erro de rede,
      // mantemos a sessão local (não deslogamos) — caso contrário o app
      // pede login toda vez que abre offline/com rede ruim (Android PWA).
      const SENTINEL = Symbol("timeout");
      let response: Awaited<ReturnType<typeof supabase.auth.getUser>> | typeof SENTINEL;
      try {
        response = await withTimeout(
          supabase.auth.getUser(),
          SENTINEL as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>,
          "Validação da sessão salva",
          SESSION_RESTORE_TIMEOUT_MS
        );
      } catch {
        return sess;
      }

      if (response === (SENTINEL as unknown)) {
        // Timeout — mantém sessão local, deixa o refresh automático resolver depois.
        return sess;
      }

      const res = response as Awaited<ReturnType<typeof supabase.auth.getUser>>;
      const errMsg = res.error?.message?.toLowerCase() ?? "";
      const isAuthError =
        errMsg.includes("jwt") ||
        errMsg.includes("invalid") ||
        errMsg.includes("expired") ||
        errMsg.includes("not_found") ||
        errMsg.includes("user not found");

      if (res.error && !isAuthError) {
        // Erro de rede/servidor — mantém sessão.
        console.warn("[Auth] getUser falhou por rede; mantendo sessão local.", res.error);
        return sess;
      }

      if (!res.data.user) {
        console.warn("[Auth] Sessão local inválida; limpando.");
        try { await supabase.auth.signOut({ scope: "local" }); } catch {}
        return null;
      }

      return { ...sess, user: res.data.user };
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === "INITIAL_SESSION") return;

      if (event === "SIGNED_OUT") {
        clearSplashMarks();
        applySession(null);
        return;
      }

      if (sess) applySession(sess);
    });

    const restoreTimeout = setTimeout(() => {
      if (!mounted || restoreSettled) return;
      restoreSettled = true;
      console.warn("[Auth] Restauração da sessão demorou demais; abrindo login para evitar loop.");
      setSession(null);
      setRoles([]);
      setRolesLoading(false);
      setSessionReady(true);
    }, SESSION_RESTORE_TIMEOUT_MS);

    void supabase.auth.getSession()
      .then(async ({ data, error }) => {
        if (restoreSettled) return;
        if (error) console.error("Error restoring auth session:", error);
        const validatedSession = await validateStoredSession(data.session);
        if (restoreSettled) return;
        restoreSettled = true;
        clearTimeout(restoreTimeout);
        applySession(validatedSession);
      })

      .catch((error) => {
        if (restoreSettled) return;
        restoreSettled = true;
        clearTimeout(restoreTimeout);
        console.error("Error restoring auth session:", error);
        if (!mounted) return;
        setSession(null);
        setRoles([]);
        setRolesLoading(false);
        setSessionReady(true);
      });

    return () => {
      mounted = false;
      clearTimeout(restoreTimeout);
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sessionReady) return;

    const requestId = ++roleRequestId.current;

    if (!session?.user) {
      setRoles([]);
      setRolesLoading(false);
      return;
    }

    setRolesLoading(true);
    void withTimeout(fetchRoles(session.user.id), [], "Busca de permissões")
      .then((userRoles) => {
        if (requestId === roleRequestId.current) setRoles(userRoles);
      })
      .finally(() => {
        if (requestId === roleRequestId.current) setRolesLoading(false);
      });
  }, [sessionReady, session?.user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hasRole = useCallback((role: AppRole, tenantId?: string | null) => {
    return roles.some(r => {
      if (r.role === "admin" && r.tenant_id === null) return true;
      if (r.role === role) {
        if (tenantId === undefined) return true;
        return r.tenant_id === tenantId;
      }
      return false;
    });
  }, [roles]);

  const isLoading = !sessionReady || rolesLoading;

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, sessionReady, isLoading, roles, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};
