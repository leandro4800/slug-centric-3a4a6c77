import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Zap, CheckCircle2, XCircle, Trophy, Target, Shield, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useBranding } from "@/contexts/BrandingProvider";

const RedeemPlan = () => {
  const { token } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { tenant } = useBranding();
  
  const [status, setStatus] = useState<'landing' | 'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState("");
  const [deliveryData, setDeliveryData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadDeliveryInfo();
  }, [token]);

  const loadDeliveryInfo = async () => {
    if (!token) return;
    try {
      const { data, error } = await (supabase as any)
        .rpc("redeem_delivery_lookup", { p_token: token })
        .maybeSingle();

      if (error || !data) {
        setStatus('error');
        setErrorMsg("Este link de acesso é inválido, já foi utilizado ou está expirado.");
        return;
      }

      // Reshape to match prior `coach_automated_delivery` shape with templates_treino join
      const shaped = {
        id: data.id,
        user_id: data.user_id,
        token: data.token,
        plan_id: data.plan_id,
        diet_id: data.diet_id,
        is_active: data.is_active,
        created_at: data.created_at,
        templates_treino: data.plan_id
          ? { titulo: data.template_titulo, descricao: data.template_resumo }
          : null,
      };
      setDeliveryData(shaped);
      setStatus('landing');
    } catch (err) {
      setStatus('error');
      setErrorMsg("Erro ao carregar informações do plano.");
    }
  };


  const handleStartClaim = () => {
    if (!user) {
      // Save token and redirect to login
      sessionStorage.setItem("pending_redeem_token", token || "");
      const currentPath = window.location.pathname;
      navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }
    processRedeem();
  };

  const processRedeem = async () => {
    if (!token || !user) return;
    try {
      setIsProcessing(true);
      setStatus('loading');

      // 1. Verify if already claimed by this user to avoid double assignments if desired
      const { data: existingUsage } = await supabase
        .from("link_reivindicacao_usos")
        .select("id")
        .eq("token", token)
        .eq("aluno_id", user.id)
        .maybeSingle();

      if (existingUsage) {
         // Already claimed, just redirect
         toast.info("Você já reivindicou este plano. Redirecionando...");
         return finishRedeem();
      }

      // 2. Register usage for security
      const { error: usageErr } = await supabase
        .from("link_reivindicacao_usos")
        .insert({
          token: token,
          aluno_id: user.id
        });
      
      if (usageErr) throw usageErr;

      // 3. Get the coach's tenant
      const { data: coachTenant } = await supabase
        .from("tenants")
        .select("id, slug")
        .eq("owner_user_id", deliveryData.user_id)
        .maybeSingle();

      if (!coachTenant) {
        throw new Error("Coach não encontrado ou sem tenant configurado.");
      }

      // 4. Ensure subscription (assinatura)
      const { data: existingSub } = await supabase
        .from("assinaturas")
        .select("id")
        .eq("aluno_id", user.id)
        .eq("tenant_id", coachTenant.id)
        .maybeSingle();

      if (!existingSub) {
        await supabase.from("assinaturas").insert({
          aluno_id: user.id,
          tenant_id: coachTenant.id,
          status: "active",
          price_id: "automated_delivery",
          created_at: new Date().toISOString()
        } as any);
      }

      // 5. Link the workout template to the user if applicable
      if (deliveryData.plan_id) {
         await supabase.from("treinos_prescritos").insert({
           aluno_id: user.id,
           template_id: deliveryData.plan_id,
           status: "ativo",
           data_inicio: new Date().toISOString()
         } as any);
      }

      // 6. Update profile
      await supabase.from("perfis").update({ 
        tenant_id: coachTenant.id,
        onboarding_completo: true 
      }).eq("id", user.id);

      setStatus('success');
      toast.success("Acesso liberado com sucesso!");
      
      setTimeout(() => {
        navigate(`/${coachTenant.slug}/app`);
      }, 2500);

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || "Erro ao processar seu acesso.");
    } finally {
      setIsProcessing(false);
    }
  };

  const finishRedeem = async () => {
      const { data: coachTenant } = await supabase
        .from("tenants")
        .select("slug")
        .eq("owner_user_id", deliveryData.user_id)
        .maybeSingle();
      
      if (coachTenant) {
        navigate(`/${coachTenant.slug}/app`);
      } else {
        navigate("/");
      }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <p className="text-white font-bold uppercase tracking-widest">Processando seu acesso...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <XCircle className="h-20 w-20 text-destructive mb-6" />
        <h2 className="text-3xl font-black text-white uppercase italic mb-2">Ops! Link Inválido</h2>
        <p className="text-muted-foreground max-w-sm mb-8">{errorMsg}</p>
        <Button variant="outline" onClick={() => navigate('/')} className="w-full max-w-xs h-12 rounded-xl border-white/20 text-white hover:bg-white/10">
          Voltar ao Início
        </Button>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle2 className="h-20 w-20 text-green-500 mb-6" />
        <h2 className="text-4xl font-black text-white uppercase italic mb-2 tracking-tighter">Acesso Liberado!</h2>
        <p className="text-muted-foreground mb-8">Sua planilha de treino já está disponível no seu painel Alpha.</p>
        <div className="animate-pulse flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs">
          Redirecionando <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-4">
              <Zap className="h-3 w-3 fill-current" /> Entrega Prioritária
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-tighter leading-none">
              REIVINDICAR MINHA <span className="text-primary underline decoration-4 underline-offset-8">PLANILHA</span>
            </h1>
            <p className="text-muted-foreground text-sm font-medium pt-2">
              Você recebeu um convite exclusivo para acessar um programa de treinamento de alto nível.
            </p>
          </div>

          <div className="bg-zinc-900/50 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Trophy className="h-24 w-24 text-white" />
            </div>

            <div className="relative z-10 space-y-6">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                  <Zap className="h-8 w-8 text-black fill-current" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tight">
                    {deliveryData?.templates_treino?.titulo || "Plano de Treinamento Alpha"}
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed mt-1">
                    {deliveryData?.templates_treino?.descricao || "Conteúdo exclusivo desenvolvido para maximizar seus resultados e performance."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                  <Target className="h-5 w-5 text-primary" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">Foco Total</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">Acesso Seguro</span>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleStartClaim}
                  disabled={isProcessing}
                  className="w-full h-16 rounded-2xl bg-primary text-black font-black uppercase text-lg italic tracking-tight hover:scale-[1.02] transition-transform active:scale-95 gap-3 shadow-xl shadow-primary/20"
                >
                  {isProcessing ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      {user ? "Acessar Agora" : "Entrar para Acessar"}
                      <ArrowRight className="h-6 w-6" />
                    </>
                  )}
                </Button>
                <p className="text-[10px] text-center text-muted-foreground mt-4 font-bold uppercase tracking-[0.1em]">
                  {user ? `Logado como: ${user.email}` : "Necessário login para vincular seu perfil"}
                </p>
              </div>
            </div>
          </div>

          <div className="text-center opacity-40">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">
              Alpha Coach © 2026
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RedeemPlan;