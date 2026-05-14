import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
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

const withTimeout = async <T,>(promise: Promise<T>, fallback: T, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[Auth] ${label} demorou demais; seguindo sem travar a tela.`);
      resolve(fallback);
    }, ROLE_FETCH_TIMEOUT_MS);
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
    const applySession = (sess: Session | null) => {
      setSession(sess);
      setSessionReady(true);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      applySession(sess);
      if (event === "SIGNED_OUT") {
        sessionStorage.removeItem("splash_shown_session");
      }
    });

    supabase.auth.getSession()
      .then(({ data }) => applySession(data.session))
      .catch((error) => {
        console.error("Error restoring auth session:", error);
        setSession(null);
        setRoles([]);
        setRolesLoading(false);
        setSessionReady(true);
      });

    return () => sub.subscription.unsubscribe();
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

  const hasRole = (role: AppRole, tenantId?: string | null) => {
    return roles.some(r => {
      if (r.role === "admin" && r.tenant_id === null) return true;
      if (r.role === role) {
        if (tenantId === undefined) return true;
        return r.tenant_id === tenantId;
      }
      return false;
    });
  };

  const isLoading = !sessionReady || rolesLoading;

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, sessionReady, isLoading, roles, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};
