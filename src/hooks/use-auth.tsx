import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { consumeAuthRolesPrefetch } from "@/lib/auth-roles-prefetch";

export type AppRole = "admin" | "coach" | "aluno";

interface UserRole {
  role: AppRole;
  tenant_id: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  sessionReady: boolean;
  rolesReady: boolean;
  isLoading: boolean;
  roles: UserRole[];
  signOut: () => Promise<void>;
  hasRole: (role: AppRole, tenantId?: string | null) => boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  sessionReady: false,
  rolesReady: false,
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

  // Retry com backoff: um timeout de rede não pode virar "sem permissões".
  const fetchRolesWithRetry = async (userId: string) => {
    const delays = [0, 800, 1600];
    for (let attempt = 0; attempt < delays.length; attempt++) {
      if (delays[attempt] > 0) {
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
      }
      const result = await withTimeout(
        fetchRoles(userId),
        [] as UserRole[],
        `Busca de permissões (tentativa ${attempt + 1})`,
      );
      if (result.length) return result;
      if (attempt < delays.length - 1) {
        console.warn("[Auth] Nenhuma permissão retornada; tentando novamente...");
      }
    }
    console.warn("[Auth] Não foi possível carregar permissões após 3 tentativas.");
    return [] as UserRole[];
  };

  useEffect(() => {
    let mounted = true;

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

    // Confiamos na sessão restaurada do localStorage pelo supabase-js.
    // Não chamamos getUser() nem usamos timeout que zera a sessão — isso
    // fazia o app "esquecer" o login ao reabrir a aba em redes lentas.
    // O autoRefreshToken cuida da renovação; se o refresh falhar de verdade,
    // o supabase dispara SIGNED_OUT explicitamente.
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === "SIGNED_OUT") {
        clearSplashMarks();
        applySession(null);
        return;
      }
      // INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED
      applySession(sess ?? null);
    });

    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) console.warn("[Auth] getSession falhou; mantendo estado atual.", error);
        applySession(data?.session ?? null);
      })
      .catch((error) => {
        console.error("[Auth] Erro restaurando sessão:", error);
        if (mounted) setSessionReady(true);
      });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removeListener: (() => void) | undefined;
    void App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        void supabase.auth.startAutoRefresh();
        void supabase.auth.getSession().then(({ data, error }) => {
          if (error) {
            console.warn("[Auth] Falha ao restaurar sessão ao voltar ao app:", error);
            return;
          }
          if (data.session) setSession(data.session);
        });
        return;
      }
      void supabase.auth.stopAutoRefresh();
    }).then((handle) => {
      removeListener = () => handle.remove();
    });

    return () => {
      removeListener?.();
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

    const prefetched = consumeAuthRolesPrefetch();
    if (prefetched?.length) {
      setRoles(prefetched);
      setRolesLoading(false);
      return;
    }

    setRolesLoading(true);
    void fetchRolesWithRetry(session.user.id)
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

  const sessionLoading = !sessionReady;
  const rolesReady = !session?.user || !rolesLoading;
  const isLoading = sessionLoading;

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, sessionReady, rolesReady, isLoading, roles, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};
