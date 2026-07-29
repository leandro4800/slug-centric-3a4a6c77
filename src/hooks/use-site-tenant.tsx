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
  reload: () => void;
}

const SiteTenantContext = createContext<Ctx>({ tenant: null, loading: true, reload: () => {} });

export const SiteTenantProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<SiteTenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) { setTenant(null); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tenants")
        .select("id, slug, nome, logo_url")
        .eq("owner_user_id", user.id)
        .maybeSingle();
      if (!cancelled) {
        setTenant(data as SiteTenant | null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, tick]);

  return (
    <SiteTenantContext.Provider value={{ tenant, loading, reload: () => setTick((t) => t + 1) }}>
      {children}
    </SiteTenantContext.Provider>
  );
};

export const useSiteTenant = () => useContext(SiteTenantContext);
