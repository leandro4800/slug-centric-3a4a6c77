import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Wallet, ExternalLink, Loader2, CheckCircle2, AlertCircle, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/contexts/BrandingProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const AdminFaturamento = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { tenant, refresh } = useBranding();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [alunos, setAlunos] = useState(0);
  const [receitaMes, setReceitaMes] = useState(0);
  const [asaasWalletId, setAsaasWalletId] = useState("");

  const loadMetrics = async () => {
    if (!tenant?.id) return;
    const { count } = await supabase
      .from("perfis")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id);
    setAlunos(count || 0);
    
    // Busca planos para estimar receita
    const { data: planos } = await supabase
      .from("planos")
      .select("preco_centavos")
      .eq("tenant_id", tenant.id)
      .eq("ativo", true);
    
    const precoMedio = planos && planos.length > 0 
      ? planos.reduce((acc, p) => acc + p.preco_centavos, 0) / planos.length / 100
      : 0;

    setReceitaMes((count || 0) * precoMedio * 0.9201); // -7,99% plataforma (taxas Asaas por conta da plataforma)
  };

  useEffect(() => {
    if (tenant) {
      void (async () => {
        const { data } = await supabase
          .from("tenants_private")
          .select("asaas_wallet_id")
          .eq("tenant_id", tenant.id)
          .maybeSingle();
        setAsaasWalletId(((data as any)?.asaas_wallet_id) || "");
        await loadMetrics();
        setLoading(false);
      })();
    }
  }, [tenant?.id]);

  const handleSaveAsaas = async () => {
    if (!tenant?.id) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("tenants_private")
        .upsert(
          { tenant_id: tenant.id, asaas_wallet_id: asaasWalletId },
          { onConflict: "tenant_id" }
        );

      if (error) throw error;
      toast.success("ID da Carteira Asaas salvo com sucesso!");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar carteira Asaas.");
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
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Estim. mensal (92,01%)</p>
          <p className="font-display text-3xl text-primary mt-1">
            R$ {receitaMes.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className="mt-8 bg-card/40 border border-white/10 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-5 w-5 text-primary" />
          <p className="font-display text-lg text-white">CONFIGURAÇÃO ASAAS</p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">ID da Carteira Asaas (Wallet ID)</label>
              <Input 
                value={asaasWalletId}
                onChange={(e) => setAsaasWalletId(e.target.value)}
                placeholder="Ex: 48548710-9baa-4ec1-a11f-9010193527c6"
                className="bg-secondary/40 border-white/10 text-white"
              />
              <p className="text-[9px] text-muted-foreground uppercase leading-relaxed">
                Este é o ID da sua conta no Asaas. Você o encontra em Configurações &gt; Integrações &gt; API Keys ou através do suporte do Asaas.
              </p>
            </div>

            <Button onClick={handleSaveAsaas} disabled={busy} className="w-full bg-gradient-primary">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Salvar Configuração</>}
            </Button>

            {asaasWalletId ? (
              <div className="flex items-center gap-2 text-emerald-400 text-[10px] uppercase font-bold tracking-widest">
                <CheckCircle2 className="h-3 w-3" /> Configurado para receber 90%
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-400 text-[10px] uppercase font-bold tracking-widest">
                <AlertCircle className="h-3 w-3" /> Aguardando configuração
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 bg-primary/5 border border-primary/20 p-4">
        <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-2">Como funciona o Split (90/10)</p>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          <li>• O aluno paga o valor total via Asaas</li>
          <li>• <strong>90%</strong> do valor líquido é transferido para sua Wallet Asaas instantaneamente</li>
          <li>• <strong>10%</strong> de taxa de plataforma é retida pela Alpha Coach</li>
          <li>• As taxas do Asaas são descontadas antes da divisão</li>
        </ul>
      </div>

      <div className="mt-6 text-center">
        <a 
          href="https://www.asaas.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[10px] text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest flex items-center justify-center gap-1"
        >
          Acessar Painel Asaas <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
};

export default AdminFaturamento;
