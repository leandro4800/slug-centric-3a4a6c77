import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/Logo";
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";

type Step = "signup" | "personal" | "tenant" | "product" | "stripe" | "pending";
const STEPS: Step[] = ["signup", "personal", "tenant", "product", "stripe", "pending"];

export default function SejaCoach() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("signup");
  const [busy, setBusy] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");

  // personal
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");

  // tenant form
  const [nomePainel, setNomePainel] = useState("");
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [especialidades, setEspecialidades] = useState("");

  // product
  const [planoNome, setPlanoNome] = useState("");
  const [planoDescricao, setPlanoDescricao] = useState("");
  const [planoPreco, setPlanoPreco] = useState("");
  const [planoIntervalo, setPlanoIntervalo] = useState<"mensal" | "trimestral" | "anual">("mensal");

  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (user) void loadExisting();
  }, [user, isLoading]);

  const loadExisting = async () => {
    if (!user) return;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");
    const userIsAdmin = !!roles && roles.length > 0;
    setIsAdmin(userIsAdmin);

    const { data: perfil } = await supabase
      .from("perfis")
      .select("nome_completo, telefone")
      .eq("id", user.id)
      .maybeSingle();

    if (perfil?.nome_completo) setNome(perfil.nome_completo);
    if (perfil?.telefone) setTelefone(perfil.telefone);

    const { data } = await supabase
      .from("tenants")
      .select("id, slug, status, nome, tagline, bio, cidade, estado, especialidades")
      .eq("owner_user_id", user.id)
      .maybeSingle();

    let stripeAccountId: string | null = null;
    let stripeOnboardingCompleted = false;
    let hasPlano = false;
    if (data?.id) {
      const { data: priv } = await supabase
        .from("tenants_private" as any)
        .select("stripe_account_id, stripe_onboarding_completed")
        .eq("tenant_id", data.id)
        .maybeSingle();
      stripeAccountId = (priv as any)?.stripe_account_id ?? null;
      stripeOnboardingCompleted = !!(priv as any)?.stripe_onboarding_completed;

      const { count } = await supabase
        .from("planos")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", data.id);
      hasPlano = (count ?? 0) > 0;
    }

    if (data) {
      setTenantId(data.id);
      setSlug(data.slug);
      setNomePainel(data.nome ?? "");
      setTagline(data.tagline ?? "");
      setBio(data.bio ?? "");
      setCidade(data.cidade ?? "");
      setEstado(data.estado ?? "");
      setEspecialidades((data.especialidades ?? []).join(", "));

      if (data.status === "approved") {
        navigate(`/${data.slug}/admin`);
        return;
      }
      if (stripeOnboardingCompleted) setStep("pending");
      else if (stripeAccountId || hasPlano) setStep("stripe");
      else if (hasPlano) setStep("stripe");
      else setStep("product");
    } else {
      setStep(perfil?.telefone ? "tenant" : "personal");
    }

    if (params.get("completed") === "1" && data?.id) {
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
          data: { nome_completo: nome, is_coach: true },
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

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("perfis")
        .update({
          nome_completo: nome,
          telefone,
          onboarding_completo: true,
        })
        .eq("id", user.id);
      if (error) throw error;
      setStep("tenant");
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

      let currentTenantId = tenantId;
      if (currentTenantId) {
        const { error } = await supabase
          .from("tenants")
          .update({
            slug: cleanSlug,
            nome: nomePainel,
            tagline,
            bio,
            especialidades: especArr,
            cidade,
            estado: estado.toUpperCase(),
          })
          .eq("id", currentTenantId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("tenants")
          .insert({
            slug: cleanSlug,
            nome: nomePainel,
            tagline,
            bio,
            especialidades: especArr,
            cidade,
            estado: estado.toUpperCase(),
            owner_user_id: user.id,
            status: "pending",
          })
          .select()
          .single();
        if (error) throw error;
        currentTenantId = data.id;

        await supabase.from("user_roles").insert({
          user_id: user.id,
          role: "coach" as any,
          tenant_id: data.id,
        });
      }

      setTenantId(currentTenantId);
      setStep("product");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setBusy(true);
    try {
      const preco = Math.round(parseFloat(planoPreco.replace(",", ".")) * 100);
      if (!preco || preco < 100) throw new Error("Valor inválido");

      const { error } = await supabase.from("planos").insert({
        tenant_id: tenantId,
        nome: planoNome,
        descricao: planoDescricao,
        preco_centavos: preco,
        intervalo: planoIntervalo,
        ativo: true,
        ordem: 0,
      });
      if (error) throw error;
      setStep("stripe");
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
    if (data?.completed) setStep("pending");
  };

  if (isLoading)
    return <div className="flex h-screen items-center justify-center bg-background">Carregando...</div>;

  const stepIndex = STEPS.indexOf(step);

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
          Cadastre seu painel, crie sua consultoria e receba 90% de cada assinatura. Plataforma fica com 10%.
        </p>

        {/* Steps indicator */}
        <div className="my-8 flex items-center gap-2 text-xs">
          {STEPS.slice(0, 5).map((s, i) => {
            const active = step === s;
            const done = stepIndex > i;
            return (
              <div key={s} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                    active || done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                  }`}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                {i < 4 && <div className={`h-px flex-1 ${done ? "bg-primary" : "bg-border"}`} />}
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

          {step === "personal" && (
            <form onSubmit={handleSavePersonal} className="space-y-4">
              <h2 className="font-display text-2xl uppercase">2. Seus dados pessoais</h2>
              <p className="text-sm text-muted-foreground">
                Esses dados ficam visíveis apenas para você e a equipe da plataforma.
              </p>
              <div>
                <Label>Nome completo</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
              </div>
              <div>
                <Label>Telefone (WhatsApp)</Label>
                <Input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  required
                />
              </div>
              <Button type="submit" disabled={busy} className="w-full bg-primary hover:bg-primary/90">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar"}
              </Button>
            </form>
          )}

          {step === "tenant" && (
            <form onSubmit={handleCreateTenant} className="space-y-4">
              <h2 className="font-display text-2xl uppercase">3. Configure seu painel</h2>
              <div>
                <Label>Como sua consultoria vai se chamar</Label>
                <Input
                  value={nomePainel}
                  onChange={(e) => setNomePainel(e.target.value)}
                  placeholder="Ex: TEAMLEANDRO"
                  required
                />
              </div>
              <div>
                <Label>Slug (URL única)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">alphacoach.app/</span>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="teamleandro"
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cidade</Label>
                  <Input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Ex: Serra" required />
                </div>
                <div>
                  <Label>Estado (UF)</Label>
                  <Input value={estado} onChange={(e) => setEstado(e.target.value)} placeholder="Ex: ES" maxLength={2} required />
                </div>
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

          {step === "product" && (
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <h2 className="font-display text-2xl uppercase">4. Seu primeiro produto</h2>
              <p className="text-sm text-muted-foreground">
                Crie o plano que seus alunos vão assinar. Você pode adicionar mais depois.
              </p>
              <div>
                <Label>Nome do plano</Label>
                <Input
                  value={planoNome}
                  onChange={(e) => setPlanoNome(e.target.value)}
                  placeholder="Ex: Mentoria Mensal"
                  required
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={planoDescricao}
                  onChange={(e) => setPlanoDescricao(e.target.value)}
                  placeholder="O que está incluso no plano..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor (R$)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={planoPreco}
                    onChange={(e) => setPlanoPreco(e.target.value)}
                    placeholder="297,00"
                    required
                  />
                </div>
                <div>
                  <Label>Período</Label>
                  <Select value={planoIntervalo} onValueChange={(v: any) => setPlanoIntervalo(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={busy} className="w-full bg-primary hover:bg-primary/90">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar"}
              </Button>
            </form>
          )}

          {step === "stripe" && (
            <div className="space-y-6 text-center">
              <h2 className="font-display text-2xl uppercase">5. Conecte seu Stripe</h2>
              <p className="text-muted-foreground">
                Crie sua conta Stripe Express em ~3 minutos. É como você vai receber 90% de cada assinatura,
                direto na sua conta bancária. A confirmação de identidade para saques acontece dentro do painel.
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
              {isAdmin && (
                <Button
                  variant="ghost"
                  onClick={async () => {
                    if (!tenantId) return;
                    setBusy(true);
                    await supabase.from("tenants_private" as any).upsert({ tenant_id: tenantId, stripe_onboarding_completed: true });
                    setStep("pending");
                    setBusy(false);
                    toast({ title: "Stripe ignorado (Admin)" });
                  }}
                  className="w-full text-xs text-muted-foreground"
                >
                  Pular Stripe (Apenas Admin)
                </Button>
              )}
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
