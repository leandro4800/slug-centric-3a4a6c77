import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Wallet, ExternalLink, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/contexts/BrandingProvider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { IOSDesktopOnlyGate } from "@/components/IOSDesktopOnlyGate";
import { blocksExternalPayments } from "@/lib/native-platform";

type StripeConnectStatus = "not_connected" | "incomplete" | "submitted" | "pending_verification" | "verified";

const AdminFaturamento = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { tenant, refresh } = useBranding();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [alunos, setAlunos] = useState(0);
  const [receitaMes, setReceitaMes] = useState(0);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus>("not_connected");

  const loadMetrics = async () => {
    if (!tenant?.id) return;
    const { count } = await supabase
      .from("perfis")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id);
    setAlunos(count || 0);

    const { data: planos } = await supabase
      .from("planos")
      .select("preco_centavos")
      .eq("tenant_id", tenant.id)
      .eq("ativo", true);

    const precoMedio =
      planos && planos.length > 0
        ? planos.reduce((acc, p) => acc + p.preco_centavos, 0) / planos.length / 100
        : 0;

    // Coach recebe 92,01% do preço-base de cada aluno
    setReceitaMes((count || 0) * precoMedio * 0.9201);
  };

  const refreshStripeStatus = async () => {
    if (!tenant?.id) return;
    const { data: t } = await supabase
      .from("tenants_private")
      .select("stripe_account_id, stripe_onboarding_completed")
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    setStripeAccountId((t as any)?.stripe_account_id || null);
    setOnboardingCompleted(!!(t as any)?.stripe_onboarding_completed);
    setStripeStatus((t as any)?.stripe_account_id ? "incomplete" : "not_connected");

    if ((t as any)?.stripe_account_id) {
      try {
        const { data, error } = await supabase.functions.invoke("stripe-connect-status", {
          body: { tenant_id: tenant.id },
        });
        if (error) throw error;
        setStripeStatus(((data as any)?.status as StripeConnectStatus) || "incomplete");
        const { data: t2 } = await supabase
          .from("tenants_private")
          .select("stripe_onboarding_completed")
          .eq("tenant_id", tenant.id)
          .maybeSingle();
        setOnboardingCompleted(!!(t2 as any)?.stripe_onboarding_completed);
      } catch (e) {
        console.warn("stripe-connect-status falhou", e);
      }
    }
  };

  useEffect(() => {
    if (tenant) {
      void (async () => {
        await Promise.all([refreshStripeStatus(), loadMetrics()]);
        setLoading(false);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id]);

  const handleConnectStripe = async () => {
    if (blocksExternalPayments()) return;
    if (!tenant?.id) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", {
        body: { tenant_id: tenant.id, return_path: window.location.pathname },
      });
      if (error) {
        const response = (error as any)?.context;
        if (response && typeof response.clone === "function") {
          let message = error.message;
          try {
            const body = await response.clone().json();
            message = body?.error || message;
          } catch {
            // mantém a mensagem original se o corpo não for JSON
          }
          throw new Error(message);
        }
        throw error;
      }
      if (!data?.url) throw new Error("URL de onboarding não retornada");
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e?.message || "Erro ao iniciar onboarding Stripe.");
      setBusy(false);
    }
  };

  return (
    <IOSDesktopOnlyGate
      title="Faturamento pelo computador"
      description="A conexão com Stripe e a gestão de pagamentos devem ser feitas pelo navegador no seu computador, fora do app iOS."
      desktopHint="alpha-coach.app"
    >
    <div className="min-h-screen bg-black px-5 pt-6 pb-32">
      <button
        onClick={() => navigate(`/${slug}/app/controle`)}
        className="flex items-center gap-2 text-primary text-sm font-semibold uppercase tracking-widest hover:brightness-125 transition-all"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="flex items-center gap-2 mt-8 text-primary/80">
        <Wallet className="h-4 w-4" />
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Gestão Financeira</span>
      </div>
      <h1 className="font-display text-4xl mt-2 text-white leading-tight">FATURAMENTO</h1>
      <div className="h-px bg-primary/20 mt-3" />

      <div className="grid grid-cols-2 gap-3 mt-6">
        <div className="bg-card/40 border border-white/10 p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Alunos ativos</p>
          <p className="font-display text-3xl text-white mt-1">{alunos}</p>
        </div>
        <div className="bg-card/40 border border-white/10 p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Estim. mensal (92,01%)</p>
          <p className="font-display text-3xl text-primary mt-1">
            R$ {receitaMes.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className="mt-8 bg-card/40 border border-white/10 p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <p className="font-display text-lg text-white">CONTA STRIPE CONNECT</p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <div className="space-y-4">
            {onboardingCompleted ? (
              <>
                <div className="flex items-center gap-2 text-emerald-400 text-[10px] uppercase font-bold tracking-widest">
                  <CheckCircle2 className="h-3 w-3" /> Conta verificada — recebendo 92,01% por aluno
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Seus pagamentos são depositados automaticamente na sua conta Stripe.
                  Cartão, Pix e Boleto disponíveis para o aluno no checkout.
                </p>
                <Button
                  onClick={handleConnectStripe}
                  disabled={busy}
                  variant="outline"
                  className="w-full"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar dados bancários / Stripe"}
                </Button>
              </>
            ) : stripeStatus === "pending_verification" || stripeStatus === "submitted" ? (
              <>
                <div className="flex items-center gap-2 text-amber-400 text-[10px] uppercase font-bold tracking-widest">
                  <AlertCircle className="h-3 w-3" /> Cadastro enviado — em análise pela Stripe
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A conta bancária foi cadastrada. A Stripe ainda está verificando dados/documentos; assim que liberar pagamentos e repasses, esta tela muda para conta verificada.
                </p>
                <Button onClick={handleConnectStripe} disabled={busy} variant="outline" className="w-full">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <><ExternalLink className="h-4 w-4 mr-2" /> Acompanhar / completar pendências</>
                  )}
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-amber-400 text-[10px] uppercase font-bold tracking-widest">
                  <AlertCircle className="h-3 w-3" />
                  {stripeAccountId ? "Onboarding incompleto" : "Conta ainda não conectada"}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pra receber pagamentos dos seus alunos, conecte/conclua sua conta Stripe.
                  Leva ~3 minutos — você fornece dados bancários e documento.
                </p>
                <Button onClick={handleConnectStripe} disabled={busy} className="w-full bg-gradient-primary">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <><ExternalLink className="h-4 w-4 mr-2" />
                      {stripeAccountId ? "Continuar cadastro Stripe" : "Conectar conta Stripe"}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 bg-primary/5 border border-primary/20 p-4">
        <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-2">
          Como funciona o split
        </p>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          <li>• Aluno paga o valor do plano + 2,99% de taxa de processamento</li>
          <li>• <strong>Coach (você)</strong> recebe <strong>92,01%</strong> do preço-base do plano, líquido</li>
          <li>• <strong>Plataforma</strong> retém <strong>7,99%</strong> (≈6,99% líquido após Stripe)</li>
          <li>• Plataforma absorve ~1% da taxa Stripe pra reduzir o impacto no aluno</li>
          <li>• Depósitos automáticos pela Stripe na sua conta bancária</li>
        </ul>
      </div>
    </div>
    </IOSDesktopOnlyGate>
  );
};

export default AdminFaturamento;
