import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, Sparkles } from "lucide-react";
import { formatBRL } from "@/lib/body-metrics";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, KeyRound } from "lucide-react";
import { AulaAvulsaQuickForm } from "@/components/AulaAvulsaQuickForm";

interface Tenant {
  id: string;
  slug: string;
  nome: string;
  tagline: string | null;
  bio: string | null;
  foto_url: string | null;
  hero_url: string | null;
  especialidades: string[] | null;
  status: string;
  stripe_onboarding_completed?: boolean;
  cidade: string | null;
  estado: string | null;
  permite_aula_avulsa: boolean | null;
  preco_aula_avulsa: number | null;
}
interface Plano {
  id: string;
  nome: string;
  descricao: string | null;
  preco_centavos: number;
  intervalo: "mensal" | "trimestral" | "semestral" | "anual";
  ordem: number;
  stripe_price_id: string | null;
}

const intervaloLabel = { mensal: "/mês", trimestral: "/trimestre", semestral: "/semestre", anual: "/ano" };

const TENANT_PUBLIC_COLUMNS =
  "id, slug, nome, tagline, bio, foto_url, hero_url, especialidades, status, cidade, estado, permite_aula_avulsa, preco_aula_avulsa";

export default function TenantLanding() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [aulaAvulsaOpen, setAulaAvulsaOpen] = useState(false);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);

  const handleRedeemVoucher = async (codeOverride?: string) => {
    const code = (codeOverride || voucherCode).trim();
    if (!code) {
      toast({ title: "Digite o código", variant: "destructive" });
      return;
    }
    if (!user) {
      sessionStorage.setItem("pending_voucher", code);
      navigate(`/${slug}/login`);
      return;
    }
    setVoucherLoading(true);
    try {
      const { data, error } = await supabase.rpc("redeem_voucher", { _code: code });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string };
      if (!result?.ok) {
        const msg = result?.error === "invalid_code" ? "Código inválido"
          : result?.error === "already_used" ? "Código já utilizado"
          : result?.error === "expired" ? "Código expirado"
          : result?.error === "not_authenticated" ? "Faça login primeiro"
          : "Não foi possível resgatar o código";
        toast({ title: msg, variant: "destructive" });
        return;
      }
      toast({ title: "Acesso liberado!", description: "Redirecionando para o app..." });
      setVoucherOpen(false);
      sessionStorage.removeItem("pending_voucher");
      // Limpa params da URL se houver
      if (searchParams.has("voucher") || searchParams.has("codigo")) {
        searchParams.delete("voucher");
        searchParams.delete("codigo");
        setSearchParams(searchParams, { replace: true });
      }
      setTimeout(() => window.location.assign(`/${slug}/app`), 800);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setVoucherLoading(false);
    }
  };


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("confirmed") === "1") {
      toast({
        title: "E-mail confirmado!",
        description: "Escolha seu plano para liberar seu acesso.",
      });
      // Limpa a URL
      const url = new URL(window.location.href);
      url.searchParams.delete("confirmed");
      window.history.replaceState({}, "", url.toString());
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [slug]);

  // Auto-abre o modal de código quando voltar do login com ?voucher=1
  useEffect(() => {
    if (!loading && user && !hasSubscription) {
      const isVoucherRequested = searchParams.get("voucher") === "1";
      const pendingCode = sessionStorage.getItem("pending_voucher");
      
      if (isVoucherRequested) {
        console.log("[TenantLanding] Voucher solicitado, abrindo modal.");
        setVoucherOpen(true);
        // Limpa a URL para evitar loops ao navegar
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("voucher");
        setSearchParams(nextParams, { replace: true });
      } else if (pendingCode && pendingCode !== "1") {
        console.log("[TenantLanding] Voucher pendente detectado, processando resgate automático.");
        void handleRedeemVoucher(pendingCode);
      }
    }
  }, [loading, user, hasSubscription, searchParams, navigate, slug]);

  const load = async () => {
    if (!slug) return;
    setLoading(true);
    
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(currentUser);

    // Se o aluno já tem código (chegou pelo link com ?codigo / ?voucher),
    // pula a tela de planos e vai direto para o login do coach.
    const temCodigo = searchParams.get("codigo") !== null || searchParams.get("voucher") !== null;
    if (temCodigo && !currentUser) {
      navigate(`/${slug}/login`, { replace: true });
      return;
    }

    const { data: t } = await supabase.from("tenants").select(TENANT_PUBLIC_COLUMNS).eq("slug", slug).maybeSingle();
    setTenant(t as Tenant);
    
    if (t) {
      // Check for subscription
      if (currentUser) {
        const { data: sub } = await supabase
          .from("assinaturas")
          .select("status")
          .eq("aluno_id", currentUser.id)
          .eq("tenant_id", t.id)
          .in("status", ["active", "trialing"])
          .maybeSingle();
        
        setHasSubscription(!!sub);
        if (sub) {
          navigate(`/${slug}/app`, { replace: true });
          return;
        }
      }

      const { data: p } = await supabase
        .from("planos")
        .select("id, nome, descricao, preco_centavos, intervalo, ordem, stripe_price_id")
        .eq("tenant_id", t.id)
        .eq("ativo", true)
        .order("ordem");
      setPlanos((p as Plano[]) ?? []);
    }
    setLoading(false);
  };

  const handleCheckout = async (plano_id?: string, type: 'subscription' | 'aula_avulsa' = 'subscription') => {
    const loadingKey = type === 'aula_avulsa' ? 'aula_avulsa' : plano_id!;
    setCheckoutLoading(loadingKey);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: { 
          plano_id, 
          tenant_id: tenant?.id,
          type 
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      toast({ title: "Erro no checkout", description: e.message, variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-background">Carregando...</div>;
  }
  if (!tenant || tenant.status !== "approved") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background text-center">
        <h1 className="font-display text-4xl uppercase">Coach indisponível</h1>
        <Link to="/"><Button>Ver marketplace</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          {tenant.hero_url ? (
            <img src={tenant.hero_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/30 to-background" />
          )}
          <div className="absolute inset-0 bg-black/20" /> {/* Subtle overlay only for text legibility */}
        </div>

        <div className="relative mx-auto max-w-5xl px-4 pt-6 md:px-8 flex justify-between items-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Marketplace
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setVoucherOpen(true)}
              className="text-white hover:bg-white/10 font-bold uppercase tracking-wider"
            >
              <KeyRound className="mr-1 h-4 w-4" /> Tenho código
            </Button>
            <Link to={`/${slug}/login`}>
              <Button variant="ghost" className="text-white hover:bg-white/10 font-bold uppercase tracking-wider">Entrar</Button>
            </Link>
          </div>
        </div>

        <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-12 md:px-8 md:pb-24 md:pt-20">
          {tenant.foto_url && (
            <img
              src={tenant.foto_url}
              alt={tenant.nome}
              className="mb-6 h-24 w-24 rounded-none border-2 border-primary/40 object-cover shadow-glow md:h-32 md:w-32"
            />
          )}
          <Badge className="mb-4 bg-primary/20 text-primary border border-primary/40">
            <Sparkles className="mr-1 h-3 w-3" /> Coach Verificado
          </Badge>
          <h1 className="font-display text-5xl uppercase tracking-tight md:text-7xl">{tenant.nome}</h1>
          {tenant.tagline && <p className="mt-3 text-xl text-white/80 md:text-2xl">{tenant.tagline}</p>}
          {tenant.especialidades && tenant.especialidades.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {tenant.especialidades.map((e) => (
                <Badge key={e} variant="outline" className="border-white/30 bg-white/10 text-white">
                  {e}
                </Badge>
              ))}
            </div>
          )}
          {tenant.bio && (
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">{tenant.bio}</p>
          )}
        </div>
      </section>

      {/* Planos */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
        <div className="mb-12 text-center">
          <h2 className="font-display text-4xl uppercase md:text-5xl">
            {hasSubscription ? "Você já possui acesso" : "Escolha seu plano"}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {hasSubscription 
              ? "Aproveite todos os benefícios do seu plano ativo." 
              : "Experimente por 30 dias grátis. Cancele quando quiser."}
          </p>
          {hasSubscription && (
            <Button 
              size="lg" 
              className="mt-6 font-bold uppercase tracking-widest"
              onClick={() => navigate(`/${slug}/app`)}
            >
              Ir para o Dashboard
            </Button>
          )}
        </div>

        {!hasSubscription && (
          <>
            {planos.length === 0 ? (
          <div className="rounded-none border border-border/50 bg-card/40 p-12 text-center text-muted-foreground">
            Este coach ainda não publicou planos.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tenant.permite_aula_avulsa && (
              <div className="relative overflow-hidden rounded-none border-2 border-primary/30 bg-card p-8 flex flex-col">
                <Badge className="absolute right-4 top-4 bg-primary text-primary-foreground">Aula Presencial</Badge>
                <h3 className="font-display text-2xl uppercase">Aula Avulsa</h3>
                <p className="mt-2 text-sm text-muted-foreground">Treino presencial único para correção de técnica e performance.</p>
                <div className="my-6">
                  <span className="font-display text-5xl">R$ {tenant.preco_aula_avulsa}</span>
                  <span className="ml-1 text-muted-foreground">/aula</span>
                </div>
                <ul className="mb-8 space-y-2 text-sm flex-1">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Correção de técnica</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Intensidade máxima</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Suporte pós-treino</li>
                </ul>
                <Button 
                  onClick={() => setAulaAvulsaOpen(true)}
                  className="w-full font-bold uppercase tracking-widest"
                >
                  Agendar Aula
                </Button>
              </div>
            )}
            {planos.map((p, i) => {
              const destaque = i === 1 && planos.length >= 2;
              return (
                <div
                  key={p.id}
                  className={`relative overflow-hidden rounded-none border p-8 transition-all ${
                    destaque
                      ? "border-primary bg-gradient-to-b from-primary/10 to-card shadow-glow"
                      : "border-border/50 bg-card hover:border-primary/40"
                  }`}
                >
                  {destaque && (
                    <Badge className="absolute right-4 top-4 bg-primary text-primary-foreground">
                      Mais popular
                    </Badge>
                  )}
                  <h3 className="font-display text-2xl uppercase">{p.nome}</h3>
                  {p.descricao && <p className="mt-2 text-sm text-muted-foreground">{p.descricao}</p>}
                  <div className="my-6">
                    <span className="font-display text-5xl">{formatBRL(p.preco_centavos)}</span>
                    <span className="ml-1 text-muted-foreground">{intervaloLabel[p.intervalo]}</span>
                  </div>
                  <ul className="mb-8 space-y-2 text-sm">
                    {["Treinos personalizados", "Dieta sob medida", "Acompanhamento contínuo", "App exclusivo"].map(
                      (f) => (
                        <li key={f} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" /> {f}
                        </li>
                      )
                    )}
                  </ul>
                  {!p.stripe_price_id ? (
                    <div className="text-xs text-center text-muted-foreground border border-border/50 p-3">
                      Plano em configuração — em breve.
                    </div>
                  ) : !user ? (
                    <Link to={`/${slug}/login`} className="block">
                      <Button className="w-full font-bold uppercase tracking-widest" variant={destaque ? "default" : "outline"}>
                        Criar conta e assinar
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      onClick={() => handleCheckout(p.id)}
                      disabled={checkoutLoading === p.id}
                      className="w-full font-bold uppercase tracking-widest"
                      variant={destaque ? "default" : "outline"}
                    >
                      {checkoutLoading === p.id ? "Redirecionando..." : "Testar 30 dias grátis"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </>
    )}
      </section>

      <Dialog open={aulaAvulsaOpen} onOpenChange={setAulaAvulsaOpen}>
        <DialogContent className="bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="font-display uppercase text-xl">Agendar Aula Avulsa</DialogTitle>
          </DialogHeader>
          {tenant?.permite_aula_avulsa && tenant.preco_aula_avulsa && (
            <AulaAvulsaQuickForm
              tenantId={tenant.id}
              tenantNome={tenant.nome}
              preco={Number(tenant.preco_aula_avulsa)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={voucherOpen} onOpenChange={setVoucherOpen}>
        <DialogContent className="bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="font-display uppercase text-xl flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Código de acesso
            </DialogTitle>
            <DialogDescription>
              {user
                ? "Digite o código fornecido pelo coach para liberar acesso ilimitado sem cobrança."
                : "Faça login ou cadastre-se primeiro. Depois volte aqui para resgatar seu código."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
              placeholder="EX: ALPHA-XXXXXX"
              className="uppercase tracking-widest"
              disabled={!user || voucherLoading}
            />
            {user ? (
              <Button
                onClick={() => handleRedeemVoucher()}
                disabled={voucherLoading}
                className="w-full font-bold uppercase tracking-widest"
              >
                {voucherLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resgatar acesso"}
              </Button>
            ) : (
              <Link to={`/${slug}/login`} className="block">
                <Button className="w-full font-bold uppercase tracking-widest">Entrar / Cadastrar</Button>
              </Link>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
