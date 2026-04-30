import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/Logo";
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";

export default function SejaCoach() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();

  const [step, setStep] = useState<"signup" | "form" | "stripe" | "pending">("signup");
  const [busy, setBusy] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");

  // tenant form
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [especialidades, setEspecialidades] = useState("");

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [stripeStatus, setStripeStatus] = useState<{ completed: boolean } | null>(null);

  // Detecta usuário logado e busca tenant existente
  useEffect(() => {
    if (isLoading) return;
    if (user) void loadExisting();
  }, [user, isLoading]);

  const loadExisting = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("tenants")
      .select("id, slug, status, stripe_onboarding_completed, stripe_account_id")
      .eq("owner_user_id", user.id)
      .maybeSingle();
    if (data) {
      setTenantId(data.id);
      setSlug(data.slug);
      if (data.stripe_account_id && !data.stripe_onboarding_completed) setStep("stripe");
      else if (data.stripe_onboarding_completed && data.status === "pending") setStep("pending");
      else if (data.status === "approved") {
        navigate(`/${data.slug}/admin`);
      } else setStep("form");
    } else {
      setStep("form");
    }
    if (params.get("completed") === "1" && data?.stripe_account_id) {
      void syncStripe(data.id);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/seja-coach`,
          data: { nome_completo: nome },
        },
      });
      if (error) throw error;
      toast({ title: "Conta criada!", description: "Continue o cadastro do seu painel." });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const cleanSlug = slug
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      if (!cleanSlug) throw new Error("Slug inválido");

      const especArr = especialidades
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const { data, error } = await supabase
        .from("tenants")
        .insert({
          slug: cleanSlug,
          nome,
          tagline,
          bio,
          especialidades: especArr,
          owner_user_id: user.id,
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;

      // dá role coach automaticamente
      await supabase.from("user_roles").insert({
        user_id: user.id,
        role: "coach" as any,
        tenant_id: data.id,
      });

      setTenantId(data.id);
      setStep("stripe");
      toast({ title: "Painel criado", description: "Agora conecte seu Stripe pra receber pagamentos." });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleStripeOnboard = async () => {
    if (!tenantId) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", {
        body: { tenant_id: tenantId },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      toast({ title: "Erro Stripe", description: e.message, variant: "destructive" });
      setBusy(false);
    }
  };

  const syncStripe = async (id: string) => {
    const { data } = await supabase.functions.invoke("stripe-connect-status", {
      body: { tenant_id: id },
    });
    if (data?.completed) {
      setStripeStatus(data);
      setStep("pending");
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-background">Carregando...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-8">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <Logo />
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-12 md:px-8">
        <h1 className="font-display text-4xl uppercase md:text-5xl">Seja um coach Elite</h1>
        <p className="mt-2 text-muted-foreground">
          Cadastre seu painel, conecte seu Stripe e receba 90% de cada assinatura. Plataforma fica com 10%.
        </p>

        {/* Steps indicator */}
        <div className="my-8 flex items-center gap-2 text-xs">
          {(["signup", "form", "stripe", "pending"] as const).map((s, i) => {
            const active = step === s;
            const done = ["signup", "form", "stripe", "pending"].indexOf(step) > i;
            return (
              <div key={s} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                    active || done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                  }`}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                {i < 3 && <div className={`h-px flex-1 ${done ? "bg-primary" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-8">
          {step === "signup" && !user && (
            <form onSubmit={handleSignup} className="space-y-4">
              <h2 className="font-display text-2xl uppercase">1. Crie sua conta</h2>
              <div>
                <Label>Nome completo</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label>Senha</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" disabled={busy} className="w-full bg-primary hover:bg-primary/90">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Já tem conta? <Link to="/login" className="text-primary">Entrar</Link>
              </p>
            </form>
          )}

          {step === "form" && (
            <form onSubmit={handleCreateTenant} className="space-y-4">
              <h2 className="font-display text-2xl uppercase">2. Configure seu painel</h2>
              <div>
                <Label>Nome do painel</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Pikachu Team" required />
              </div>
              <div>
                <Label>Slug (URL única)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">alphacoach.app/</span>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="pikachuteam"
                    required
                    pattern="[a-z0-9-]+"
                  />
                </div>
              </div>
              <div>
                <Label>Tagline</Label>
                <Input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Hipertrofia & Estética"
                />
              </div>
              <div>
                <Label>Especialidades (separadas por vírgula)</Label>
                <Input
                  value={especialidades}
                  onChange={(e) => setEspecialidades(e.target.value)}
                  placeholder="Hipertrofia, Emagrecimento, Performance"
                />
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />
              </div>
              <Button type="submit" disabled={busy} className="w-full bg-primary hover:bg-primary/90">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar"}
              </Button>
            </form>
          )}

          {step === "stripe" && (
            <div className="space-y-6 text-center">
              <h2 className="font-display text-2xl uppercase">3. Conecte seu Stripe</h2>
              <p className="text-muted-foreground">
                Crie sua conta Stripe Express em ~3 minutos. É como você vai receber 90% de cada assinatura,
                direto na sua conta bancária.
              </p>
              <Button
                onClick={handleStripeOnboard}
                disabled={busy}
                size="lg"
                className="bg-primary hover:bg-primary/90"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Conectar Stripe <ExternalLink className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => tenantId && syncStripe(tenantId)} className="w-full">
                Já completei — verificar status
              </Button>
            </div>
          )}

          {step === "pending" && (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
              <h2 className="font-display text-2xl uppercase">Pronto! Aguardando aprovação</h2>
              <p className="text-muted-foreground">
                Seu painel <span className="font-mono text-primary">/{slug}</span> está em análise.
                Você receberá um email assim que for aprovado e poderá receber alunos.
              </p>
              <Link to="/"><Button variant="outline">Voltar ao marketplace</Button></Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
