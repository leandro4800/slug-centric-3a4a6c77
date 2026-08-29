import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StoreBadges } from "@/components/StoreBadges";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  ArrowLeft,
  Sparkles,
  Dumbbell,
  Apple,
  LineChart,
  Brain,
  ShieldCheck,
  Smartphone,
  Star,
  Quote,
  ChevronDown,
  Target,
  Trophy,
  MessageCircle,
} from "lucide-react";
import { formatBRL } from "@/lib/body-metrics";
import { blocksExternalPayments, isNativeApp } from "@/lib/native-platform";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, KeyRound } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import cardTreino from "@/assets/card-treino.jpg";
import cardDieta from "@/assets/card-dieta.jpg";
import cardEvolucao from "@/assets/card-evolucao.jpg";
import macroHero from "@/assets/macro-hero.jpg";
import alphaLandingHero from "@/assets/alpha-landing-hero.png.asset.json";


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
  free_access?: boolean | null;
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

const intervaloLabel = {
  mensal: "/mês",
  trimestral: "/trimestre",
  semestral: "/semestre",
  anual: "/ano",
};

const TENANT_PUBLIC_COLUMNS =
  "id, slug, nome, tagline, bio, foto_url, hero_url, especialidades, status, cidade, estado, permite_aula_avulsa, preco_aula_avulsa, free_access, app_preview_url";


const FEATURES = [
  {
    img: cardTreino,
    icon: Dumbbell,
    title: "Treinos Inteligentes",
    desc: "Periodização adaptativa: cargas, séries e técnicas ajustadas automaticamente ao seu nível e evolução.",
  },
  {
    img: cardDieta,
    icon: Apple,
    title: "Dieta Personalizada",
    desc: "Cardápio com macros calculados pelo seu objetivo. Substitua alimentos com 1 toque, sem perder a meta.",
  },
  {
    img: cardEvolucao,
    icon: LineChart,
    title: "Evolução Visual",
    desc: "Fotos, medidas e gráficos lado a lado. Acompanhe ganho de massa, perda de gordura e PRs em tempo real.",
  },
  {
    img: macroHero,
    icon: Brain,
    title: "IA 24/7",
    desc: "Tire dúvida de treino, troca de exercício ou ajuste de dieta a qualquer hora — direto no app.",
  },
];

const TESTIMONIALS = [
  {
    nome: "Ricardo M.",
    detail: "12kg em 5 meses",
    text: "Nunca consegui manter dieta. O app simplifica tanto que vira hábito. Os treinos parecem feitos pra mim mesmo.",
  },
  {
    nome: "Juliana S.",
    detail: "Recomp em 4 meses",
    text: "A evolução em fotos lado a lado me motiva todo dia. Os ajustes de treino e dieta parecem feitos sob medida.",
  },
  {
    nome: "André T.",
    detail: "+18kg supino em 3 meses",
    text: "Os ajustes automáticos de carga são absurdos. A IA responde dúvida de execução na hora — parece coach pessoal.",
  },
  {
    nome: "Camila R.",
    detail: "BF 28% → 19%",
    text: "Já testei 3 apps. Esse é outro nível. As substituições de refeição salvam quando estou na rua.",
  },
];

const FAQ_BASE = [
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. O cancelamento é feito direto no app, em 2 toques. Você mantém acesso até o fim do período pago.",
  },
  {
    q: "Funciona em iPhone e Android?",
    a: "Sim, o app está disponível nas lojas Apple e Google, além de funcionar no navegador.",
  },
  {
    q: "Preciso já ter experiência com academia?",
    a: "Não. Os treinos se adaptam do iniciante ao avançado, com vídeo demonstrativo e explicação de execução para cada exercício.",
  },
  {
    q: "Os planos de dieta consideram alergias e restrições?",
    a: "Sim. Você informa restrições no cadastro e a dieta exclui automaticamente. Pode substituir qualquer refeição também.",
  },
];

export default function TenantLanding() {
  const { slug } = useParams<{ slug: string }>();
  // No app nativo nunca exibimos a landing de vendas do coach.
  if (isNativeApp()) {
    return <Navigate to={slug ? `/${slug}/login` : "/"} replace />;
  }
  return <TenantLandingContent />;
}

function TenantLandingContent() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [freeName, setFreeName] = useState("");
  const [freeEmail, setFreeEmail] = useState("");
  const iosBlocksPayments = blocksExternalPayments();
  const coachImage = tenant?.foto_url || tenant?.hero_url || null;
  const heroImage = tenant?.hero_url || tenant?.foto_url || alphaLandingHero.url;

  const faqItems = [
    {
      q: "Como funciona a assinatura?",
      a: iosBlocksPayments
        ? "No app iOS, solicite um código de acesso ao seu coach. A assinatura com pagamento online está disponível em alpha-coach.app pelo navegador."
        : "Você escolhe um plano, faz o pagamento pelo checkout seguro e libera acesso total ao app do coach imediatamente. Sem letra miúda.",
    },
    ...FAQ_BASE,
  ];

  const handleCheckout = async (plano_id: string) => {
    if (blocksExternalPayments()) {
      toast({
        title: "Assinatura pelo site",
        description: "No app iOS, peça ao seu coach um código de acesso ou assine pelo navegador em alpha-coach.app.",
      });
      setVoucherOpen(true);
      return;
    }
    setCheckoutLoading(plano_id);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: { plano_id, type: "subscription" },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("URL de checkout não retornada");
      window.location.href = data.url;
    } catch (e: any) {
      toast({ title: "Erro ao iniciar checkout", description: e.message, variant: "destructive" });
      setCheckoutLoading(null);
    }
  };

  const buildFreePassword = (nome: string) => {
    const first = nome
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().trim().split(/\s+/)[0].replace(/[^a-z0-9]/g, "");
    return `${first || "aluno"}2026`;
  };

  const handleJoinFree = async () => {
    // Se ainda não está logado, cria a conta com padrão nome+2026
    if (!user) {
      const nome = freeName.trim();
      const email = freeEmail.trim().toLowerCase();
      if (!nome || !email) {
        toast({ title: "Preencha nome e e-mail", variant: "destructive" });
        return;
      }
      setCheckoutLoading("__free__");
      const password = buildFreePassword(nome);
      try {
        // Cria a conta pelo backend (service role) para não depender do e-mail
        // de confirmação do Supabase, que tem rate limit baixo e derrubava o
        // cadastro com "email rate limit exceeded".
        const { data: signupData, error: signupErr } = await supabase.functions.invoke(
          "landing-signup",
          { body: { email, nome, slug: tenant?.slug || slug, password } },
        );
        if (signupErr) throw signupErr;
        if (!(signupData as any)?.ok) throw new Error((signupData as any)?.error || "Falha ao criar conta");


        // Tenta logar imediatamente (funciona se e-mail já confirmado ou signup auto-loga)
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) {
          toast({
            title: "Conta criada!",
            description: `Sua senha é: ${password}. Enviamos também por e-mail. Faça login para continuar.`,
          });
          sessionStorage.setItem("pending_free_join", slug || "");
          navigate(`/${slug}/login`);
          setCheckoutLoading(null);
          return;
        }
        toast({
          title: "Conta criada!",
          description: `Senha: ${password}. Enviamos os dados de acesso para o seu e-mail.`,
        });

      } catch (e: any) {
        toast({ title: "Erro ao criar conta", description: e.message, variant: "destructive" });
        setCheckoutLoading(null);
        return;
      }
    } else {
      setCheckoutLoading("__free__");
    }
    try {
      const { data, error } = await supabase.functions.invoke("join-free-tenant", {
        body: { tenant_slug: slug },
      });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error || "Falha ao liberar acesso");
      toast({ title: "Acesso liberado!", description: "Bem-vindo(a) 🎉" });
      navigate(`/${slug}/app`, { replace: true });
    } catch (e: any) {
      toast({ title: "Erro ao entrar", description: e.message, variant: "destructive" });
      setCheckoutLoading(null);
    }
  };


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
        const msg =
          result?.error === "invalid_code"
            ? "Código inválido"
            : result?.error === "already_used"
              ? "Código já utilizado"
              : result?.error === "expired"
                ? "Código expirado"
                : result?.error === "not_authenticated"
                  ? "Faça login primeiro"
                  : "Não foi possível resgatar o código";
        toast({ title: msg, variant: "destructive" });
        return;
      }
      toast({ title: "Acesso liberado!", description: "Redirecionando para o app..." });
      setVoucherOpen(false);
      sessionStorage.removeItem("pending_voucher");
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
        description: "Acesse o app para começar.",
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("confirmed");
      window.history.replaceState({}, "", url.toString());
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [slug]);

  useEffect(() => {
    if (!loading && user && !hasSubscription) {
      const isVoucherRequested = searchParams.get("voucher") === "1";
      const pendingCode = sessionStorage.getItem("pending_voucher");
      const pendingFree = sessionStorage.getItem("pending_free_join");
      if (pendingFree && pendingFree === slug && tenant?.free_access) {
        sessionStorage.removeItem("pending_free_join");
        void handleJoinFree();
      } else if (isVoucherRequested) {
        setVoucherOpen(true);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("voucher");
        setSearchParams(nextParams, { replace: true });
      } else if (pendingCode && pendingCode !== "1") {
        void handleRedeemVoucher(pendingCode);
      }
    }
  }, [loading, user, hasSubscription, searchParams, navigate, slug, tenant?.free_access]);


  const load = async () => {
    if (!slug) return;
    setLoading(true);

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(currentUser);

    const temCodigo = searchParams.get("codigo") !== null || searchParams.get("voucher") !== null;
    if (temCodigo && !currentUser) {
      navigate(`/${slug}/login`, { replace: true });
      return;
    }

    const { data: t } = await supabase
      .from("tenants")
      .select(TENANT_PUBLIC_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();
    setTenant(t as Tenant);

    if (t) {
      if (currentUser) {
        const { data: sub } = await supabase
          .from("assinaturas")
          .select("status")
          .eq("aluno_id", currentUser.id)
          .eq("tenant_id", t.id)
          .in("status", ["active", "trialing"])
          .maybeSingle();

        setHasSubscription(!!sub);
        const previewMode = searchParams.get("preview") !== null;
        if (sub && !previewMode) {
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground font-display uppercase tracking-widest">
        Carregando...
      </div>
    );
  }
  if (!tenant || tenant.status !== "approved") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background text-center">
        <h1 className="font-display text-4xl uppercase">Coach indisponível</h1>
        <Link to="/site">
          <Button>Voltar para o site</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/30 to-transparent" />
        </div>

        {/* Top nav */}
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 pt-6 md:px-8">
          <Link
            to="/site"
            className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Início
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setVoucherOpen(true)}
              className="hidden text-white hover:bg-white/10 font-bold uppercase tracking-wider sm:inline-flex"
            >
              <KeyRound className="mr-1 h-4 w-4" /> Tenho código
            </Button>
            <StoreBadges size="sm" className="gap-2" />
          </div>
        </div>

        {/* Hero content */}
        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-16 md:px-8 md:pb-32 md:pt-24">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
            {coachImage && (
              <img
                src={coachImage}
                alt={tenant.nome}
                className="h-28 w-28 rounded-full border-2 border-primary/60 object-cover shadow-[0_0_40px_-5px_hsl(var(--primary)/0.6)] md:h-36 md:w-36"
              />
            )}
            <div>
              <Badge className="mb-4 border border-primary/40 bg-primary/20 text-primary">
                <Sparkles className="mr-1 h-3 w-3" /> Coach Verificado
              </Badge>
              <h1 className="font-display text-5xl uppercase leading-none tracking-tight text-white md:text-7xl">
                {tenant.nome}
              </h1>
              {tenant.tagline && (
                <p className="mt-4 max-w-2xl text-xl text-white/85 md:text-2xl">
                  {tenant.tagline}
                </p>
              )}
              {tenant.especialidades && tenant.especialidades.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {tenant.especialidades.map((e) => (
                    <Badge
                      key={e}
                      variant="outline"
                      className="border-white/30 bg-white/10 text-white backdrop-blur"
                    >
                      {e}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                {iosBlocksPayments ? (
                  <Button
                    size="lg"
                    className="font-bold uppercase tracking-widest shadow-[0_0_40px_-10px_hsl(var(--primary))]"
                    onClick={() => setVoucherOpen(true)}
                  >
                    <KeyRound className="mr-2 h-4 w-4" /> Tenho código de acesso
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="font-bold uppercase tracking-widest shadow-[0_0_40px_-10px_hsl(var(--primary))]"
                    onClick={() =>
                      document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    Assinar plano
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-white/5 text-white backdrop-blur hover:bg-white/10 font-bold uppercase tracking-widest"
                  onClick={() =>
                    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Ver o app
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative border-y border-white/10 bg-black/40 backdrop-blur">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-6 md:grid-cols-4 md:px-8">
            {[
              { v: "+10k", l: "Treinos gerados" },
              { v: "24/7", l: "IA disponível" },
              { v: "Sem", l: "Fidelidade" },
              { v: "iOS · Android", l: "Apps nativos" },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="font-display text-2xl text-primary md:text-3xl">{s.v}</div>
                <div className="text-xs uppercase tracking-wider text-white/60 md:text-sm">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SOBRE O COACH (BIO EM CARDS) ===== */}
      {tenant.bio && (() => {
        const raw = tenant.bio.replace(/\s+/g, " ").trim();
        const parts = raw.split("*").map((p) => p.trim()).filter(Boolean);
        const bullets = parts.filter((p) => p.length > 0 && p.length < 80);
        const longs = parts.filter((p) => p.length >= 80);
        const intro = longs[0] || parts[0] || "";
        const closing = longs.slice(1).join(" ").trim();
        return (
          <section className="border-y border-border bg-card/30">
            <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28">
              <div className="mx-auto max-w-3xl text-center">
                <Badge className="mb-4 border border-primary/40 bg-primary/10 text-primary">
                  <Trophy className="mr-1 h-3 w-3" /> Sobre o Coach
                </Badge>
                <h2 className="font-display text-4xl uppercase md:text-5xl">
                  O método por trás dos{" "}
                  <span className="text-primary">resultados</span>
                </h2>
              </div>

              {intro && (
                <div className="mx-auto mt-12 max-w-4xl rounded-2xl border border-border bg-card p-8 shadow-[0_0_60px_-20px_hsl(var(--primary)/0.3)] md:p-10">
                  <Quote className="mb-4 h-8 w-8 text-primary/70" />
                  <p className="text-base leading-relaxed text-foreground/90 md:text-lg">
                    {intro}
                  </p>
                </div>
              )}

              {bullets.length > 0 && (
                <div className="mt-10">
                  <h3 className="text-center font-display text-sm uppercase tracking-widest text-muted-foreground">
                    Focos do trabalho
                  </h3>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {bullets.map((b, i) => (
                      <div
                        key={i}
                        className="group flex items-start gap-3 rounded-xl border border-border bg-background/60 p-5 transition-all hover:border-primary/60 hover:bg-card"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                          <Target className="h-4 w-4" />
                        </div>
                        <p className="text-sm font-medium text-foreground/90">{b}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {closing && (
                <div className="mx-auto mt-10 max-w-4xl rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-8 md:p-10">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <p className="text-base leading-relaxed text-foreground/90 md:text-lg">
                      {closing}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {/* ===== FEATURES CAROUSEL ===== */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="mb-4 border border-primary/40 bg-primary/10 text-primary">
            <Smartphone className="mr-1 h-3 w-3" /> O que você recebe
          </Badge>
          <h2 className="font-display text-4xl uppercase md:text-5xl">
            Tudo em <span className="text-primary">um único app</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Treino, dieta e evolução integrados — com IA pra ajustar
            tudo conforme você evolui.
          </p>
        </div>

        <Carousel
          opts={{ align: "start", loop: true }}
          className="mt-12"
        >
          <CarouselContent className="-ml-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <CarouselItem
                  key={f.title}
                  className="pl-4 md:basis-1/2 lg:basis-1/3"
                >
                  <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/60 hover:shadow-[0_0_40px_-10px_hsl(var(--primary)/0.5)]">
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={f.img}
                        alt={f.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                      <div className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-display text-xl uppercase">{f.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>
      </section>

      {/* ===== EXPLANATION / HOW IT WORKS ===== */}
      <section className="border-y border-border bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div className="order-2 md:order-1">
              <Badge className="mb-4 border border-primary/40 bg-primary/10 text-primary">
                Como funciona
              </Badge>
              <h2 className="font-display text-4xl uppercase md:text-5xl">
                Do cadastro ao <span className="text-primary">primeiro treino</span> em 3 minutos
              </h2>
              <ol className="mt-8 space-y-6">
                {[
                  {
                    n: "01",
                    t: iosBlocksPayments ? "Resgate seu código" : "Assine um plano",
                    d: iosBlocksPayments
                      ? "Solicite ao seu coach um código de acesso ou assine pelo navegador em alpha-coach.app."
                      : "Escolha o plano que combina com você, faça o checkout seguro e libere acesso total ao app imediatamente.",
                  },
                  {
                    n: "02",
                    t: "Conte seu objetivo",
                    d: "Anamnese rápida: objetivo, restrições, frequência. A IA monta treino e dieta sob medida.",
                  },
                  {
                    n: "03",
                    t: "Treine e evolua",
                    d: "App te guia em cada série, cada refeição, cada check-in. Ajustes acontecem automaticamente.",
                  },
                ].map((s) => (
                  <li key={s.n} className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/50 bg-primary/10 font-display text-primary">
                      {s.n}
                    </div>
                    <div>
                      <h4 className="font-display text-lg uppercase">{s.t}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="order-1 md:order-2">
              <div className="relative mx-auto aspect-[9/16] w-full max-w-xs overflow-hidden rounded-[2.5rem] border-[10px] border-foreground/90 bg-card shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.5)]">
                <img
                  src={(tenant as any)?.app_preview_url || coachImage || cardTreino}
                  alt={`App do ${tenant.nome}`}
                  className="h-full w-full object-cover"
                />
                {/* Overlay estilo "tela de perfil" personalizada do coach */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/90" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <Badge className="mb-2 border border-primary/50 bg-primary/20 text-primary text-[10px]">
                    <Sparkles className="mr-1 h-3 w-3" /> Perfil do Coach
                  </Badge>
                  <p className="font-display text-xl uppercase leading-tight">{tenant.nome}</p>
                  {tenant.tagline && (
                    <p className="mt-1 text-[11px] text-white/80 line-clamp-2">{tenant.tagline}</p>
                  )}
                </div>
                <div className="absolute inset-x-0 top-0 h-6 bg-foreground/90" />
                <div className="absolute left-1/2 top-1.5 h-3 w-20 -translate-x-1/2 rounded-full bg-background" />
              </div>
              <p className="mt-3 text-center text-[11px] uppercase tracking-widest text-muted-foreground">
                App personalizado do {tenant.nome}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PLANOS ===== */}
      <section id="planos" className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28">
        {tenant?.free_access ? (
          <div className="mx-auto max-w-2xl rounded-3xl border border-primary/50 bg-gradient-to-b from-primary/15 to-card p-10 text-center shadow-[0_0_80px_-10px_hsl(var(--primary)/0.6)]">
            <Badge className="mb-4 border border-primary/40 bg-primary/10 text-primary">
              <ShieldCheck className="mr-1 h-3 w-3" /> Acesso liberado · Fase de testes
            </Badge>
            <h2 className="font-display text-4xl uppercase md:text-5xl">Entrar grátis</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Este coach está com acesso 100% gratuito no momento. Crie sua conta e libere o app imediatamente, sem cartão.
            </p>
            {!user && (
              <div className="mx-auto mt-6 grid max-w-md gap-3 text-left">
                <Input
                  placeholder="Seu nome completo"
                  value={freeName}
                  onChange={(e) => setFreeName(e.target.value)}
                />
                <Input
                  type="email"
                  placeholder="Seu melhor e-mail"
                  value={freeEmail}
                  onChange={(e) => setFreeEmail(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Sua senha será gerada automaticamente no padrão <strong>primeironome2026</strong> (ex.: joao2026) e enviada para o seu e-mail. Você pode trocá-la depois no perfil ou{" "}
                  <a href="/forgot-password" className="text-primary underline underline-offset-2">
                    redefinir sua senha aqui
                  </a>
                  .
                </p>

              </div>
            )}
            <Button
              size="lg"
              className="mt-6 w-full font-bold uppercase tracking-widest shadow-[0_0_30px_-5px_hsl(var(--primary))] md:w-auto md:px-12"
              disabled={!!checkoutLoading}
              onClick={handleJoinFree}
            >
              {checkoutLoading === "__free__" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Entrar grátis agora"
              )}
            </Button>
            <div className="mt-8 border-t border-border pt-6">
              <p className="text-xs text-muted-foreground">Tem um código do coach?</p>
              <Button
                variant="outline"
                className="mt-3 font-bold uppercase tracking-widest"
                onClick={() => setVoucherOpen(true)}
              >
                <KeyRound className="mr-2 h-4 w-4" /> Resgatar código
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center">
              <Badge className="mb-4 border border-primary/40 bg-primary/10 text-primary">
                <ShieldCheck className="mr-1 h-3 w-3" /> Sem fidelidade · Cancele quando quiser
              </Badge>
              <h2 className="font-display text-4xl uppercase md:text-5xl">Escolha seu plano</h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                {iosBlocksPayments
                  ? "No app iOS, use o código de acesso fornecido pelo seu coach. Pagamentos online estão disponíveis em alpha-coach.app pelo navegador."
                  : <>Acesso total ao app do coach com pagamento seguro. <span className="font-bold text-primary">Sem fidelidade</span>. Cancele quando quiser.</>}
              </p>
            </div>

            {planos.length === 0 ? (
              <p className="mt-10 text-center text-muted-foreground">
                Nenhum plano disponível no momento.
              </p>
            ) : (
              <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {planos.map((p, idx) => {
                  const destacado = idx === 1 || planos.length === 1;
                  return (
                    <div
                      key={p.id}
                      className={`relative flex flex-col rounded-2xl border p-8 transition-all ${
                        destacado
                          ? "scale-[1.02] border-primary bg-gradient-to-b from-primary/10 to-card shadow-[0_0_60px_-10px_hsl(var(--primary)/0.6)]"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      {destacado && (
                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground shadow-lg">
                          ⭐ Mais popular
                        </Badge>
                      )}
                      <h3 className="font-display text-2xl uppercase">{p.nome}</h3>
                      {p.descricao && (
                        <p className="mt-2 text-sm text-muted-foreground">{p.descricao}</p>
                      )}
                      <div className="mt-6 flex items-baseline gap-1">
                        <span className="font-display text-5xl">{formatBRL(p.preco_centavos)}</span>
                        <span className="text-muted-foreground">{intervaloLabel[p.intervalo]}</span>
                      </div>
                      <ul className="mt-6 flex-1 space-y-3 text-sm">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 shrink-0 text-primary" /> Acesso imediato ao app
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 shrink-0 text-primary" /> Treinos + dieta + IA 24/7
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 shrink-0 text-primary" /> Evolução visual e métricas
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 shrink-0 text-primary" /> Cancele quando quiser
                        </li>
                      </ul>
                      {iosBlocksPayments ? (
                        <Button
                          size="lg"
                          variant="outline"
                          className={`mt-8 w-full font-bold uppercase tracking-widest ${
                            destacado ? "border-primary" : ""
                          }`}
                          onClick={() => setVoucherOpen(true)}
                        >
                          <KeyRound className="mr-2 h-4 w-4" /> Resgatar código
                        </Button>
                      ) : (
                        <Button
                          size="lg"
                          className={`mt-8 w-full font-bold uppercase tracking-widest ${
                            destacado ? "shadow-[0_0_30px_-5px_hsl(var(--primary))]" : ""
                          }`}
                          disabled={!!checkoutLoading}
                          onClick={() => handleCheckout(p.id)}
                        >
                          {checkoutLoading === p.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Assinar plano"
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-12 border-t border-border pt-8 text-center">
              <p className="text-sm text-muted-foreground">Tem um código de acesso do coach?</p>
              <Button
                variant="outline"
                className="mt-3 font-bold uppercase tracking-widest"
                onClick={() => setVoucherOpen(true)}
              >
                <KeyRound className="mr-2 h-4 w-4" /> Resgatar código
              </Button>
            </div>
          </>
        )}
      </section>


      {/* ===== TESTIMONIALS ===== */}
      <section className="border-y border-border bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28">
          <div className="text-center">
            <Badge className="mb-4 border border-primary/40 bg-primary/10 text-primary">
              <Star className="mr-1 h-3 w-3 fill-primary" /> Resultados reais
            </Badge>
            <h2 className="font-display text-4xl uppercase md:text-5xl">
              Quem treina, <span className="text-primary">transforma</span>
            </h2>
          </div>

          <Carousel opts={{ align: "start", loop: true }} className="mt-12">
            <CarouselContent className="-ml-4">
              {TESTIMONIALS.map((t) => (
                <CarouselItem
                  key={t.nome}
                  className="pl-4 md:basis-1/2 lg:basis-1/3"
                >
                  <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-6">
                    <Quote className="h-8 w-8 text-primary/40" />
                    <p className="mt-4 flex-1 text-sm leading-relaxed text-foreground/90">
                      "{t.text}"
                    </p>
                    <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 font-display text-primary">
                        {t.nome[0]}
                      </div>
                      <div>
                        <div className="font-display text-sm uppercase">{t.nome}</div>
                        <div className="text-xs text-primary">{t.detail}</div>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="mx-auto max-w-3xl px-4 py-20 md:px-8 md:py-28">
        <div className="text-center">
          <Badge className="mb-4 border border-primary/40 bg-primary/10 text-primary">
            <ChevronDown className="mr-1 h-3 w-3" /> Perguntas frequentes
          </Badge>
          <h2 className="font-display text-4xl uppercase md:text-5xl">Dúvidas?</h2>
        </div>

        <Accordion type="single" collapsible className="mt-10">
          {faqItems.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-border">
              <AccordionTrigger className="text-left font-display uppercase tracking-wide hover:text-primary hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="relative overflow-hidden border-t border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center md:px-8 md:py-28">
          <h2 className="font-display text-4xl uppercase md:text-6xl">
            Pronto para <span className="text-primary">começar?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Acesso imediato. Sem fidelidade. Cancele quando quiser.
          </p>
          <Button
            size="lg"
            className="mt-8 font-bold uppercase tracking-widest shadow-[0_0_40px_-10px_hsl(var(--primary))]"
            onClick={() =>
              iosBlocksPayments ? setVoucherOpen(true) : document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            {iosBlocksPayments ? (
              <>
                <KeyRound className="mr-2 h-4 w-4" /> Resgatar código
              </>
            ) : (
              "Começar agora →"
            )}
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-10 text-center text-xs text-muted-foreground">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Baixe o app</p>
        <StoreBadges className="justify-center" />
        <p className="mt-6">© {new Date().getFullYear()} {tenant.nome}. Todos os direitos reservados.</p>
      </footer>

      <Dialog open={voucherOpen} onOpenChange={setVoucherOpen}>
        <DialogContent className="bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="font-display uppercase text-xl flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Código de acesso
            </DialogTitle>
            <DialogDescription>
              {user
                ? "Digite o código fornecido pelo coach para liberar acesso ilimitado."
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
                disabled={voucherLoading || !voucherCode}
                className="w-full font-bold uppercase tracking-widest"
              >
                {voucherLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Resgatar acesso"
                )}
              </Button>
            ) : (
              <Link to={`/${slug}/login?voucher=1`} className="block">
                <Button className="w-full font-bold uppercase tracking-widest">
                  Entrar para resgatar
                </Button>
              </Link>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
