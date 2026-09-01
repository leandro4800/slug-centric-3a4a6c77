import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface SiteTenant {
  id: string;
  slug: string;
  nome: string;
  logo_url?: string | null;
  is_partner?: boolean | null;
  status?: string | null;
  vertical?: string | null;
}

export type BlockReason = "no_subscription" | null;

interface Ctx {
  tenant: SiteTenant | null;
  loading: boolean;
  error: string | null;
  accessBlocked: boolean;
  blockReason: BlockReason;
  reload: () => void;
}

const SiteTenantContext = createContext<Ctx>({ tenant: null, loading: true, error: null, accessBlocked: false, blockReason: null, reload: () => {} });

export const SiteTenantProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<SiteTenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessBlocked, setAccessBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<BlockReason>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) { setTenant(null); setAccessBlocked(false); setBlockReason(null); setLoading(false); return; }
    let cancelled = false;
    const cacheKey = `site_tenant_${user.id}`;

    const isAuthError = (err: { message?: string; code?: string } | null) => {
      if (!err) return false;
      const m = `${err.code ?? ""} ${err.message ?? ""}`.toLowerCase();
      return m.includes("jwt") || m.includes("token") || m.includes("pgrst301") || m.includes("401") || m.includes("403");
    };

    // Verifica se o coach pode acessar o painel:
    // parceiro sempre libera; caso contrário exige assinatura da plataforma ativa/trial.
    const checkAccess = async (t: SiteTenant) => {
      if (t.is_partner) return { blocked: false, reason: null as BlockReason };
      const { data, error: subErr } = await supabase
        .from("coach_platform_subscriptions")
        .select("status")
        .eq("tenant_id", t.id)
        .in("status", ["active", "trialing"])
        .limit(1);
      if (subErr) {
        console.warn("[SiteTenant] Falha ao checar assinatura da plataforma:", subErr.message);
        return { blocked: false, reason: null as BlockReason }; // fail-open em erro de rede
      }
      if (data && data.length > 0) return { blocked: false, reason: null as BlockReason };
      return { blocked: true, reason: "no_subscription" as BlockReason };
    };

    (async () => {
      setLoading(true);
      setError(null);

      // Enquanto carrega, usa o último tenant conhecido para não mostrar "acesso restrito".
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) setTenant(JSON.parse(cached) as SiteTenant);
      } catch { /* ignore */ }

      // Retry com backoff: uma falha de rede não pode virar "acesso restrito".
      const delays = [0, 700, 1500];
      let refreshed = false;
      for (let i = 0; i < delays.length; i++) {
        if (delays[i]) await new Promise((r) => setTimeout(r, delays[i]));
        const { data, error: err } = await supabase
          .from("tenants")
          .select("id, slug, nome, logo_url, is_partner, status, vertical")
          .eq("owner_user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (!err) {
          const t = (data as SiteTenant | null) ?? null;
          setTenant(t);
          try {
            if (t) localStorage.setItem(cacheKey, JSON.stringify(t));
            else localStorage.removeItem(cacheKey);
          } catch { /* ignore */ }
          if (t) {
            const { blocked, reason } = await checkAccess(t);
            if (cancelled) return;
            setAccessBlocked(blocked);
            setBlockReason(reason);
          } else {
            setAccessBlocked(false);
            setBlockReason(null);
          }
          setLoading(false);
          return;
        }
        console.warn("[SiteTenant] Falha ao carregar tenant do coach:", err.message);

        // Sessão expirada: tenta renovar o token antes de desistir.
        if (isAuthError(err) && !refreshed) {
          refreshed = true;
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (cancelled) return;
          if (!refreshData?.session) {
            // Não dá para renovar: manda para o login em vez de travar na tela de erro.
            await supabase.auth.signOut().catch(() => {});
            if (!cancelled) window.location.replace("/site/login");
            return;
          }
          i = -1; // reinicia o ciclo de tentativas com o token novo
          continue;
        }

        if (i === delays.length - 1) {
          setError(err.message);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, tick]);

  return (
    <SiteTenantContext.Provider value={{ tenant, loading, error, accessBlocked, blockReason, reload: () => setTick((t) => t + 1) }}>
      {children}
    </SiteTenantContext.Provider>
  );
};

export const useSiteTenant = () => useContext(SiteTenantContext);
