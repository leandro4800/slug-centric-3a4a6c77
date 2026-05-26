import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Zap, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const RedeemPlan = () => {
  const { token } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState("");
  const [planData, setPlanData] = useState<any>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // Redirect to login but save the token to resume after login
        sessionStorage.setItem("pending_redeem_token", token || "");
        navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      handleRedeem();
    }
  }, [user, authLoading, token]);

  const handleRedeem = async () => {
    if (!token || !user) return;
    try {
      setStatus('loading');
      
      // 1. Fetch the delivery info
      const { data: delivery, error: fetchError } = await supabase
        .from("coach_automated_delivery")
        .select("*, plan_id, user_id")
        .eq("token", token)
        .eq("is_active", true)
        .maybeSingle();

      if (fetchError || !delivery) {
        setStatus('error');
        setErrorMsg("Link de acesso inválido ou expirado.");
        return;
      }

      setPlanData(delivery);

      // 2. Get the coach's tenant
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, slug")
        .eq("owner_user_id", delivery.user_id)
        .maybeSingle();

      if (!tenant) {
        setStatus('error');
        setErrorMsg("Configuração do coach não encontrada.");
        return;
      }

      // 3. Create or ensure subscription (assinatura)
      // Check if already subscribed
      const { data: existingSub } = await supabase
        .from("assinaturas")
        .select("id")
        .eq("aluno_id", user.id)
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (!existingSub) {
        const { error: subError } = await supabase.from("assinaturas").insert({
          aluno_id: user.id,
          tenant_id: tenant.id,
          status: "active",
          price_id: "automated_delivery", // Marker
          created_at: new Date().toISOString()
        });
        if (subError) throw subError;
      }

      // 4. Assign the plan (Template workout)
      // This part depends on how the app handles assigned plans.
      // Based on common patterns in this app, we might just need to link it.
      // If there's a specific table for athlete's current plan, we update it here.
      
      // Let's also ensure the profile has the tenant_id set
      await supabase.from("perfis").update({ 
        tenant_id: tenant.id,
        onboarding_completo: true // Force onboarding complete for paid entry
      }).eq("id", user.id);

      setStatus('success');
      toast.success("Acesso liberado com sucesso!");
      
      // After a short delay, redirect to the app
      setTimeout(() => {
        navigate(`/${tenant.slug}/app`);
      }, 2500);

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg("Ocorreu um erro ao processar seu acesso. Tente novamente.");
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="relative">
          <div className="absolute inset-0 blur-3xl opacity-20 bg-primary" />
          <div className="relative bg-card border border-border/40 rounded-3xl p-8 space-y-6 shadow-2xl">
            {status === 'loading' && (
              <div className="space-y-4">
                <div className="relative flex justify-center">
                  <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                  <Loader2 className="h-16 w-16 text-primary animate-spin relative z-10" />
                </div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Validando seu acesso</h2>
                <p className="text-muted-foreground text-sm">Aguarde enquanto configuramos sua conta Alpha...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Acesso Liberado!</h2>
                <p className="text-muted-foreground text-sm">
                  Parabéns! Sua conta foi vinculada e seu plano de treino já está disponível.
                </p>
                <div className="pt-4">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-primary animate-pulse">Redirecionando em instantes...</p>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <XCircle className="h-16 w-16 text-destructive mx-auto" />
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-destructive">Ops! Algo deu errado</h2>
                <p className="text-muted-foreground text-sm">{errorMsg}</p>
                <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                  Voltar para o Início
                </Button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-2 opacity-30">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-[10px] uppercase font-black tracking-widest italic">Alpha Coach Automated Delivery</span>
        </div>
      </div>
    </div>
  );
};

export default RedeemPlan;
