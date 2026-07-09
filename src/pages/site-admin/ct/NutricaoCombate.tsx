import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Utensils, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type Aluno = { id: string; nome: string };
type Camp = { id: string; nome: string };
type Fase = { id: string; fase: "off_season" | "pre_camp" | "weight_cut"; data_inicio: string; data_fim: string; kcal_meta: number | null; proteina_g: number | null; carboidrato_g: number | null; lipideos_g: number | null; peso_meta_kg: number | null; observacoes: string | null; camp_id: string | null };

const FASES = [
  { v: "off_season", l: "Off-Season" },
  { v: "pre_camp", l: "Pré-Camp" },
  { v: "weight_cut", l: "Corte de Peso" },
];

const NutricaoCombate = () => {
  const { tenant } = useSiteTenant();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [selected, setSelected] = useState("");
  const [camps, setCamps] = useState<Camp[]>([]);
  const [fases, setFases] = useState<Fase[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fase: "off_season", data_inicio: "", data_fim: "", kcal_meta: "", proteina_g: "", carboidrato_g: "", lipideos_g: "", peso_meta_kg: "", observacoes: "", camp_id: "" });

  useEffect(() => {
    if (!tenant?.id) return;
    (async () => {
      const { data } = await supabase.from("alunos").select("id, nome").eq("tenant_id", tenant.id).order("nome");
      setAlunos((data as Aluno[]) ?? []);
    })();
  }, [tenant?.id]);

  const load = async (alunoId: string) => {
    if (!alunoId) return;
    setLoading(true);
    const [f, c] = await Promise.all([
      supabase.from("fight_nutrition_fases").select("*").eq("aluno_id", alunoId).order("data_inicio"),
      supabase.from("camps_luta").select("id, nome").eq("aluno_id", alunoId).order("data_luta", { ascending: false }),
    ]);
    setFases((f.data as Fase[]) ?? []);
    setCamps((c.data as Camp[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(selected); }, [selected]);

  const salvar = async () => {
    if (!tenant?.id || !selected) return;
    if (!form.data_inicio || !form.data_fim) { toast.error("Preencha as datas"); return; }
    const { error } = await supabase.from("fight_nutrition_fases").insert({
      tenant_id: tenant.id,
      aluno_id: selected,
      fase: form.fase,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim,
      camp_id: form.camp_id || null,
      kcal_meta: form.kcal_meta ? Number(form.kcal_meta) : null,
      proteina_g: form.proteina_g ? Number(form.proteina_g) : null,
      carboidrato_g: form.carboidrato_g ? Number(form.carboidrato_g) : null,
      lipideos_g: form.lipideos_g ? Number(form.lipideos_g) : null,
      peso_meta_kg: form.peso_meta_kg ? Number(form.peso_meta_kg) : null,
      observacoes: form.observacoes || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Fase adicionada");
    setForm({ ...form, data_inicio: "", data_fim: "", kcal_meta: "", proteina_g: "", carboidrato_g: "", lipideos_g: "", peso_meta_kg: "", observacoes: "" });
    load(selected);
  };

  const remover = async (id: string) => {
    if (!confirm("Remover esta fase?")) return;
    const { error } = await supabase.from("fight_nutrition_fases").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load(selected);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <AdminBackButton to="/site/admin/dashboard" />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">CT de Lutas</p>
        <h1 className="font-display text-3xl md:text-4xl uppercase italic tracking-tighter flex items-center gap-3">
          <Utensils className="h-7 w-7 text-primary" /> Nutrição de Combate
        </h1>
        <p className="text-sm text-muted-foreground mt-2">Configure as fases de nutrição (off-season, pré-camp e corte de peso) com metas calóricas e macros específicos por atleta.</p>
      </div>

      <Card className="p-4 space-y-3">
        <Label>Atleta</Label>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger><SelectValue placeholder="Selecione um atleta" /></SelectTrigger>
          <SelectContent>{alunos.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent>
        </Select>
      </Card>

      {loading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}

      {selected && !loading && (
        <>
          <Card className="p-4">
            <h2 className="font-bold uppercase tracking-wider text-sm mb-3">Adicionar fase</h2>
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <Label>Fase</Label>
                <Select value={form.fase} onValueChange={(v) => setForm({ ...form, fase: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FASES.map((f) => <SelectItem key={f.v} value={f.v}>{f.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Início</Label><Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} /></div>
              <div><Label>Fim</Label><Input type="date" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} /></div>
              <div>
                <Label>Camp (opcional)</Label>
                <Select value={form.camp_id} onValueChange={(v) => setForm({ ...form, camp_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>{camps.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Kcal alvo</Label><Input type="number" value={form.kcal_meta} onChange={(e) => setForm({ ...form, kcal_meta: e.target.value })} /></div>
              <div><Label>Proteína (g)</Label><Input type="number" value={form.proteina_g} onChange={(e) => setForm({ ...form, proteina_g: e.target.value })} /></div>
              <div><Label>Carboidrato (g)</Label><Input type="number" value={form.carboidrato_g} onChange={(e) => setForm({ ...form, carboidrato_g: e.target.value })} /></div>
              <div><Label>Gordura (g)</Label><Input type="number" value={form.lipideos_g} onChange={(e) => setForm({ ...form, lipideos_g: e.target.value })} /></div>
              <div><Label>Peso meta (kg)</Label><Input type="number" step="0.1" value={form.peso_meta_kg} onChange={(e) => setForm({ ...form, peso_meta_kg: e.target.value })} /></div>
              <div className="md:col-span-4"><Label>Observações</Label><Textarea rows={3} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Estratégia de refeed, ciclos de carboidrato, hidratação..." /></div>
              <div className="md:col-span-4"><Button onClick={salvar}><Plus className="h-4 w-4 mr-1" />Adicionar fase</Button></div>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="font-bold uppercase tracking-wider text-sm mb-3">Fases cadastradas</h2>
            {fases.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma fase cadastrada.</p> : (
              <div className="space-y-2">
                {fases.map((f) => (
                  <div key={f.id} className="p-3 rounded-md border border-border/40 flex items-start justify-between">
                    <div>
                      <p className="font-bold uppercase tracking-wider text-sm">{FASES.find((x) => x.v === f.fase)?.l}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(f.data_inicio), "dd/MM/yy", { locale: ptBR })} → {format(parseISO(f.data_fim), "dd/MM/yy", { locale: ptBR })}
                        {f.kcal_meta ? ` · ${f.kcal_meta} kcal` : ""}
                        {f.peso_meta_kg ? ` · meta ${f.peso_meta_kg}kg` : ""}
                      </p>
                      {f.observacoes && <p className="text-xs text-muted-foreground mt-1">{f.observacoes}</p>}
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => remover(f.id)}><Trash2 className="h-4 w-4" /></Button>
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

export default NutricaoCombate;
