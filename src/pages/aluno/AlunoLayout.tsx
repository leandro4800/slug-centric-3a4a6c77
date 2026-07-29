import { Outlet, Navigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import BackHandler from "@/components/BackHandler";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const AlunoLayout = () => {
  const { user } = useAuth();
  const { slug } = useParams();
  const [checking, setChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) { setChecking(false); return; }
      const [{ data: perfil }, { count: anam }, { count: aval }] = await Promise.all([
        supabase.from("perfis").select("onboarding_completo").eq("id", user.id).maybeSingle(),
        supabase.from("anamnese_aluno").select("id", { count: "exact", head: true }).eq("aluno_id", user.id),
        supabase.from("avaliacoes_fisicas").select("id", { count: "exact", head: true }).eq("aluno_id", user.id),
      ]);
      if (cancelled) return;
      const incomplete = !perfil?.onboarding_completo || !anam || !aval;
      setNeedsOnboarding(incomplete);
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
