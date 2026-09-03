import { Outlet, Navigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import BackHandler from "@/components/BackHandler";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { recoverSession } from "@/lib/auth-session";

const AlunoLayout = () => {
  const { user } = useAuth();
  const { slug } = useParams();
  const [checking, setChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [sessionInvalid, setSessionInvalid] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) { setChecking(false); return; }

      // A sessão precisa estar válida de verdade antes de qualquer decisão.
      // Falha de rede / token ainda renovando NÃO pode virar signOut.
      const { session: fresh, fatal } = await recoverSession();
      if (!fresh) {
        if (fatal) {
          console.warn("[AlunoLayout] Refresh token inválido; voltando para o login.");
          await supabase.auth.signOut({ scope: "local" }).catch(() => {});
          if (!cancelled) { setSessionInvalid(true); setChecking(false); }
          return;
        }
        console.warn("[AlunoLayout] Sessão indisponível no momento; não desloga.");
        if (!cancelled) { setLoadError(true); setChecking(false); }
        return;
      }



      // Coaches (owners de tenant) e admins globais da plataforma NÃO passam
      // por onboarding no mobile — preenchimento de perfil/anamnese/avaliação
      // fica no painel do site.
      const [{ data: ownedTenant, error: ownerError }, { data: adminRole, error: adminError }] = await Promise.all([
        supabase.from("tenants").select("id").eq("owner_user_id", user.id).maybeSingle(),
        supabase.from("user_roles").select("id").eq("user_id", user.id).eq("role", "admin").is("tenant_id", null).maybeSingle(),
      ]);
      if (ownerError || adminError) {
        console.warn("[AlunoLayout] Falha ao verificar vínculos:", ownerError?.message || adminError?.message);
        if (!cancelled) { setLoadError(true); setChecking(false); }
        return;
      }
      if (ownedTenant?.id || adminRole?.id) {
        if (!cancelled) { setNeedsOnboarding(false); setChecking(false); }
        return;
      }

      // Só alunos de verdade (não donos de tenant nem admins) marcam primeiro acesso.
      supabase.functions.invoke("notify-first-access").catch(() => {});

      const [perfilRes, anamRes, avalRes] = await Promise.all([
        supabase.from("perfis").select("onboarding_completo").eq("id", user.id).maybeSingle(),
        supabase.from("anamnese_aluno").select("id", { count: "exact", head: true }).eq("aluno_id", user.id),
        supabase.from("avaliacoes_fisicas").select("id", { count: "exact", head: true }).eq("aluno_id", user.id),
      ]);
      if (cancelled) return;
      if (perfilRes.error || anamRes.error || avalRes.error) {
        console.warn("[AlunoLayout] Falha ao checar onboarding:", perfilRes.error?.message || anamRes.error?.message || avalRes.error?.message);
        setLoadError(true);
        setChecking(false);
        return;
      }
      const incomplete = !perfilRes.data?.onboarding_completo || !anamRes.count || !avalRes.count;
      setNeedsOnboarding(incomplete);
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id, retryTick]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (sessionInvalid) {
    return <Navigate to={slug ? `/${slug}/login` : "/login"} replace />;
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-6 text-center">
        <div className="max-w-sm space-y-4">
          <p className="text-sm uppercase tracking-widest text-primary font-bold">Falha ao carregar</p>
          <p className="text-sm text-muted-foreground">
            Não conseguimos verificar seu cadastro agora. Verifique sua conexão e tente novamente.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => { setLoadError(false); setChecking(true); setRetryTick((t) => t + 1); }}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground"
            >
              Tentar novamente
            </button>
            <a
              href={slug ? `/${slug}/login` : "/login"}
              className="inline-flex h-10 items-center justify-center rounded-md border border-white/20 px-4 text-sm font-bold"
            >
              Voltar para o login
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (needsOnboarding && slug) {
    return <Navigate to={`/${slug}/onboarding`} replace />;
  }

  return (
    <div className="min-h-screen bg-transparent pb-24">
      <BackHandler />
      <Outlet />
      <BottomNav />
    </div>
  );
};

export default AlunoLayout;
