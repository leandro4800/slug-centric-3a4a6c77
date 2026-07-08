import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Swords, Plus, CalendarClock, Scale, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type Aluno = { id: string; nome: string };
type Camp = { id: string; aluno_id: string; nome: string; data_inicio: string; data_luta: string; peso_meta: number | null; modalidade: string | null };
type Sessao = { id: string; camp_id: string | null; aluno_id: string; data: string; tipo: string | null; descricao: string | null; duracao_min: number | null; intensidade: string | null };
type Peso = { id: string; aluno_id: string; data: string; peso: number };

const TIPOS = ["sparring", "tecnica", "fisico", "cardio", "mobilidade", "estrategia"];
const INTENSIDADES = ["leve", "moderado", "forte", "recuperativo"];

const Camps = () => {
  const { tenant } = useSiteTenant();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [selectedAluno, setSelectedAluno] = useState<string>("");
  const [camps, setCamps] = useState<Camp[]>([]);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [pesos, setPesos] = useState<Peso[]>([]);
  const [loading, setLoading] = useState(false);

  const [showCampForm, setShowCampForm] = useState(false);
  const [campForm, setCampForm] = useState({ nome: "", data_inicio: "", data_luta: "", peso_meta: "", modalidade: "" });

  const [sessaoForm, setSessaoForm] = useState({ camp_id: "", data: format(new Date(), "yyyy-MM-dd"), tipo: "tecnica", descricao: "", duracao_min: "", intensidade: "moderado" });

  useEffect(() => {
    if (!tenant?.id) return;
    (async () => {
      const { data } = await supabase.from("alunos").select("id, nome").eq("tenant_id", tenant.id).order("nome");
      setAlunos((data as Aluno[]) ?? []);
    })();
  }, [tenant?.id]);

  const loadAlunoData = async (alunoId: string) => {
    if (!alunoId) return;
    setLoading(true);
    const [c, s, p] = await Promise.all([
      supabase.from("camps_luta").select("*").eq("aluno_id", alunoId).order("data_luta", { ascending: false }),
      supabase.from("sessoes_luta").select("*").eq("aluno_id", alunoId).order("data", { ascending: false }).limit(30),
      supabase.from("peso_diario").select("*").eq("aluno_id", alunoId).order("data", { ascending: false }).limit(30),
    ]);
    setCamps((c.data as Camp[]) ?? []);
    setSessoes((s.data as Sessao[]) ?? []);
    setPesos((p.data as Peso[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { loadAlunoData(selectedAluno); }, [selectedAluno]);

  const campAtivo = useMemo(() => camps.find((c) => new Date(c.data_luta) >= new Date()) ?? camps[0], [camps]);

  const salvarCamp = async () => {
    if (!tenant?.id || !selectedAluno) return;
    if (!campForm.nome || !campForm.data_inicio || !campForm.data_luta) { toast.error("Preencha nome, início e data da luta"); return; }
    const { error } = await supabase.from("camps_luta").insert({
      tenant_id: tenant.id,
      aluno_id: selectedAluno,
      nome: campForm.nome,
      data_inicio: campForm.data_inicio,
      data_luta: campForm.data_luta,
      peso_meta: campForm.peso_meta ? Number(campForm.peso_meta) : null,
      modalidade: campForm.modalidade || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Camp criado");
    setShowCampForm(false);
    setCampForm({ nome: "", data_inicio: "", data_luta: "", peso_meta: "", modalidade: "" });
    loadAlunoData(selectedAluno);
  };

  const removerCamp = async (id: string) => {
    if (!confirm("Remover este camp e todas as sessões?")) return;
    const { error } = await supabase.from("camps_luta").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    loadAlunoData(selectedAluno);
  };

  const salvarSessao = async () => {
    if (!tenant?.id || !selectedAluno) return;
    if (!sessaoForm.data || !sessaoForm.tipo) { toast.error("Preencha data e tipo"); return; }
    const { error } = await supabase.from("sessoes_luta").insert({
      tenant_id: tenant.id,
      aluno_id: selectedAluno,
      camp_id: sessaoForm.camp_id || campAtivo?.id || null,
      data: sessaoForm.data,
      tipo: sessaoForm.tipo,
      descricao: sessaoForm.descricao || null,
      duracao_min: sessaoForm.duracao_min ? Number(sessaoForm.duracao_min) : null,
      intensidade: sessaoForm.intensidade || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Sessão adicionada");
    setSessaoForm({ ...sessaoForm, descricao: "", duracao_min: "" });
    loadAlunoData(selectedAluno);
  };

  const removerSessao = async (id: string) => {
    const { error } = await supabase.from("sessoes_luta").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    loadAlunoData(selectedAluno);
  };

  const diasParaLuta = campAtivo ? differenceInCalendarDays(parseISO(campAtivo.data_luta), new Date()) : null;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <AdminBackButton to="/site/admin/dashboard" />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">CT de Lutas</p>
        <h1 className="font-display text-3xl md:text-4xl uppercase italic tracking-tighter flex items-center gap-3">
          <Swords className="h-7 w-7 text-primary" /> Camps & Sessões
        </h1>
        <p className="text-sm text-muted-foreground mt-2">Programe camps de preparação, sessões de treino e acompanhe o corte de peso dos atletas.</p>
      </div>

      <Card className="p-4 space-y-3">
        <Label>Atleta</Label>
        <Select value={selectedAluno} onValueChange={setSelectedAluno}>
          <SelectTrigger><SelectValue placeholder="Selecione um atleta" /></SelectTrigger>
          <SelectContent>
            {alunos.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      {loading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}

      {selectedAluno && !loading && (
        <>
          {/* Camp ativo */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" /> Camp</h2>
              <Button size="sm" variant="outline" onClick={() => setShowCampForm((v) => !v)}><Plus className="h-4 w-4 mr-1" />Novo</Button>
            </div>

            {showCampForm && (
              <div className="grid gap-3 md:grid-cols-2 mb-4 p-3 rounded-md bg-muted/30">
                <div className="md:col-span-2"><Label>Nome</Label><Input value={campForm.nome} onChange={(e) => setCampForm({ ...campForm, nome: e.target.value })} placeholder="Ex: Camp Shooto Brasil" /></div>
                <div><Label>Início</Label><Input type="date" value={campForm.data_inicio} onChange={(e) => setCampForm({ ...campForm, data_inicio: e.target.value })} /></div>
                <div><Label>Data da luta</Label><Input type="date" value={campForm.data_luta} onChange={(e) => setCampForm({ ...campForm, data_luta: e.target.value })} /></div>
                <div><Label>Peso meta (kg)</Label><Input type="number" step="0.1" value={campForm.peso_meta} onChange={(e) => setCampForm({ ...campForm, peso_meta: e.target.value })} /></div>
                <div><Label>Modalidade</Label><Input value={campForm.modalidade} onChange={(e) => setCampForm({ ...campForm, modalidade: e.target.value })} placeholder="MMA, Muay Thai, BJJ..." /></div>
                <div className="md:col-span-2 flex gap-2"><Button onClick={salvarCamp}>Salvar camp</Button><Button variant="ghost" onClick={() => setShowCampForm(false)}>Cancelar</Button></div>
              </div>
            )}

            {camps.length === 0 && !showCampForm && <p className="text-sm text-muted-foreground">Nenhum camp cadastrado.</p>}

            <div className="space-y-2">
              {camps.map((c) => {
                const dias = differenceInCalendarDays(parseISO(c.data_luta), new Date());
                return (
                  <div key={c.id} className="p-3 rounded-md border border-border/40 flex items-center justify-between">
                    <div>
                      <p className="font-bold">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(c.data_inicio), "dd/MM/yy", { locale: ptBR })} → {format(parseISO(c.data_luta), "dd/MM/yy", { locale: ptBR })} · {dias >= 0 ? `${dias} dias` : "encerrado"}
                        {c.peso_meta ? ` · meta ${c.peso_meta}kg` : ""}
                        {c.modalidade ? ` · ${c.modalidade}` : ""}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removerCamp(c.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Nova sessão */}
          <Card className="p-4">
            <h2 className="font-bold uppercase tracking-wider text-sm mb-3">Adicionar sessão</h2>
            <div className="grid gap-3 md:grid-cols-4">
              <div><Label>Data</Label><Input type="date" value={sessaoForm.data} onChange={(e) => setSessaoForm({ ...sessaoForm, data: e.target.value })} /></div>
              <div>
                <Label>Tipo</Label>
                <Select value={sessaoForm.tipo} onValueChange={(v) => setSessaoForm({ ...sessaoForm, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Duração (min)</Label><Input type="number" value={sessaoForm.duracao_min} onChange={(e) => setSessaoForm({ ...sessaoForm, duracao_min: e.target.value })} /></div>
              <div>
                <Label>Intensidade</Label>
                <Select value={sessaoForm.intensidade} onValueChange={(v) => setSessaoForm({ ...sessaoForm, intensidade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INTENSIDADES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-4"><Label>Descrição / drills</Label><Textarea rows={3} value={sessaoForm.descricao} onChange={(e) => setSessaoForm({ ...sessaoForm, descricao: e.target.value })} placeholder="5x3min sparring, drill de clinch, condicionamento..." /></div>
              <div className="md:col-span-4"><Button onClick={salvarSessao}><Plus className="h-4 w-4 mr-1" />Adicionar</Button></div>
            </div>
          </Card>

          {/* Histórico */}
          <Card className="p-4">
            <h2 className="font-bold uppercase tracking-wider text-sm mb-3">Últimas sessões</h2>
            {sessoes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma sessão registrada.</p> : (
              <div className="space-y-1.5">
                {sessoes.map((s) => (
                  <div key={s.id} className="p-2.5 rounded-md border border-border/30 flex items-start justify-between text-sm">
                    <div>
                      <p className="font-medium">
                        {format(parseISO(s.data), "dd/MM", { locale: ptBR })} · <span className="uppercase text-primary text-xs">{s.tipo}</span>
                        {s.intensidade ? ` · ${s.intensidade}` : ""}
                        {s.duracao_min ? ` · ${s.duracao_min}min` : ""}
                      </p>
                      {s.descricao && <p className="text-xs text-muted-foreground mt-0.5">{s.descricao}</p>}
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removerSessao(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Peso */}
          <Card className="p-4">
            <h2 className="font-bold uppercase tracking-wider text-sm mb-3 flex items-center gap-2"><Scale className="h-4 w-4 text-primary" />Corte de peso</h2>
            {pesos.length === 0 ? <p className="text-sm text-muted-foreground">Atleta ainda não registrou peso.</p> : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {pesos.map((p) => (
                  <div key={p.id} className="p-2 rounded-md bg-muted/30 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">{format(parseISO(p.data), "dd/MM")}</p>
                    <p className="font-display text-lg">{p.peso}<span className="text-xs text-muted-foreground">kg</span></p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default Camps;
