import { useEffect, useRef, useState } from "react";
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
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, Sparkles, ClipboardCheck, Upload } from "lucide-react";
import { PageHeader } from "@/components/aluno/PageHeader";
import { toNivelCanonico } from "@/lib/nivel-experiencia";

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export default function Anamnese() {
  const { user } = useAuth();
  const { tenant } = useBranding();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [existingRecord, setExistingRecord] = useState<any>(null);

  // Form State
  const [form, setForm] = useState({
    doencas: "",
    medicamentos: "",
    lesoes_atuais: "",
    horas_sono: [7],
    nivel_estresse: [5],
    tabagismo: false,
    alcool: "nao",
    suplementos: "",
    restricoes_alimentares: "",
    refeicoes_dia: "4",
    agua_litros: "2",
    anos_treino: "0",
    disponibilidade_dias: [] as string[],
    horario_treino: "tarde",
    nivel_experiencia: "Intermediário",
    faz_uso_ergogenicos: false,
    detalhes_ergogenicos: "",
    historico_familiar: "",
    cirurgias: "",
    alimentos_ama: "",
    alimentos_evita: "",
    modalidades_anteriores: "",
    tempo_recuperacao: "",
    qualidade_sono: [5],
    alimentos_basicos_casa: "",
    cafe_lanche_habitual: "",
    proteinas_consumidas: "",
    frutas_vegetais_preferidos: "",
    horario_almoco: "12:00",
    horario_jantar: "20:00",
    nivel_atividade_diaria: "moderado",
  });

  useEffect(() => {
    if (user) loadAnamnese();
  }, [user]);

  const loadAnamnese = async () => {
    try {
      const { data, error } = await supabase
        .from("anamnese_aluno")
        .select("*")
        .eq("aluno_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setExistingRecord(data);
        setForm({
          doencas: (data.doencas as string[])?.join(", ") || "",
          medicamentos: data.medicamentos || "",
          lesoes_atuais: data.lesoes_atuais || "",
          horas_sono: [Number(data.horas_sono ?? 7)],
          nivel_estresse: [data.nivel_estresse ?? 5],
          tabagismo: data.tabagismo || false,
          alcool: data.alcool || "nao",
          suplementos: (data.suplementos as string[])?.join(", ") || "",
          restricoes_alimentares: (data.restricoes_alimentares as string[])?.join(", ") || "",
          refeicoes_dia: String(data.refeicoes_dia ?? "4"),
          agua_litros: String(data.agua_litros ?? "2"),
          anos_treino: String(data.anos_treino ?? "0"),
          disponibilidade_dias: (data.disponibilidade_dias as string[]) || [],
          horario_treino: (data as any).horario_treino || "tarde",
          nivel_experiencia: toNivelCanonico(data.nivel_experiencia) || "Intermediário",
          faz_uso_ergogenicos: data.faz_uso_ergogenicos || false,
          detalhes_ergogenicos: data.detalhes_ergogenicos || "",
          historico_familiar: data.historico_familiar || "",
          cirurgias: data.cirurgias || "",
          alimentos_ama: data.alimentos_ama || "",
          alimentos_evita: data.alimentos_evita || "",
          modalidades_anteriores: (data.modalidades_anteriores as string[])?.join(", ") || "",
          tempo_recuperacao: data.tempo_recuperacao || "",
          qualidade_sono: [data.qualidade_sono ?? 5],
          alimentos_basicos_casa: (data as any).alimentos_basicos_casa || "",
          cafe_lanche_habitual: (data as any).cafe_lanche_habitual || "",
          proteinas_consumidas: (data as any).proteinas_consumidas || "",
          frutas_vegetais_preferidos: (data as any).frutas_vegetais_preferidos || "",
          horario_almoco: (data as any).horario_almoco || "12:00",
          horario_jantar: (data as any).horario_jantar || "20:00",
          nivel_atividade_diaria: (data as any).nivel_atividade_diaria || "moderado",
        });
      }
    } catch (e: any) {
      toast.error("Erro ao carregar dados: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleDia = (d: string) => {
    setForm(prev => ({
      ...prev,
      disponibilidade_dias: prev.disponibilidade_dias.includes(d)
        ? prev.disponibilidade_dias.filter(x => x !== d)
        : [...prev.disponibilidade_dias, d]
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const anamneseData = {
        aluno_id: user.id,
        tenant_id: existingRecord?.tenant_id || tenant?.id,
        doencas: form.doencas.split(",").map(s => s.trim()).filter(Boolean),
        medicamentos: form.medicamentos,
        lesoes_atuais: form.lesoes_atuais,
        qualidade_sono: form.qualidade_sono[0],
        horas_sono: form.horas_sono[0],
        nivel_estresse: form.nivel_estresse[0],
        tabagismo: form.tabagismo,
        alcool: form.alcool,
        suplementos: form.suplementos.split(",").map(s => s.trim()).filter(Boolean),
        restricoes_alimentares: form.restricoes_alimentares.split(",").map(s => s.trim()).filter(Boolean),
        refeicoes_dia: parseInt(form.refeicoes_dia) || 0,
        agua_litros: parseFloat(form.agua_litros) || 0,
        anos_treino: parseFloat(form.anos_treino) || 0,
        disponibilidade_dias: form.disponibilidade_dias,
        horario_treino: form.horario_treino,
        nivel_experiencia: form.nivel_experiencia,
        faz_uso_ergogenicos: form.faz_uso_ergogenicos,
        detalhes_ergogenicos: form.detalhes_ergogenicos,
        historico_familiar: form.historico_familiar,
        cirurgias: form.cirurgias,
        alimentos_ama: form.alimentos_ama,
        alimentos_evita: form.alimentos_evita,
        modalidades_anteriores: form.modalidades_anteriores.split(",").map(s => s.trim()).filter(Boolean),
        tempo_recuperacao: form.tempo_recuperacao,
        alimentos_basicos_casa: form.alimentos_basicos_casa,
        cafe_lanche_habitual: form.cafe_lanche_habitual,
        proteinas_consumidas: form.proteinas_consumidas,
        frutas_vegetais_preferidos: form.frutas_vegetais_preferidos,
        horario_almoco: form.horario_almoco,
        horario_jantar: form.horario_jantar,
        nivel_atividade_diaria: form.nivel_atividade_diaria,
      };

      console.log("Salvando anamnese:", anamneseData);

      const { error } = await supabase.from("anamnese_aluno").upsert(
        anamneseData,
        { onConflict: "aluno_id" }
      );

      if (error) throw error;
      toast.success("Anamnese salva com sucesso!");
      navigate(`/${slug}/app/perfil`);
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImportFile = async (file: File) => {
    if (!user) return;
    setImporting(true);
    const toastId = toast.loading("Dr. IA analisando seu arquivo...");
    
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      
      const base64 = await base64Promise;
      
      const { data, error } = await supabase.functions.invoke("import-with-ai", {
        body: { 
          file: base64, 
          fileType: file.type,
          importType: "anamnese",
          alunoId: user.id,
          tenantId: tenant?.id
        },
      });

      if (error) throw error;
      
      if (data && data.extractedData) {
        const ext = data.extractedData;
        setForm(prev => ({
          ...prev,
          doencas: ext.doencas?.join(", ") || prev.doencas,
          medicamentos: ext.medicamentos || prev.medicamentos,
          lesoes_atuais: ext.lesoes_atuais || prev.lesoes_atuais,
          horas_sono: ext.horas_sono ? [ext.horas_sono] : prev.horas_sono,
          nivel_estresse: ext.nivel_estresse ? [ext.nivel_estresse] : prev.nivel_estresse,
          tabagismo: ext.tabagismo !== undefined ? ext.tabagismo : prev.tabagismo,
          alcool: ext.alcool || prev.alcool,
          suplementos: ext.suplementos?.join(", ") || prev.suplementos,
          restricoes_alimentares: ext.restricoes_alimentares?.join(", ") || prev.restricoes_alimentares,
          refeicoes_dia: ext.refeicoes_dia ? String(ext.refeicoes_dia) : prev.refeicoes_dia,
          agua_litros: ext.agua_litros ? String(ext.agua_litros) : prev.agua_litros,
          anos_treino: ext.anos_treino ? String(ext.anos_treino) : prev.anos_treino,
          horario_treino: ext.horario_treino || prev.horario_treino,
          nivel_experiencia: toNivelCanonico(ext.nivel_experiencia) || prev.nivel_experiencia,
          faz_uso_ergogenicos: ext.faz_uso_ergogenicos !== undefined ? ext.faz_uso_ergogenicos : prev.faz_uso_ergogenicos,
          detalhes_ergogenicos: ext.detalhes_ergogenicos || prev.detalhes_ergogenicos,
          historico_familiar: ext.historico_familiar || prev.historico_familiar,
          cirurgias: ext.cirurgias || prev.cirurgias,
          alimentos_ama: ext.alimentos_ama || prev.alimentos_ama,
          alimentos_evita: ext.alimentos_evita || prev.alimentos_evita,
          modalidades_anteriores: ext.modalidades_anteriores?.join(", ") || prev.modalidades_anteriores,
          tempo_recuperacao: ext.tempo_recuperacao || prev.tempo_recuperacao,
          qualidade_sono: ext.qualidade_sono ? [ext.qualidade_sono] : prev.qualidade_sono,
          alimentos_basicos_casa: ext.alimentos_basicos_casa || prev.alimentos_basicos_casa,
          cafe_lanche_habitual: ext.cafe_lanche_habitual || prev.cafe_lanche_habitual,
          proteinas_consumidas: ext.proteinas_consumidas || prev.proteinas_consumidas,
          frutas_vegetais_preferidos: ext.frutas_vegetais_preferidos || prev.frutas_vegetais_preferidos,
          horario_almoco: ext.horario_almoco || prev.horario_almoco,
          horario_jantar: ext.horario_jantar || prev.horario_jantar,
          nivel_atividade_diaria: ext.nivel_atividade_diaria || prev.nivel_atividade_diaria,
        }));
        toast.success("Dados extraídos com sucesso pela IA!", { id: toastId });
      } else {
        throw new Error("Não foi possível extrair dados do arquivo.");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(`Falha ao importar: ${e.message}`, { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader 
        icon={ClipboardCheck} 
        title="Anamnese" 
        subtitle="Complete seu perfil de saúde"
      />

      <div className="px-5 mb-6 flex flex-col gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImportFile(f);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="w-full h-12 rounded-xl border border-primary/30 bg-primary/5 text-primary font-bold uppercase tracking-wider flex items-center justify-center gap-2"
        >
          {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Importar com IA
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-wider shadow-glow flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Anamnese
        </button>
      </div>

      <main className="px-5 py-6 space-y-8 max-w-2xl mx-auto">
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <ClipboardCheck className="h-5 w-5" />
            <h2 className="font-display text-lg uppercase">Saúde & Histórico</h2>
          </div>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Doenças Preexistentes</Label>
              <Input
                placeholder="Ex: Diabetes, Hipertensão..."
                value={form.doencas}
                onChange={e => setForm({ ...form, doencas: e.target.value })}
                className="bg-secondary/40 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Medicamentos em uso</Label>
              <Textarea
                placeholder="Liste os medicamentos e dosagens..."
                value={form.medicamentos}
                onChange={e => setForm({ ...form, medicamentos: e.target.value })}
                className="bg-secondary/40 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Cirurgias realizadas</Label>
              <Input
                value={form.cirurgias}
                onChange={e => setForm({ ...form, cirurgias: e.target.value })}
                className="bg-secondary/40 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Histórico Familiar Relevante</Label>
              <Textarea
                value={form.historico_familiar}
                onChange={e => setForm({ ...form, historico_familiar: e.target.value })}
                className="bg-secondary/40 border-border"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <h2 className="font-display text-lg uppercase">Hábitos & Estilo de Vida</h2>
          </div>
          <div className="grid gap-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>Horas de sono: {form.horas_sono[0]}h</Label>
                <span className="text-xs text-muted-foreground">Média por noite</span>
              </div>
              <Slider
                value={form.horas_sono}
                onValueChange={v => setForm({ ...form, horas_sono: v })}
                min={3}
                max={12}
                step={1}
                className="py-4"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>Nível de Estresse: {form.nivel_estresse[0]}/10</Label>
                <span className="text-xs text-muted-foreground">1 (baixo) - 10 (alto)</span>
              </div>
              <Slider
                value={form.nivel_estresse}
                onValueChange={v => setForm({ ...form, nivel_estresse: v })}
                min={1}
                max={10}
                step={1}
                className="py-4"
              />
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-secondary/20">
              <Checkbox
                id="tabagismo"
                checked={form.tabagismo}
                onCheckedChange={v => setForm({ ...form, tabagismo: !!v })}
              />
              <Label htmlFor="tabagismo" className="cursor-pointer">Fumante regular</Label>
            </div>

            <div className="space-y-2">
              <Label>Consumo de Álcool</Label>
              <Select value={form.alcool} onValueChange={v => setForm({ ...form, alcool: v })}>
                <SelectTrigger className="bg-secondary/40 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao">Não consumo</SelectItem>
                  <SelectItem value="social">Socialmente (1-2x/semana)</SelectItem>
                  <SelectItem value="moderado">Moderado (3-4x/semana)</SelectItem>
                  <SelectItem value="frequente">Frequente (Diário)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <ClipboardCheck className="h-5 w-5" />
            <h2 className="font-display text-lg uppercase">Nutrição</h2>
          </div>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Refeições/Dia</Label>
                <Select value={form.refeicoes_dia} onValueChange={v => setForm({ ...form, refeicoes_dia: v })}>
                  <SelectTrigger className="bg-secondary/40 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 4, 5, 6, 7].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} refeições</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Água (Litros/Dia)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.agua_litros}
                  onChange={e => setForm({ ...form, agua_litros: e.target.value })}
                  className="bg-secondary/40 border-border"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Restrições / Alergias</Label>
              <Input
                placeholder="Ex: Lactose, Glúten..."
                value={form.restricoes_alimentares}
                onChange={e => setForm({ ...form, restricoes_alimentares: e.target.value })}
                className="bg-secondary/40 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Alimentos que AMA</Label>
              <Input
                value={form.alimentos_ama}
                onChange={e => setForm({ ...form, alimentos_ama: e.target.value })}
                className="bg-secondary/40 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Alimentos que EVITA</Label>
              <Input
                value={form.alimentos_evita}
                onChange={e => setForm({ ...form, alimentos_evita: e.target.value })}
                className="bg-secondary/40 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Alimentos básicos que costuma ter em casa</Label>
              <Textarea
                placeholder="Ex: arroz, feijão, ovos, frango, batata-doce, aveia..."
                value={form.alimentos_basicos_casa}
                onChange={e => setForm({ ...form, alimentos_basicos_casa: e.target.value })}
                className="bg-secondary/40 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>O que costuma comer no café da manhã e nos lanches</Label>
              <Textarea
                placeholder="Ex: pão integral com ovos, tapioca, fruta com whey..."
                value={form.cafe_lanche_habitual}
                onChange={e => setForm({ ...form, cafe_lanche_habitual: e.target.value })}
                className="bg-secondary/40 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Proteínas que mais consome</Label>
              <Input
                placeholder="Ex: frango, ovos, carne vermelha, peixe, whey..."
                value={form.proteinas_consumidas}
                onChange={e => setForm({ ...form, proteinas_consumidas: e.target.value })}
                className="bg-secondary/40 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Frutas e vegetais preferidos</Label>
              <Input
                placeholder="Ex: banana, mamão, brócolis, espinafre..."
                value={form.frutas_vegetais_preferidos}
                onChange={e => setForm({ ...form, frutas_vegetais_preferidos: e.target.value })}
                className="bg-secondary/40 border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Horário do almoço</Label>
                <Input
                  type="time"
                  value={form.horario_almoco}
                  onChange={e => setForm({ ...form, horario_almoco: e.target.value })}
                  className="bg-secondary/40 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Horário do jantar</Label>
                <Input
                  type="time"
                  value={form.horario_jantar}
                  onChange={e => setForm({ ...form, horario_jantar: e.target.value })}
                  className="bg-secondary/40 border-border"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nível de Atividade Física Diária (fora do treino)</Label>
              <Select value={form.nivel_atividade_diaria} onValueChange={v => setForm({ ...form, nivel_atividade_diaria: v })}>
                <SelectTrigger className="bg-secondary/40 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentario">Sedentário (escritório, pouco movimento)</SelectItem>
                  <SelectItem value="leve">Leve (caminhadas leves 1-3x/sem)</SelectItem>
                  <SelectItem value="moderado">Moderado (treina 3-5x/sem)</SelectItem>
                  <SelectItem value="intenso">Intenso (treina 6-7x/sem)</SelectItem>
                  <SelectItem value="muito_intenso">Muito intenso (atleta, 2x/dia ou trabalho físico)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Usado no cálculo do GET (TMB × Fator de Atividade).</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <ClipboardCheck className="h-5 w-5" />
            <h2 className="font-display text-lg uppercase">Treino & Ergogênicos</h2>
          </div>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Nível de Experiência</Label>
              <Select value={form.nivel_experiencia} onValueChange={v => setForm({ ...form, nivel_experiencia: v })}>
                <SelectTrigger className="bg-secondary/40 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Iniciante">Iniciante</SelectItem>
                  <SelectItem value="Intermediário">Intermediário</SelectItem>
                  <SelectItem value="Avançado">Avançado</SelectItem>
                  <SelectItem value="Atleta de Alto Nível">Atleta de Alto Nível</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Dias Disponíveis para Treinar</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {DIAS.map(d => (
                  <button
                    key={d}
                    onClick={() => toggleDia(d)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                      form.disponibilidade_dias.includes(d)
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-secondary/40 border-border text-muted-foreground"
                    }`}
                  >
                    {d.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Horário em que costuma treinar</Label>
              <Select value={form.horario_treino} onValueChange={v => setForm({ ...form, horario_treino: v })}>
                <SelectTrigger className="bg-secondary/40 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manha_cedo">Manhã cedo (5h-7h)</SelectItem>
                  <SelectItem value="manha">Manhã (7h-11h)</SelectItem>
                  <SelectItem value="meio_dia">Meio-dia (11h-14h)</SelectItem>
                  <SelectItem value="tarde">Tarde (14h-17h)</SelectItem>
                  <SelectItem value="fim_tarde">Fim de tarde (17h-19h)</SelectItem>
                  <SelectItem value="noite">Noite (19h-22h)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Usado para posicionar o pré e pós-treino na sua dieta.</p>
            </div>

            <div className="space-y-4 p-4 rounded-xl border border-border bg-secondary/20">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="ergogenicos"
                  checked={form.faz_uso_ergogenicos}
                  onCheckedChange={v => setForm({ ...form, faz_uso_ergogenicos: !!v })}
                />
                <Label htmlFor="ergogenicos" className="cursor-pointer leading-tight">
                  Faz uso de recursos ergogênicos ou terapia hormonal prescrita por um profissional de saúde?
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
  Esta informação é utilizada apenas para personalizar os cálculos do aplicativo e não representa recomendação de uso de qualquer substância.
</p>
              </div>
              {form.faz_uso_ergogenicos && (
                <div className="pt-2">
                  <Label className="text-[10px] text-muted-foreground uppercase mb-1">Detalhes (O que, doses, tempo)</Label>
                  <Textarea
                    placeholder="Seja honesto(a) para sua segurança..."
                    value={form.detalhes_ergogenicos}
                    onChange={e => setForm({ ...form, detalhes_ergogenicos: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-14 bg-gradient-primary font-bold uppercase tracking-wider text-base shadow-glow"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
          Salvar Anamnese
        </Button>
      </main>
    </div>
  );
}
