import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { calcBodyFatUSNavy, calcIMC } from "@/lib/body-metrics";

type Sexo = "M" | "F";

const dias = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export default function Onboarding() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
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
    const { data: perfil } = await supabase
      .from("perfis")
      .select("nome_completo, tenant_id, onboarding_completo")
      .eq("id", user.id)
      .maybeSingle();
    if (perfil?.onboarding_completo) {
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

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-background">Carregando...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
        {/* Stepper */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            Etapa {step} de 3
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  step >= n ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>
          <h1 className="mt-4 font-display text-3xl uppercase md:text-4xl">
            {step === 1 && "Seu perfil"}
            {step === 2 && "Anamnese"}
            {step === 3 && "Avaliação física"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === 1 && "Pra começarmos, conte um pouco sobre você."}
            {step === 2 && "Nos ajude a entender sua saúde, hábitos e rotina."}
            {step === 3 && "Suas medidas atuais. Calculamos seu % de gordura na hora."}
          </p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8">
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
                <h3 className="font-display text-lg uppercase text-primary">Treino</h3>
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
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || busy}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)} className="bg-primary hover:bg-primary/90">
              Continuar <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={busy || !pesoKg || !alturaCm} className="bg-primary hover:bg-primary/90">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Concluir <CheckCircle2 className="ml-2 h-4 w-4" /></>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
