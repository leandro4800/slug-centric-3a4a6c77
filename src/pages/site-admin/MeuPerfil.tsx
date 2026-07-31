import { useEffect, useState } from "react";
import { UserCog, Loader2, Ruler, Heart, Save } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AnamneseDetails } from "@/components/aluno/AnamneseDetails";
import { ComprehensiveEvaluationForm } from "@/components/aluno/ComprehensiveEvaluationForm";

const EMPTY_ANAMNESE = {
  doencas: [], medicamentos: null, lesoes_atuais: null,
  horas_sono: null, qualidade_sono: null, nivel_estresse: null,
  tabagismo: null, alcool: null, suplementos: [], restricoes_alimentares: [],
  refeicoes_dia: null, agua_litros: null, anos_treino: null,
  disponibilidade_dias: [], nivel_experiencia: null, faz_uso_ergogenicos: null,
  detalhes_ergogenicos: null, historico_familiar: null, cirurgias: null,
  alimentos_ama: null, alimentos_evita: null, modalidades_anteriores: [], tempo_recuperacao: null,
} as any;

const MeuPerfil = () => {
  const { user } = useAuth();
  const { tenant } = useSiteTenant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNasc, setDataNasc] = useState("");
  const [sexo, setSexo] = useState<string>("M");

  const [anamnese, setAnamnese] = useState<any>(EMPTY_ANAMNESE);
  const [hasAnamnese, setHasAnamnese] = useState(false);

  const [avalOpen, setAvalOpen] = useState(false);
  const [lastAval, setLastAval] = useState<any>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: perfil }, { data: anam }, { data: aval }] = await Promise.all([
      supabase.from("perfis").select("nome_completo, telefone, data_nascimento, sexo").eq("id", user.id).maybeSingle(),
      supabase.from("anamnese_aluno").select("*").eq("aluno_id", user.id).maybeSingle(),
      supabase.from("avaliacoes_fisicas").select("*").eq("aluno_id", user.id).order("data", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setNome(perfil?.nome_completo || "");
    setTelefone(perfil?.telefone || "");
    setDataNasc(perfil?.data_nascimento || "");
    setSexo(perfil?.sexo || "M");
    setAnamnese(anam || EMPTY_ANAMNESE);
    setHasAnamnese(!!anam);
    setLastAval(aval || null);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user?.id]);

  const saveDados = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("perfis").update({
      nome_completo: nome || null,
      telefone: telefone || null,
      data_nascimento: dataNasc || null,
      sexo,
    }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Dados salvos");
  };

  const createEmptyAnamnese = async () => {
    if (!user || !tenant) return;
    const { error } = await supabase.from("anamnese_aluno").insert({
      aluno_id: user.id,
      tenant_id: tenant.id,
      doencas: [],
      suplementos: [],
      restricoes_alimentares: [],
      disponibilidade_dias: [],
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Anamnese criada — pode preencher agora");
    void load();
  };

  return (
    <div className="min-h-screen bg-black px-5 md:px-8 pt-6 pb-32">
      <div className="flex items-center gap-2 text-primary/80">
        <UserCog className="h-4 w-4" />
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Meu perfil</span>
      </div>
      <h1 className="font-display text-4xl mt-2 text-white leading-tight">DADOS DO COACH</h1>
      <p className="text-sm text-muted-foreground mt-2 mb-6">
        Preencha suas informações pessoais, anamnese e avaliação física. Personalize também a página pública do seu time.
      </p>
      <div className="h-px bg-primary/20 mb-6" />

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="dados" className="space-y-4">
          <TabsList>
            <TabsTrigger value="dados"><UserCog className="h-4 w-4 mr-2" /> Dados pessoais</TabsTrigger>
            <TabsTrigger value="anamnese"><Heart className="h-4 w-4 mr-2" /> Anamnese</TabsTrigger>
            <TabsTrigger value="avaliacao"><Ruler className="h-4 w-4 mr-2" /> Avaliação física</TabsTrigger>
          </TabsList>

          <TabsContent value="dados">
            <div className="bg-black/60 border border-white/10 rounded-2xl p-6 space-y-4 max-w-2xl">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome completo</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone (WhatsApp)</Label>
                  <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
                </div>
                <div className="space-y-2">
                  <Label>Data de nascimento</Label>
                  <Input type="date" value={dataNasc || ""} onChange={(e) => setDataNasc(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Sexo biológico</Label>
                  <Select value={sexo} onValueChange={setSexo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={saveDados} disabled={saving} className="bg-gradient-primary">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Salvar dados
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="anamnese">
            <div className="bg-black/60 border border-white/10 rounded-2xl p-6">
              {!hasAnamnese ? (
                <div className="text-center space-y-3 py-6">
                  <p className="text-muted-foreground">Você ainda não preencheu sua anamnese.</p>
                  <Button onClick={createEmptyAnamnese} className="bg-gradient-primary">
                    Iniciar preenchimento
                  </Button>
                </div>
              ) : (
                <AnamneseDetails
                  data={anamnese}
                  alunoId={user?.id}
                  editable
                  onSaved={(updated) => { setAnamnese(updated); toast.success("Anamnese atualizada"); }}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="avaliacao">
            <div className="bg-black/60 border border-white/10 rounded-2xl p-6 space-y-4">
              {lastAval ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-muted-foreground text-xs uppercase">Peso</p><p className="font-display text-2xl">{lastAval.peso_kg} kg</p></div>
                  <div><p className="text-muted-foreground text-xs uppercase">Altura</p><p className="font-display text-2xl">{lastAval.altura_cm} cm</p></div>
                  {lastAval.bf_pct_calculado != null && <div><p className="text-muted-foreground text-xs uppercase">% Gordura</p><p className="font-display text-2xl">{Number(lastAval.bf_pct_calculado).toFixed(1)}%</p></div>}
                  {lastAval.imc != null && <div><p className="text-muted-foreground text-xs uppercase">IMC</p><p className="font-display text-2xl">{Number(lastAval.imc).toFixed(1)}</p></div>}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Nenhuma avaliação registrada.</p>
              )}
              <Button onClick={() => setAvalOpen(true)} className="bg-gradient-primary">
                <Ruler className="h-4 w-4 mr-2" /> {lastAval ? "Nova avaliação" : "Registrar avaliação"}
              </Button>
              <ComprehensiveEvaluationForm
                open={avalOpen}
                onOpenChange={setAvalOpen}
                alunoId={user?.id || ""}
                tenantId={tenant?.id}
                sexo={sexo}
                onSaved={() => { setAvalOpen(false); void load(); }}
              />
            </div>
          </TabsContent>


        </Tabs>
      )}
    </div>
  );
};

export default MeuPerfil;
