import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface SiteTenant {
  id: string;
  slug: string;
  nome: string;
  logo_url?: string | null;
}

interface Ctx {
  tenant: SiteTenant | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

const SiteTenantContext = createContext<Ctx>({ tenant: null, loading: true, error: null, reload: () => {} });

export const SiteTenantProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<SiteTenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) { setTenant(null); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      // Retry com backoff: uma falha de rede não pode virar "acesso restrito".
      const delays = [0, 700, 1500];
      for (let i = 0; i < delays.length; i++) {
        if (delays[i]) await new Promise((r) => setTimeout(r, delays[i]));
        const { data, error: err } = await supabase
          .from("tenants")
          .select("id, slug, nome, logo_url")
          .eq("owner_user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (!err) {
          setTenant((data as SiteTenant | null) ?? null);
          setLoading(false);
          return;
        }
        console.warn("[SiteTenant] Falha ao carregar tenant do coach:", err.message);
        if (i === delays.length - 1) {
          setError(err.message);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, tick]);

  return (
    <SiteTenantContext.Provider value={{ tenant, loading, error, reload: () => setTick((t) => t + 1) }}>
      {children}
    </SiteTenantContext.Provider>
  );
};

export const useSiteTenant = () => useContext(SiteTenantContext);
