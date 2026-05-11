import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/contexts/BrandingProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Play } from "lucide-react";
import { extractYouTubeId, isDirectVideo } from "@/lib/utils";
import { calcBodyFatUSNavy, calcIMC } from "@/lib/body-metrics";
import heroDefault from "@/assets/hero-default.jpg";

type Sexo = "M" | "F";

const dias = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export default function Onboarding() {
  const { user, isLoading } = useAuth();
  const { tenant } = useBranding();
  const navigate = useNavigate();
  const { slug } = useParams();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);

  // Step 1 — Perfil
  const [nome, setNome] = useState("");
  const [sexo, setSexo] = useState<Sexo>("M");
  const [dataNasc, setDataNasc] = useState("");
  const [telefone, setTelefone] = useState("");

  // Step 2 — Anamnese
  const [doencas, setDoencas] = useState("");
  const [medicamentos, setMedicamentos] = useState("");
  const [lesoes, setLesoes] = useState("");
  const [sono, setSono] = useState([7]);
  const [estresse, setEstresse] = useState([5]);
  const [tabagismo, setTabagismo] = useState(false);
  const [alcool, setAlcool] = useState("nao");
  const [suplementos, setSuplementos] = useState("");
  const [restricoes, setRestricoes] = useState("");
  const [refeicoes, setRefeicoes] = useState("4");
  const [aguaLitros, setAguaLitros] = useState("2");
  const [anosTreino, setAnosTreino] = useState("0");
  const [diasDisponiveis, setDiasDisponiveis] = useState<string[]>([]);
  const [nivelExperiencia, setNivelExperiencia] = useState("Iniciante");
  const [fazUsoErgogenicos, setFazUsoErgogenicos] = useState(false);
  const [detalhesErgogenicos, setDetalhesErgogenicos] = useState("");

  // Step 3 — Avaliação
  const [pesoKg, setPesoKg] = useState("");
  const [alturaCm, setAlturaCm] = useState("");
  const [pescocoCm, setPescocoCm] = useState("");
  const [cinturaCm, setCinturaCm] = useState("");
  const [quadrilCm, setQuadrilCm] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    void loadProfile();
  }, [user, isLoading]);

  const loadProfile = async () => {
    if (!user) return;

    // Coaches NÃO passam pelo onboarding de aluno
    const isCoachSignup = (user.user_metadata as any)?.is_coach === true;
    const { data: ownedTenant } = await supabase
      .from("tenants")
      .select("slug")
      .eq("owner_user_id", user.id)
      .maybeSingle();
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isCoach = isCoachSignup || !!ownedTenant || roles?.some((r) => r.role === "coach");
    if (isCoach) {
      if (ownedTenant?.slug) {
        navigate(`/${ownedTenant.slug}/admin`, { replace: true });
      } else {
        navigate("/seja-coach", { replace: true });
      }
      return;
    }

    const { data: perfil } = await supabase
      .from("perfis")
      .select("nome_completo, tenant_id, onboarding_completo")
      .eq("id", user.id)
      .maybeSingle();

    const { count: anamneseCount } = await supabase
      .from("anamnese_aluno")
      .select("id", { count: 'exact', head: true })
      .eq("aluno_id", user.id);

    const { count: avaliacaoCount } = await supabase
      .from("avaliacoes_fisicas")
      .select("id", { count: 'exact', head: true })
      .eq("aluno_id", user.id);

    if (perfil?.onboarding_completo && anamneseCount && avaliacaoCount) {
      const { data: t } = perfil.tenant_id
        ? await supabase.from("tenants").select("slug").eq("id", perfil.tenant_id).maybeSingle()
        : { data: null };
      navigate(t?.slug ? `/${t.slug}/app` : "/");
      return;
    }
    setNome(perfil?.nome_completo ?? "");
    setTenantId(perfil?.tenant_id ?? null);
    if (perfil?.tenant_id) {
      const { data: t } = await supabase.from("tenants").select("slug").eq("id", perfil.tenant_id).maybeSingle();
      setTenantSlug(t?.slug ?? null);
    }
  };

  const bf =
    pesoKg && alturaCm && pescocoCm && cinturaCm
      ? calcBodyFatUSNavy({
          sexo,
          altura_cm: Number(alturaCm),
          pescoco_cm: Number(pescocoCm),
          cintura_cm: Number(cinturaCm),
          quadril_cm: quadrilCm ? Number(quadrilCm) : undefined,
        })
      : null;
  const imc = pesoKg && alturaCm ? calcIMC(Number(pesoKg), Number(alturaCm)) : null;

  const toggleDia = (d: string) =>
    setDiasDisponiveis((arr) => (arr.includes(d) ? arr.filter((x) => x !== d) : [...arr, d]));

  const handleFinish = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const peso = Number(pesoKg);
      const alt = Number(alturaCm);
      const massaGorda = bf && peso ? +(peso * (bf / 100)).toFixed(2) : null;
      const massaMagra = bf && peso ? +(peso - (massaGorda ?? 0)).toFixed(2) : null;

      // 1. Atualiza perfil
      await supabase
        .from("perfis")
        .update({
          nome_completo: nome,
          telefone,
          data_nascimento: dataNasc || null,
          sexo,
          onboarding_completo: true,
        })
        .eq("id", user.id);

      // 2. Salva anamnese
      await supabase.from("anamnese_aluno").upsert(
        {
          aluno_id: user.id,
          tenant_id: tenantId,
          doencas: doencas.split(",").map((s) => s.trim()).filter(Boolean),
          medicamentos,
          lesoes_atuais: lesoes,
          qualidade_sono: sono[0],
          horas_sono: sono[0],
          nivel_estresse: estresse[0],
          tabagismo,
          alcool,
          suplementos: suplementos.split(",").map((s) => s.trim()).filter(Boolean),
          restricoes_alimentares: restricoes.split(",").map((s) => s.trim()).filter(Boolean),
          refeicoes_dia: Number(refeicoes),
          agua_litros: Number(aguaLitros),
          anos_treino: Number(anosTreino),
          disponibilidade_dias: diasDisponiveis,
          nivel_experiencia: nivelExperiencia,
          faz_uso_ergogenicos: fazUsoErgogenicos,
          detalhes_ergogenicos: detalhesErgogenicos,
        },
        { onConflict: "aluno_id" }
      );

      // Também atualiza na tabela alunos para compatibilidade
      await supabase.from("alunos").update({
        nivel_experiencia: nivelExperiencia,
      }).eq("id", user.id);

      // 3. Salva avaliação física
      await supabase.from("avaliacoes_fisicas").insert({
        aluno_id: user.id,
        tenant_id: tenantId,
        peso_kg: peso,
        altura_cm: alt,
        pescoco_cm: Number(pescocoCm),
        cintura_cm: Number(cinturaCm),
        quadril_cm: quadrilCm ? Number(quadrilCm) : null,
        bf_pct_calculado: bf,
        imc,
        massa_magra_kg: massaMagra,
        massa_gorda_kg: massaGorda,
      });

      // Salva também resumo em perfis_treino para compat
      await supabase.from("perfis_treino").upsert(
        {
          aluno_id: user.id,
          tenant_id: tenantId!,
          sexo,
          peso_kg: peso,
          altura_cm: alt,
          bf_pct: bf,
        } as any,
        { onConflict: "aluno_id" } as any
      );

      toast({ title: "Tudo pronto!", description: "Bem-vindo ao seu painel." });
      navigate(tenantSlug ? `/${tenantSlug}/app` : "/");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-black">Carregando...</div>;

  const bgImage = tenant?.hero_url || heroDefault;
  const isVideo = isDirectVideo(bgImage) || extractYouTubeId(bgImage);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-black selection:bg-primary selection:text-white">
      {/* Background Layer */}
      {isVideo ? (
        <div className="absolute inset-0 w-full h-full overflow-hidden opacity-40 blur-[2px] scale-110 transition-all duration-1000">
          {extractYouTubeId(bgImage) ? (
            <iframe
              src={`https://www.youtube.com/embed/${extractYouTubeId(bgImage)}?autoplay=1&mute=1&loop=1&playlist=${extractYouTubeId(bgImage)}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1`}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              allow="autoplay; encrypted-media"
            />
          ) : (
            <video
              src={bgImage}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </div>
      ) : (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-110 blur-[2px] opacity-40 transition-all duration-1000"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,transparent_0%,rgba(0,0,0,0.8)_100%)]" />

      <div className="relative w-full max-w-2xl py-8 z-10">
        <div className="flex justify-center mb-8 animate-in fade-in zoom-in duration-700">
          <Logo withText={true} />
        </div>

        {/* Stepper */}
        <div className="mb-8 px-4 md:px-0">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
            <span>ETAPA {step} DE 3</span>
            <span className="text-muted-foreground/60">{Math.round((step / 3) * 100)}% CONCLUÍDO</span>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  step >= n ? "bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" : "bg-white/10"
                }`}
              />
            ))}
          </div>
          <h1 className="mt-6 font-display text-4xl uppercase md:text-5xl tracking-tight text-white drop-shadow-2xl">
            {step === 1 && "Seu perfil"}
            {step === 2 && "Anamnese"}
            {step === 3 && "Avaliação física"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground/80 font-medium">
            {step === 1 && "Pra começarmos, conte um pouco sobre você."}
            {step === 2 && "Nos ajude a entender sua saúde, hábitos e rotina."}
            {step === 3 && "Suas medidas atuais. Calculamos seu % de gordura na hora."}
          </p>
        </div>

        <div className="glass-card rounded-3xl border border-white/10 bg-black/60 backdrop-blur-2xl p-6 md:p-10 shadow-2xl ring-1 ring-white/10 animate-in slide-in-from-bottom-4 duration-700">
          <style>
            {`
              .glass-card input, .glass-card textarea, .glass-card select, .glass-card button[role="combobox"] {
                background-color: rgba(255, 255, 255, 0.05) !important;
                border-color: rgba(255, 255, 255, 0.1) !important;
                color: white !important;
              }
              .glass-card input:focus, .glass-card textarea:focus {
                border-color: hsl(var(--primary) / 0.5) !important;
                background-color: rgba(255, 255, 255, 0.08) !important;
              }
              .glass-card label {
                color: rgba(255, 255, 255, 0.6) !important;
                text-transform: uppercase;
                font-size: 0.7rem;
                letter-spacing: 0.1em;
                font-weight: 700;
                margin-bottom: 0.5rem;
                display: block;
              }
            `}
          </style>
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Nome completo</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
              </div>
              <div>
                <Label>Sexo biológico</Label>
                <Select value={sexo} onValueChange={(v: Sexo) => setSexo(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data de nascimento</Label>
                <Input type="date" value={dataNasc} onChange={(e) => setDataNasc(e.target.value)} />
              </div>
              <div>
                <Label>Telefone (WhatsApp)</Label>
                <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-6">
              <section className="space-y-3">
                <h3 className="font-display text-lg uppercase text-primary">Saúde</h3>
                <div>
                  <Label>Doenças (separadas por vírgula)</Label>
                  <Input value={doencas} onChange={(e) => setDoencas(e.target.value)} placeholder="Hipertensão, diabetes..." />
                </div>
                <div>
                  <Label>Medicamentos em uso</Label>
                  <Textarea value={medicamentos} onChange={(e) => setMedicamentos(e.target.value)} rows={2} />
                </div>
                <div>
                  <Label>Lesões atuais</Label>
                  <Textarea value={lesoes} onChange={(e) => setLesoes(e.target.value)} rows={2} />
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="font-display text-lg uppercase text-primary">Hábitos</h3>
                <div>
                  <Label>Horas de sono por noite: {sono[0]}h</Label>
                  <Slider value={sono} onValueChange={setSono} min={3} max={12} step={1} />
                </div>
                <div>
                  <Label>Nível de estresse: {estresse[0]}/10</Label>
                  <Slider value={estresse} onValueChange={setEstresse} min={1} max={10} step={1} />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={tabagismo} onCheckedChange={(v) => setTabagismo(!!v)} id="fumo" />
                  <Label htmlFor="fumo">Fumo regularmente</Label>
                </div>
                <div>
                  <Label>Consumo de álcool</Label>
                  <Select value={alcool} onValueChange={setAlcool}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nao">Não bebo</SelectItem>
                      <SelectItem value="social">Social (fim de semana)</SelectItem>
                      <SelectItem value="frequente">Frequente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="font-display text-lg uppercase text-primary">Nutrição</h3>
                <div>
                  <Label>Suplementos (separados por vírgula)</Label>
                  <Input value={suplementos} onChange={(e) => setSuplementos(e.target.value)} placeholder="Whey, creatina..." />
                </div>
                <div>
                  <Label>Restrições alimentares</Label>
                  <Input value={restricoes} onChange={(e) => setRestricoes(e.target.value)} placeholder="Lactose, glúten..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Refeições/dia</Label>
                    <Input type="number" value={refeicoes} onChange={(e) => setRefeicoes(e.target.value)} min={1} max={10} />
                  </div>
                  <div>
                    <Label>Água (litros/dia)</Label>
                    <Input type="number" value={aguaLitros} onChange={(e) => setAguaLitros(e.target.value)} step={0.5} />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="font-display text-lg uppercase text-primary">Treino & Experiência</h3>
                <div>
                  <Label>Nível de Experiência</Label>
                  <Select value={nivelExperiencia} onValueChange={setNivelExperiencia}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Iniciante">Iniciante</SelectItem>
                      <SelectItem value="Intermediário">Intermediário</SelectItem>
                      <SelectItem value="Avançado">Avançado</SelectItem>
                      <SelectItem value="Atleta de Alto Nível">Atleta de Alto Nível</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {["Intermediário", "Avançado", "Atleta de Alto Nível"].includes(nivelExperiencia) && (
                  <div className="space-y-3 border-l-2 border-primary/20 pl-4 pt-2">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={fazUsoErgogenicos} 
                        onCheckedChange={(v) => setFazUsoErgogenicos(!!v)} 
                        id="hormonios" 
                      />
                      <Label htmlFor="hormonios" className="leading-tight cursor-pointer">
                        Você faz uso ou pretende fazer uso de recursos ergogênicos/hormônios?
                      </Label>
                    </div>
                    
                    {fazUsoErgogenicos && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <Label>Liste o que usa ou qual é o seu objetivo com o uso</Label>
                        <Textarea 
                          value={detalhesErgogenicos} 
                          onChange={(e) => setDetalhesErgogenicos(e.target.value)} 
                          placeholder="Ex: Ciclo de durateston 250mg/semana, ou Objetivo de ganho de massa bruto..."
                          rows={3}
                          className="mt-1 bg-background/50"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label>Anos de treino</Label>
                  <Input type="number" value={anosTreino} onChange={(e) => setAnosTreino(e.target.value)} step={0.5} min={0} />
                </div>
                <div>
                  <Label>Dias disponíveis para treinar</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {dias.map((d) => {
                      const sel = diasDisponiveis.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDia(d)}
                          className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                            sel
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card hover:border-primary/40"
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Peso (kg)</Label>
                  <Input type="number" step={0.1} value={pesoKg} onChange={(e) => setPesoKg(e.target.value)} required />
                </div>
                <div>
                  <Label>Altura (cm)</Label>
                  <Input type="number" step={0.1} value={alturaCm} onChange={(e) => setAlturaCm(e.target.value)} required />
                </div>
                <div>
                  <Label>Pescoço (cm)</Label>
                  <Input type="number" step={0.1} value={pescocoCm} onChange={(e) => setPescocoCm(e.target.value)} required />
                </div>
                <div>
                  <Label>Cintura (cm)</Label>
                  <Input type="number" step={0.1} value={cinturaCm} onChange={(e) => setCinturaCm(e.target.value)} required />
                </div>
                {sexo === "F" && (
                  <div className="col-span-2">
                    <Label>Quadril (cm)</Label>
                    <Input type="number" step={0.1} value={quadrilCm} onChange={(e) => setQuadrilCm(e.target.value)} required />
                  </div>
                )}
              </div>

              {(bf || imc) && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
                  <p className="mb-2 text-xs uppercase tracking-wider text-primary">Cálculo automático</p>
                  <div className="grid grid-cols-2 gap-4">
                    {bf !== null && (
                      <div>
                        <p className="text-xs text-muted-foreground">% Gordura (US Navy)</p>
                        <p className="font-display text-3xl">{bf?.toFixed(1)}%</p>
                      </div>
                    )}
                    {imc !== null && (
                      <div>
                        <p className="text-xs text-muted-foreground">IMC</p>
                        <p className="font-display text-3xl">{imc?.toFixed(1)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nav */}
        <div className="mt-8 flex items-center justify-between px-4 md:px-0">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || busy}
            className="text-white hover:bg-white/10 disabled:opacity-30 h-12 px-6 rounded-xl"
          >
            <ArrowLeft className="mr-2 h-5 w-5" /> Voltar
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)} className="bg-gradient-primary shadow-glow hover:scale-[1.02] transition-transform h-12 px-8 rounded-xl font-bold text-base uppercase tracking-wider">
              Continuar <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={busy || !pesoKg || !alturaCm} className="bg-gradient-primary shadow-glow hover:scale-[1.02] transition-transform h-12 px-8 rounded-xl font-bold text-base uppercase tracking-wider">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Concluir <CheckCircle2 className="ml-2 h-5 w-5" /></>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
