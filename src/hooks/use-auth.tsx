import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
  isLoading: boolean;
  roles: UserRole[];
  signOut: () => Promise<void>;
  hasRole: (role: AppRole, tenantId?: string | null) => boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  isLoading: true,
  roles: [],
  signOut: async () => {},
  hasRole: () => false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [roles, setRoles] = useState<UserRole[]>([]);

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
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, sess) => {
      setSession(sess);
      if (sess?.user) {
        const userRoles = await fetchRoles(sess.user.id);
        setRoles(userRoles);
      } else {
        setRoles([]);
      }
      setLoading(false);
      if (event === "SIGNED_OUT") {
        sessionStorage.removeItem("splash_shown_session");
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        const userRoles = await fetchRoles(data.session.user.id);
        setRoles(userRoles);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

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

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, isLoading, roles, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};
