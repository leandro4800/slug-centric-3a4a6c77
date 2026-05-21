import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Wallet, ExternalLink, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/contexts/BrandingProvider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ConnectStatus {
  connected: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  account_id?: string | null;
}

const AdminFaturamento = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { tenant } = useBranding();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [alunos, setAlunos] = useState(0);
  const [receitaMes, setReceitaMes] = useState(0);

  const loadStatus = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-status", {
        body: { tenant_id: tenant.id },
      });
      if (error) throw error;
      setStatus(data as ConnectStatus);
    } catch (e: any) {
      console.error(e);
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    if (!tenant?.id) return;
    const { count } = await supabase
      .from("perfis")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id);
    setAlunos(count || 0);
    // estimativa simples: alunos * preço base do tenant (sem dados reais de Stripe agregado aqui)
    const preco = (tenant as any)?.preco_mensal || 0;
    setReceitaMes((count || 0) * preco * 0.9); // -10% plataforma
  };

  useEffect(() => {
    void loadStatus();
    void loadMetrics();
  }, [tenant?.id]);

  const handleOnboard = async () => {
    if (!tenant?.id) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", {
        body: { tenant_id: tenant.id, return_url: window.location.href },
      });
      if (error) throw error;
      if ((data as any)?.url) {
        window.location.href = (data as any).url;
      } else {
        toast.error("Não foi possível iniciar onboarding.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao conectar Stripe.");
    } finally {
      setBusy(false);
    }
  };

  return (
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
      <h1 className="font-display text-4xl mt-2 text-white leading-tight">
        FATURAMENTO
      </h1>
      <div className="h-px bg-primary/20 mt-3" />

      <div className="grid grid-cols-2 gap-3 mt-6">
        <div className="bg-card/40 border border-white/10 p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Alunos ativos</p>
          <p className="font-display text-3xl text-white mt-1">{alunos}</p>
        </div>
        <div className="bg-card/40 border border-white/10 p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Estim. mensal</p>
          <p className="font-display text-3xl text-primary mt-1">
            R$ {receitaMes.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className="mt-8 bg-card/40 border border-white/10 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-5 w-5 text-primary" />
          <p className="font-display text-lg text-white">CONTA STRIPE CONNECT</p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Verificando status...
          </div>
        ) : status?.connected && status.charges_enabled && status.payouts_enabled ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle2 className="h-4 w-4" /> Conta conectada e ativa
            </div>
            <p className="text-xs text-muted-foreground">
              Recebimentos automáticos habilitados. A plataforma retém 10% por aluno.
            </p>
            <Button onClick={handleOnboard} disabled={busy} variant="outline" className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Gerenciar conta <ExternalLink className="h-4 w-4 ml-2" /></>}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <AlertCircle className="h-4 w-4" />
              {status?.connected ? "Conta criada, finalize o cadastro" : "Conta não conectada"}
            </div>
            <p className="text-xs text-muted-foreground">
              Conecte sua conta Stripe para receber os pagamentos dos seus alunos direto na sua conta bancária.
            </p>
            <Button onClick={handleOnboard} disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conectar Stripe"}
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6 bg-primary/5 border border-primary/20 p-4">
        <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-2">Como funciona</p>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          <li>• Cada aluno paga sua mensalidade direto no app</li>
          <li>• 90% vai para sua conta Stripe automaticamente</li>
          <li>• 10% fica com a Alpha Coach (manutenção da plataforma)</li>
          <li>• Saques disponíveis no painel Stripe Connect</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminFaturamento;
