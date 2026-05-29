import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/Logo";
import { ArrowLeft, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { buildAuthRedirectUrl } from "@/lib/app-url";
import { CoachQuiz, type QuizAnswers } from "@/components/coach/CoachQuiz";
import { CoachPlanSelector, COACH_PLANS, type CoachPlanTier } from "@/components/coach/CoachPlanSelector";

type Step = "welcome" | "quiz" | "plans" | "signup" | "verify-email" | "personal" | "tenant" | "checkout" | "pending";
const STEPS: Step[] = ["welcome", "quiz", "plans", "personal", "tenant", "checkout", "pending"];

export default function SejaCoach() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("quiz");
  const [busy, setBusy] = useState(false);
  const [quiz, setQuiz] = useState<QuizAnswers | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<CoachPlanTier | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  // signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
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

  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (user) void loadExisting();
  }, [user, isLoading]);

  const loadExisting = async () => {
    if (!user) return;

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
      setStep("pending");
    } else {
      setStep(perfil?.telefone ? "tenant" : "personal");
    }
  };

  const handleQuizComplete = (answers: QuizAnswers) => {
    setQuiz(answers);
    setSelectedPlan(answers.plano_recomendado);
    setStep("plans");
  };

  const handleSelectPlan = (planId: CoachPlanTier) => {
    setSelectedPlan(planId);
    setStep(user ? "personal" : "signup");
  };

  const handleStartCheckout = async () => {
    if (!user || !selectedPlan) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("coach-platform-checkout", {
        body: { plan_tier: selectedPlan, nome, telefone },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Falha no checkout");
      if (data.payment_url) {
        setCheckoutUrl(data.payment_url);
        window.open(data.payment_url, "_blank");
      } else {
        toast({ title: "Assinatura criada", description: "Aguardando link de pagamento do Asaas." });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };


  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data: exists, error: checkErr } = await supabase.rpc("email_is_registered", { _email: cleanEmail });
      if (checkErr) throw checkErr;
      if (exists) {
        toast({ title: "E-mail já cadastrado", description: "Faça login para continuar.", variant: "destructive" });
        navigate(`/login?redirect=/seja-coach`);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { nome_completo: nome, is_coach: true },
          emailRedirectTo: buildAuthRedirectUrl("/seja-coach", { confirmed: "1" }),
        },
      });
      if (error) throw error;
      
      if (!data?.session) {
        setStep("verify-email");
        toast({ title: "Confirme seu e-mail", description: "Enviamos um link para o seu e-mail." });
        return;
      }
      toast({ title: "Conta criada!" });
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
        .update({ nome_completo: nome, telefone, onboarding_completo: true })
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
      const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      if (!cleanSlug) throw new Error("Slug inválido");
      const especArr = especialidades.split(",").map((s) => s.trim()).filter(Boolean);

      let currentTenantId = tenantId;
      if (currentTenantId) {
        const { error } = await supabase.from("tenants").update({
          slug: cleanSlug, nome: nomePainel, tagline, bio, especialidades: especArr, cidade, estado: estado.toUpperCase(),
        }).eq("id", currentTenantId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("tenants").insert({
          slug: cleanSlug, nome: nomePainel, tagline, bio, especialidades: especArr, cidade, estado: estado.toUpperCase(),
          owner_user_id: user.id, status: "pending",
        }).select().single();
        if (error) throw error;
        currentTenantId = data.id;
        await supabase.from("user_roles").insert({ user_id: user.id, role: "coach" as any, tenant_id: data.id });
      }
      setTenantId(currentTenantId);
      setStep(selectedPlan ? "checkout" : "pending");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-background text-white font-display uppercase tracking-widest">Carregando...</div>;
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
        <h1 className="font-display text-4xl uppercase md:text-5xl tracking-tighter italic">Seja um coach <span className="text-primary">ALPHA</span></h1>
        <p className="mt-2 text-muted-foreground uppercase tracking-widest text-[10px] font-bold">
          Cadastre seu painel e comece a gerenciar seus atletas agora mesmo.
        </p>

        <div className="my-8 flex items-center gap-2 text-xs">
          {STEPS.slice(0, 4).map((s, i) => {
            const active = step === s;
            const done = stepIndex > i;
            return (
              <div key={s} className="flex flex-1 items-center gap-2">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${active || done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
                  {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                {i < 3 && <div className={`h-px flex-1 ${done ? "bg-primary" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-8">
          {step === "quiz" && (
            <CoachQuiz email={user?.email ?? null} userId={user?.id ?? null} onComplete={handleQuizComplete} />
          )}

          {step === "plans" && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="font-display text-2xl uppercase italic">Escolha seu plano Alpha</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  {quiz ? "Com base nas suas respostas, recomendamos:" : "Selecione a melhor opção para sua escala."}
                </p>
              </div>
              <CoachPlanSelector recommended={selectedPlan ?? undefined} onSelect={handleSelectPlan} />
            </div>
          )}

          {step === "checkout" && selectedPlan && (
            <div className="space-y-6 text-center">
              <h2 className="font-display text-2xl uppercase italic">Finalizar assinatura</h2>
              <div className="rounded-2xl border border-primary/40 bg-primary/5 p-5 text-left">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Plano selecionado</p>
                <p className="mt-1 text-lg font-black">{COACH_PLANS.find((p) => p.id === selectedPlan)?.name}</p>
                <p className="mt-2 text-sm">
                  Hoje: <span className="font-black text-primary">R$ 1,00</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Depois R$ {COACH_PLANS.find((p) => p.id === selectedPlan)?.full.toFixed(2).replace(".", ",")} / mês — cancele quando quiser.
                </p>
              </div>
              {!checkoutUrl ? (
                <Button onClick={handleStartCheckout} disabled={busy} className="w-full font-black uppercase tracking-widest">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pagar R$ 1,00 (Asaas)"}
                </Button>
              ) : (
                <div className="space-y-3">
                  <a href={checkoutUrl} target="_blank" rel="noreferrer">
                    <Button className="w-full font-black uppercase tracking-widest">
                      Abrir pagamento <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                  <p className="text-xs text-muted-foreground">Conclua o pagamento no Asaas. Após confirmação, seu painel será liberado.</p>
                </div>
              )}
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Pagamento processado por Asaas. Cartão, Pix ou Boleto.
              </p>
            </div>
          )}


          {step === "signup" && !user && (
            <form onSubmit={handleSignup} className="space-y-4">
              <h2 className="font-display text-2xl uppercase italic">1. Crie sua conta</h2>
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
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "CRIAR CONTA ALPHA"}
              </Button>
            </form>
          )}

          {step === "verify-email" && !user && (
            <form className="space-y-4 text-center" onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: otpCode.trim(), type: "email" });
                if (error) throw error;
                toast({ title: "E-mail confirmado!" });
              } catch (err: any) {
                toast({ title: "Código inválido", description: err.message, variant: "destructive" });
              } finally { setBusy(false); }
            }}>
              <h2 className="font-display text-2xl uppercase italic">Confirme seu e-mail</h2>
              <p className="text-sm text-muted-foreground">Enviamos um código para {email}.</p>
              <Input value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric" maxLength={6} className="text-center text-2xl tracking-[0.5em] font-mono" required />
              <Button type="submit" disabled={busy || otpCode.length !== 6} className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "CONFIRMAR CÓDIGO"}
              </Button>
            </form>
          )}

          {step === "personal" && (
            <form onSubmit={handleSavePersonal} className="space-y-4">
              <h2 className="font-display text-2xl uppercase italic">2. Seus dados pessoais</h2>
              <div>
                <Label>Nome completo</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
              </div>
              <div>
                <Label>Telefone (WhatsApp)</Label>
                <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" required />
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "CONTINUAR"}
              </Button>
            </form>
          )}

          {step === "tenant" && (
            <form onSubmit={handleCreateTenant} className="space-y-4">
              <h2 className="font-display text-2xl uppercase italic">3. Configure seu painel</h2>
              <div>
                <Label>Nome da sua marca / Consultoria</Label>
                <Input value={nomePainel} onChange={(e) => setNomePainel(e.target.value)} placeholder="Ex: TEAM ALPHA" required />
              </div>
              <div>
                <Label>Slug (URL única)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">alpha-coach.app/</span>
                  <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="teamalpha" required pattern="[a-z0-9-]+" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cidade</Label>
                  <Input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Ex: Vitória" required />
                </div>
                <div>
                  <Label>Estado (UF)</Label>
                  <Input value={estado} onChange={(e) => setEstado(e.target.value)} placeholder="Ex: ES" maxLength={2} required />
                </div>
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "FINALIZAR CADASTRO"}
              </Button>
            </form>
          )}

          {step === "pending" && (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
              <h2 className="font-display text-2xl uppercase italic">Quase lá!</h2>
              <p className="text-sm text-muted-foreground">
                Seu painel <span className="font-mono text-primary">/{slug}</span> está em análise pela equipe.
                Você receberá um e-mail em instantes informando a aprovação.
              </p>
              <Link to="/"><Button variant="outline" className="w-full uppercase font-bold tracking-widest">VOLTAR AO INÍCIO</Button></Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
