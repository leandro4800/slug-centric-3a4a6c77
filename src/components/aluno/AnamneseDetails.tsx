import { useState } from "react";
import { Pencil, Save, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AnamneseData {
  doencas: string[];
  medicamentos: string | null;
  lesoes_atuais: string | null;
  horas_sono: number | null;
  qualidade_sono: number | null;
  nivel_estresse: number | null;
  tabagismo: boolean | null;
  alcool: string | null;
  suplementos: string[];
  restricoes_alimentares: string[];
  refeicoes_dia: number | null;
  agua_litros: number | null;
  anos_treino: number | null;
  disponibilidade_dias: string[];
  nivel_experiencia: string | null;
  faz_uso_ergogenicos: boolean | null;
  detalhes_ergogenicos: string | null;
  historico_familiar: string | null;
  cirurgias: string | null;
  alimentos_ama: string | null;
  alimentos_evita: string | null;
  modalidades_anteriores: string[];
  tempo_recuperacao: string | null;
  alimentos_basicos_casa: string | null;
  cafe_lanche_habitual: string | null;
  proteinas_consumidas: string | null;
  frutas_vegetais_preferidos: string | null;
  nivel_atividade_diaria: string | null;
  horario_almoco: string | null;
  horario_jantar: string | null;
  horario_treino: string | null;
}

interface Props {
  data: AnamneseData;
  alunoId?: string;
  editable?: boolean;
  onSaved?: (updated: AnamneseData) => void;
}

const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const normDia = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().slice(0, 3);
const canonizarDias = (arr: string[] | null | undefined): string[] => {
  const flat = (arr || []).flatMap(d => String(d).split(",")).map(s => s.trim()).filter(Boolean);
  return DIAS_SEMANA.filter(d => flat.some(f => normDia(f) === normDia(d)));
};

export const AnamneseDetails = ({ data, alunoId, editable, onSaved }: Props) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AnamneseData>(data);

  const arrFromCsv = (s: string) => s.split(",").map(x => x.trim()).filter(Boolean);
  const csv = (a: string[] | null | undefined) => (a || []).join(", ");

  const startEdit = () => {
    setForm({ ...data, disponibilidade_dias: canonizarDias(data.disponibilidade_dias) });
    setEditing(true);
  };


  const handleSave = async () => {
    if (!alunoId) return;
    setSaving(true);
    try {
      const payload: any = {
        doencas: form.doencas,
        medicamentos: form.medicamentos,
        lesoes_atuais: form.lesoes_atuais,
        horas_sono: form.horas_sono,
        qualidade_sono: form.qualidade_sono,
        nivel_estresse: form.nivel_estresse,
        tabagismo: form.tabagismo,
        alcool: form.alcool,
        suplementos: form.suplementos,
        restricoes_alimentares: form.restricoes_alimentares,
        refeicoes_dia: form.refeicoes_dia,
        agua_litros: form.agua_litros,
        anos_treino: form.anos_treino,
        disponibilidade_dias: form.disponibilidade_dias,
        nivel_experiencia: form.nivel_experiencia,
        faz_uso_ergogenicos: form.faz_uso_ergogenicos,
        detalhes_ergogenicos: form.detalhes_ergogenicos,
        historico_familiar: form.historico_familiar,
        cirurgias: form.cirurgias,
        alimentos_ama: form.alimentos_ama,
        alimentos_evita: form.alimentos_evita,
        modalidades_anteriores: form.modalidades_anteriores,
        tempo_recuperacao: form.tempo_recuperacao,
        alimentos_basicos_casa: form.alimentos_basicos_casa,
        cafe_lanche_habitual: form.cafe_lanche_habitual,
        proteinas_consumidas: form.proteinas_consumidas,
        frutas_vegetais_preferidos: form.frutas_vegetais_preferidos,
        nivel_atividade_diaria: form.nivel_atividade_diaria,
        horario_almoco: form.horario_almoco,
        horario_jantar: form.horario_jantar,
        horario_treino: form.horario_treino,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("anamnese_aluno")
        .update(payload)
        .eq("aluno_id", alunoId);
      if (error) throw error;
      toast.success("Anamnese atualizada!");
      setEditing(false);
      onSaved?.(form);
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="space-y-6 text-sm">
        {editable && alunoId && (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={startEdit} className="gap-2">

              <Pencil className="h-3 w-3" /> Editar
            </Button>
          </div>
        )}
        <section className="space-y-3">
          <h3 className="font-display text-sm uppercase text-primary tracking-widest border-b border-primary/20 pb-1">Saúde & Histórico</h3>
          <div className="grid gap-2">
            <DetailItem label="Doenças" value={data.doencas?.join(", ") || "Nenhuma"} />
            <DetailItem label="Medicamentos" value={data.medicamentos} />
            <DetailItem label="Cirurgias" value={data.cirurgias} />
            <DetailItem label="Lesões Atuais" value={data.lesoes_atuais} />
            <DetailItem label="Histórico Familiar" value={data.historico_familiar} />
          </div>
        </section>
        <section className="space-y-3">
          <h3 className="font-display text-sm uppercase text-primary tracking-widest border-b border-primary/20 pb-1">Hábitos</h3>
          <div className="grid grid-cols-2 gap-3">
            <DetailItem label="Horas de Sono" value={data.horas_sono ? `${data.horas_sono}h` : null} />
            <DetailItem label="Nível Estresse" value={data.nivel_estresse ? `${data.nivel_estresse}/10` : null} />
            <DetailItem label="Fumante" value={data.tabagismo ? "Sim" : "Não"} />
            <DetailItem label="Álcool" value={data.alcool} />
          </div>
        </section>
        <section className="space-y-3">
          <h3 className="font-display text-sm uppercase text-primary tracking-widest border-b border-primary/20 pb-1">Nutrição</h3>
          <div className="grid grid-cols-2 gap-3">
            <DetailItem label="Refeições/Dia" value={data.refeicoes_dia} />
            <DetailItem label="Água/Dia" value={data.agua_litros ? `${data.agua_litros}L` : null} />
          </div>
          <DetailItem label="Suplementos" value={data.suplementos?.join(", ")} />
          <DetailItem label="Restrições" value={data.restricoes_alimentares?.join(", ")} />
          <DetailItem label="Ama" value={data.alimentos_ama} />
          <DetailItem label="Evita" value={data.alimentos_evita} />
        </section>
        <section className="space-y-3">
          <h3 className="font-display text-sm uppercase text-primary tracking-widest border-b border-primary/20 pb-1">Treino</h3>
          <div className="grid grid-cols-2 gap-3">
            <DetailItem label="Anos de Treino" value={data.anos_treino} />
            <DetailItem label="Experiência" value={data.nivel_experiencia} />
          </div>
          <DetailItem label="Disponibilidade" value={data.disponibilidade_dias?.join(", ")} />
        </section>
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-4 text-sm">
      <div className="flex justify-end gap-2 sticky top-0 bg-card z-10 py-2">
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving} className="gap-2">
          <X className="h-3 w-3" /> Cancelar
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Salvar
        </Button>
      </div>

      <Field label="Doenças (separe por vírgula)">
        <Input value={csv(form.doencas)} onChange={e => setForm({ ...form, doencas: arrFromCsv(e.target.value) })} />
      </Field>
      <Field label="Medicamentos">
        <Textarea value={form.medicamentos || ""} onChange={e => setForm({ ...form, medicamentos: e.target.value })} />
      </Field>
      <Field label="Cirurgias">
        <Input value={form.cirurgias || ""} onChange={e => setForm({ ...form, cirurgias: e.target.value })} />
      </Field>
      <Field label="Lesões Atuais">
        <Textarea value={form.lesoes_atuais || ""} onChange={e => setForm({ ...form, lesoes_atuais: e.target.value })} />
      </Field>
      <Field label="Histórico Familiar">
        <Textarea value={form.historico_familiar || ""} onChange={e => setForm({ ...form, historico_familiar: e.target.value })} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Horas de Sono">
          <Input type="number" value={form.horas_sono ?? ""} onChange={e => setForm({ ...form, horas_sono: e.target.value === "" ? null : Number(e.target.value) })} />
        </Field>
        <Field label="Nível Estresse (1-10)">
          <Input type="number" min={1} max={10} value={form.nivel_estresse ?? ""} onChange={e => setForm({ ...form, nivel_estresse: e.target.value === "" ? null : Number(e.target.value) })} />
        </Field>
        <Field label="Qualidade do Sono (1-10)">
          <Input type="number" min={1} max={10} value={form.qualidade_sono ?? ""} onChange={e => setForm({ ...form, qualidade_sono: e.target.value === "" ? null : Number(e.target.value) })} />
        </Field>
        <Field label="Álcool">
          <Input value={form.alcool || ""} onChange={e => setForm({ ...form, alcool: e.target.value })} />
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="tab" checked={!!form.tabagismo} onCheckedChange={v => setForm({ ...form, tabagismo: !!v })} />
        <Label htmlFor="tab">Fumante</Label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Refeições/Dia">
          <Input type="number" value={form.refeicoes_dia ?? ""} onChange={e => setForm({ ...form, refeicoes_dia: e.target.value === "" ? null : Number(e.target.value) })} />
        </Field>
        <Field label="Água/Dia (L)">
          <Input type="number" step="0.1" value={form.agua_litros ?? ""} onChange={e => setForm({ ...form, agua_litros: e.target.value === "" ? null : Number(e.target.value) })} />
        </Field>
      </div>
      <Field label="Suplementos (separe por vírgula)">
        <Input value={csv(form.suplementos)} onChange={e => setForm({ ...form, suplementos: arrFromCsv(e.target.value) })} />
      </Field>
      <Field label="Restrições Alimentares (separe por vírgula)">
        <Input value={csv(form.restricoes_alimentares)} onChange={e => setForm({ ...form, restricoes_alimentares: arrFromCsv(e.target.value) })} />
      </Field>
      <Field label="Alimentos que ama">
        <Textarea value={form.alimentos_ama || ""} onChange={e => setForm({ ...form, alimentos_ama: e.target.value })} />
      </Field>
      <Field label="Alimentos que evita">
        <Textarea value={form.alimentos_evita || ""} onChange={e => setForm({ ...form, alimentos_evita: e.target.value })} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Anos de Treino">
          <Input type="number" step="0.5" value={form.anos_treino ?? ""} onChange={e => setForm({ ...form, anos_treino: e.target.value === "" ? null : Number(e.target.value) })} />
        </Field>
        <Field label="Nível Experiência">
          <Input value={form.nivel_experiencia || ""} onChange={e => setForm({ ...form, nivel_experiencia: e.target.value })} />
        </Field>
      </div>
      <Field label="Disponibilidade Dias">
        <div className="flex flex-wrap gap-2">
          {DIAS_SEMANA.map(dia => {
            const selected = canonizarDias(form.disponibilidade_dias).includes(dia);
            return (
              <button
                key={dia}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setForm(prev => {
                    const atuais = canonizarDias(prev.disponibilidade_dias);
                    const novo = atuais.includes(dia)
                      ? atuais.filter(d => d !== dia)
                      : [...atuais, dia];
                    // sempre ordenado Seg → Dom
                    return { ...prev, disponibilidade_dias: DIAS_SEMANA.filter(d => novo.includes(d)) };
                  });
                }}
                className={`px-3 py-2 rounded-md border text-sm font-medium transition ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-input hover:bg-accent"}`}
              >
                {dia}
              </button>
            );
          })}
        </div>
      </Field>

    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
    {children}
  </div>
);

const DetailItem = ({ label, value }: { label: string; value: any }) => (
  <div>
    <p className="text-[10px] uppercase text-muted-foreground tracking-wider font-bold">{label}</p>
    <p className="text-xs text-foreground/80 mt-0.5">{value || "—"}</p>
  </div>
);
