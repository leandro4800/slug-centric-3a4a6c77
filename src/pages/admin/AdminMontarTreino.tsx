import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/contexts/BrandingProvider";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Save, ArrowLeft, Trash2, Plus } from "lucide-react";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { toast } from "sonner";

interface Aluno {
  id: string;
  nome_completo: string | null;
  email: string | null;
}

interface PerfilTreino {
  sexo: string | null;
  idade: number | null;
  peso_kg: number | null;
  altura_cm: number | null;
  bf_pct: number | null;
  objetivo: string | null;
  frequencia_semanal: number | null;
  tempo_treino: string | null;
  pescoco_cm: number | null;
  cintura_cm: number | null;
  quadril_cm: number | null;
  lesoes: string[];
  limitacoes: string[];
}

interface ExercicioPrescrito {
  dia_semana: string;
  ordem: number;
  exercicio: string;
  series: string;
  repeticoes: string;
  cadencia?: string;
  detalhes_execucao?: string;
  observacao: string;
}

const classificarNivel = (tempo: string | null): "Iniciante" | "Intermediário" | "Avançado" | "Atleta de Alto Nível" => {
  if (!tempo) return "Iniciante";
  const t = tempo.toLowerCase();
  if (t.includes("alto")) return "Atleta de Alto Nível";
  if (t.includes("avan") || t.includes("3 a") || t.includes("4 a") || t.includes("5+")) return "Avançado";
  if (t.includes("inter") || t.includes("1 a") || t.includes("2 a")) return "Intermediário";
  return "Iniciante";
};

// === PRESETS DE DIVISÃO (baseados no curso "Além da Genética" - Pacholok) ===
// Cada preset tem id, label amigável, frequência ideal e os dias com combinações musculares já definidas.
type DivisaoPreset = {
  id: string;
  label: string;
  freq: number;
  publico: "unisex" | "feminino";
  nivel: ("Iniciante" | "Intermediário" | "Avançado" | "Atleta de Alto Nível")[];
  dias: string[];
};

const DIVISOES_PRESETS: DivisaoPreset[] = [
  // ===== 2x semana =====
  { id: "ini-2x-fb", label: "Iniciante 2x — Full Body AB", freq: 2, publico: "unisex", nivel: ["Iniciante"], dias: ["A — Full Body (Quad/Peito/Costas)", "B — Full Body (Post/Ombro/Braços)"] },
  { id: "fem-2x-ab", label: "Mulher 2x — Inferior/Superior", freq: 2, publico: "feminino", nivel: ["Iniciante", "Intermediário"], dias: ["A — Glúteo/Posterior/Quadríceps", "B — Superior + Glúteo Acessório"] },

  // ===== 3x semana =====
  { id: "ini-3x-fb", label: "Iniciante 3x — Full Body ABC", freq: 3, publico: "unisex", nivel: ["Iniciante"], dias: ["A — Full Body (ênfase Pernas)", "B — Full Body (ênfase Peito/Costas)", "C — Full Body (ênfase Ombro/Braços)"] },
  { id: "ppl-3x", label: "PPL 3x — Push / Pull / Legs", freq: 3, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["Push — Peito/Ombro/Tríceps", "Pull — Costas/Bíceps", "Legs — Pernas Completas"] },
  { id: "abc-peitotri", label: "ABC 3x — Peito+Tríceps / Costas+Bíceps / Pernas", freq: 3, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["A — Peito + Tríceps + Ombro Anterior", "B — Costas + Bíceps + Ombro Posterior", "C — Pernas Completas"] },
  { id: "abc-peitobi", label: "ABC 3x — Peito+Bíceps / Costas+Tríceps / Pernas", freq: 3, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["A — Peito + Bíceps", "B — Costas + Tríceps", "C — Pernas + Ombro"] },
  { id: "fem-3x-av", label: "Mulher 3x — Avançada (Glúteo 2x)", freq: 3, publico: "feminino", nivel: ["Intermediário", "Avançado"], dias: ["A — Glúteo/Posterior", "B — Quadríceps + Panturrilha", "C — Superior + Glúteo Acessório"] },

  // ===== 4x semana =====
  { id: "ini-4x-fb", label: "Iniciante 4x — Full Body ABCD", freq: 4, publico: "unisex", nivel: ["Iniciante"], dias: ["A — Full Body (Pernas)", "B — Full Body (Peito/Costas)", "C — Full Body (Ombro/Braços)", "D — Full Body (Posterior/Core)"] },
  { id: "abcd-peitotri", label: "ABCD 4x — Peito+Tri / Costas+Bi / Pernas / Ombro", freq: 4, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["A — Peito + Tríceps", "B — Costas + Bíceps", "C — Pernas Completas", "D — Ombro + Trapézio + Braços"] },
  { id: "abcd-peitobi", label: "ABCD 4x — Peito+Bi / Costas+Tri / Pernas / Ombro", freq: 4, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["A — Peito + Bíceps", "B — Costas + Tríceps", "C — Pernas Completas", "D — Ombro + Trapézio + Antebraço"] },
  { id: "ppl-ul-4x", label: "Upper/Lower 4x — 2x Superior + 2x Inferior", freq: 4, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["Upper A — Peito/Costas/Ombro", "Lower A — Quadríceps/Glúteo", "Upper B — Braços/Ombro Lateral", "Lower B — Posterior/Panturrilha"] },
  { id: "ppl-abc-4x", label: "PPL+1 4x — Push / Pull / Legs / Ênfase Fraco", freq: 4, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["Push — Peito/Ombro/Tríceps", "Pull — Costas/Bíceps", "Legs — Pernas", "D — Ênfase Ponto Fraco"] },
  { id: "fem-4x-ab", label: "Mulher 4x — Glúteo/Quad alternado", freq: 4, publico: "feminino", nivel: ["Intermediário"], dias: ["A — Glúteo/Posterior", "B — Peito/Ombro", "C — Glúteo/Quadríceps", "D — Costas/Braços"] },
  { id: "fem-4x-ul", label: "Mulher 4x — Upper/Lower com foco Glúteo", freq: 4, publico: "feminino", nivel: ["Intermediário", "Avançado"], dias: ["Lower A — Glúteo/Posterior", "Upper A — Costas/Ombro", "Lower B — Quadríceps/Glúteo", "Upper B — Peito/Braços"] },

  // ===== 5x semana =====
  { id: "abcde-inf", label: "ABCDE 5x — Ênfase Inferiores (Pacholok)", freq: 5, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["A — Quadríceps", "B — Peito + Tríceps", "C — Costas + Bíceps", "D — Posterior + Glúteo", "E — Ombro + Trapézio"] },
  { id: "abcde-sup", label: "ABCDE 5x — Ênfase Superiores (Pacholok)", freq: 5, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["A — Peito (Foco)", "B — Costas (Largura)", "C — Pernas Completas", "D — Ombro Completo", "E — Braços (Bi+Tri)"] },
  { id: "ppl-ul-5x", label: "PPL+UL 5x — Push/Pull/Legs/Upper/Lower", freq: 5, publico: "unisex", nivel: ["Avançado"], dias: ["Push", "Pull", "Legs", "Upper (Ênfase fraco)", "Lower (Ênfase fraco)"] },
  { id: "fem-5x-quad", label: "Mulher 5x — Ênfase Quadríceps", freq: 5, publico: "feminino", nivel: ["Avançado"], dias: ["A — Quadríceps", "B — Glúteo/Posterior", "C — Peito/Ombro", "D — Quadríceps + Panturrilha", "E — Costas/Braços"] },
  { id: "abcde-classic-pacho", label: "ABCDE 5x — Clássica Pacholok (Peito+Tri / Costas+Bi / Pernas Quad / Ombro / Pernas Posterior)", freq: 5, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["Seg — Peito + Tríceps + Estímulo Anterior de Ombro", "Ter — Costas + Bíceps + Estímulo Posterior de Ombro", "Qua — Perna Completa (ênfase Quadríceps)", "Sex — Ombro Completo (Anterior/Lateral/Posterior + Trapézio)", "Sáb — Perna Completa (ênfase Posterior + Glúteo)"] },

  // ===== 6x semana =====
  { id: "abcdef-av", label: "ABCDEF 6x — Super Avançado (1 músculo/dia)", freq: 6, publico: "unisex", nivel: ["Avançado", "Atleta de Alto Nível"], dias: ["A — Peito", "B — Costas", "C — Pernas (Quad)", "D — Ombro", "E — Braços (Bi+Tri)", "F — Posterior + Trapézio"] },
  { id: "ppl-2x", label: "PPL 6x — Push/Pull/Legs 2x semana", freq: 6, publico: "unisex", nivel: ["Avançado"], dias: ["Push A", "Pull A", "Legs A (Quad)", "Push B", "Pull B", "Legs B (Posterior)"] },
];

const sugerirDivisoes = (frequencia: number, sexo: string | null, nivel: string): string[] => {
  const fem = sexo?.toLowerCase().startsWith("f");
  const candidatos = DIVISOES_PRESETS.filter(
    (p) => p.freq === frequencia && (fem ? p.publico === "feminino" || p.publico === "unisex" : p.publico === "unisex") && p.nivel.includes(nivel as any)
  );
  return candidatos[0]?.dias || ["Treino A", "Treino B", "Treino C", "Treino D"];
};

const AdminMontarTreino = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tenant } = useBranding();
  const { user } = useAuth();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [alunoId, setAlunoId] = useState<string>(searchParams.get("aluno") || "");
  const [perfil, setPerfil] = useState<PerfilTreino>({
    sexo: "", idade: null, peso_kg: null, altura_cm: null, bf_pct: null,
    objetivo: "hipertrofia", frequencia_semanal: 4, tempo_treino: "Iniciante",
    pescoco_cm: null, cintura_cm: null, quadril_cm: null,
    lesoes: [], limitacoes: [],
  });
  const [exercicios, setExercicios] = useState<ExercicioPrescrito[]>([]);
  const [cardio, setCardio] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [divisaoSelecionadaId, setDivisaoSelecionadaId] = useState<string>("");
  const [divisaoCustom, setDivisaoCustom] = useState<string[]>([]);
  const [estimulosExtras, setEstimulosExtras] = useState<string[]>([]);

  useEffect(() => {
    if (!tenant) return;
    void (async () => {
      const { data } = await supabase
        .from("perfis")
        .select("id, nome_completo, email")
        .eq("tenant_id", tenant.id);
      setAlunos((data as Aluno[]) || []);
    })();
  }, [tenant]);

  useEffect(() => {
    if (!alunoId || !tenant) return;
    void (async () => {
      // Buscar em paralelo todas as fontes do perfil real do aluno
      const [perfilTreinoRes, perfilRes, avaliacaoRes, anamneseRes] = await Promise.all([
        supabase.from("perfis_treino").select("*").eq("aluno_id", alunoId).maybeSingle(),
        supabase.from("perfis").select("sexo, data_nascimento").eq("id", alunoId).maybeSingle(),
        supabase.from("avaliacoes_fisicas").select("peso_kg, altura_cm, bf_pct_calculado, idade, sexo").eq("aluno_id", alunoId).order("data", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("anamnese_aluno").select("nivel_experiencia, anos_treino, lesoes_atuais, doencas").eq("aluno_id", alunoId).maybeSingle(),
      ]);

      const pt = perfilTreinoRes.data as any;
      const pr = perfilRes.data as any;
      const av = avaliacaoRes.data as any;
      const an = anamneseRes.data as any;

      // Calcular idade a partir de data_nascimento se necessário
      let idadeCalc: number | null = null;
      if (pr?.data_nascimento) {
        const nasc = new Date(pr.data_nascimento);
        idadeCalc = Math.floor((Date.now() - nasc.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      }

      // Mesclar: perfis_treino (overrides do coach) > avaliacao/anamnese/perfis
      const sexoMesclado = pt?.sexo || pr?.sexo || av?.sexo || "";
      const tempoMesclado = pt?.tempo_treino || an?.nivel_experiencia || "Iniciante";

      setPerfil({
        sexo: sexoMesclado,
        idade: pt?.idade ?? av?.idade ?? idadeCalc,
        peso_kg: pt?.peso_kg ?? av?.peso_kg ?? null,
        altura_cm: pt?.altura_cm ?? av?.altura_cm ?? null,
        bf_pct: pt?.bf_pct ?? av?.bf_pct_calculado ?? null,
        pescoco_cm: pt?.pescoco_cm ?? av?.pescoco_cm ?? null,
        cintura_cm: pt?.cintura_cm ?? av?.cintura_cm ?? null,
        quadril_cm: pt?.quadril_cm ?? av?.quadril_cm ?? null,
        objetivo: pt?.objetivo || "hipertrofia",
        frequencia_semanal: pt?.frequencia_semanal || 4,
        tempo_treino: tempoMesclado,
        lesoes: pt?.lesoes && pt.lesoes.length > 0 ? pt.lesoes : (an?.lesoes_atuais ? [an.lesoes_atuais] : []),
        limitacoes: pt?.limitacoes && pt.limitacoes.length > 0 ? pt.limitacoes : (an?.doencas || []),
      });

      const { data: tp } = await supabase
        .from("treinos_prescritos")
        .select("dia_semana, ordem, exercicio, series, repeticoes, observacao, cadencia, detalhes_execucao")
        .eq("aluno_id", alunoId)
        .eq("tenant_id", tenant.id)
        .order("dia_semana")
        .order("ordem");
      if (tp) {
        setExercicios(tp.map((e) => ({
          dia_semana: e.dia_semana,
          ordem: e.ordem || 0,
          exercicio: e.exercicio,
          series: e.series || "",
          repeticoes: e.repeticoes || "",
          observacao: e.observacao || "",
          cadencia: e.cadencia || "",
          detalhes_execucao: e.detalhes_execucao || "",
        })));
      } else {
        setExercicios([]);
      }
    })();
  }, [alunoId, tenant]);

  const nivel = useMemo(() => classificarNivel(perfil.tempo_treino), [perfil.tempo_treino]);

  // Presets aplicáveis ao perfil atual (freq + sexo + nível)
  const presetsDisponiveis = useMemo(() => {
    const fem = perfil.sexo?.toLowerCase().startsWith("f");
    return DIVISOES_PRESETS.filter(
      (p) =>
        p.freq === (perfil.frequencia_semanal || 4) &&
        (fem ? p.publico === "feminino" || p.publico === "unisex" : p.publico === "unisex") &&
        p.nivel.includes(nivel as any)
    );
  }, [perfil.frequencia_semanal, perfil.sexo, nivel]);

  // Auto-seleciona primeiro preset quando muda contexto
  useEffect(() => {
    if (presetsDisponiveis.length > 0 && !presetsDisponiveis.find((p) => p.id === divisaoSelecionadaId)) {
      setDivisaoSelecionadaId(presetsDisponiveis[0].id);
      setDivisaoCustom(presetsDisponiveis[0].dias);
    }
  }, [presetsDisponiveis, divisaoSelecionadaId]);

  const divisoes = divisaoCustom.length > 0
    ? divisaoCustom
    : sugerirDivisoes(perfil.frequencia_semanal || 4, perfil.sexo, nivel);

  const salvarPerfil = async (silent = false) => {
    if (!alunoId || !tenant) return;
    const { error } = await supabase
      .from("perfis_treino")
      .upsert({ aluno_id: alunoId, tenant_id: tenant.id, ...perfil } as any, { onConflict: "aluno_id" });
    if (error) {
      if (!silent) toast.error(error.message);
    } else {
      if (!silent) toast.success("Perfil salvo.");
    }
  };

  const gerarComIA = useCallback(async (customPrompt?: string) => {
    if (!alunoId || !tenant) {
      toast.error("Selecione um aluno.");
      return;
    }
    setGenerating(true);
    try {
      await salvarPerfil(true);
      const { data: biblioteca } = await supabase
        .from("biblioteca_exercicios")
        .select("nome, grupo_muscular, contraindicacoes")
        .eq("tenant_id", tenant.id);

      const promptFromUrl = searchParams.get("prompt");
      const activePrompt = customPrompt || promptFromUrl || "";

      const { data, error } = await supabase.functions.invoke("gerar-treino-ia", {
        body: { perfil, biblioteca: biblioteca || [], divisoes, prompt: activePrompt, estimulos_extras: estimulosExtras },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const novos: ExercicioPrescrito[] = [];
      (data.dias || []).forEach((d: any) => {
        (d.exercicios || []).forEach((e: any, idx: number) => {
          novos.push({
            dia_semana: d.dia,
            ordem: idx,
            exercicio: e.nome,
            series: e.series,
            repeticoes: e.repeticoes,
            cadencia: e.cadencia,
            detalhes_execucao: e.detalhes_execucao,
            observacao: e.observacao,
          });
        });
      });
      setExercicios(novos);
      setCardio(data.cardio || "");
      toast.success(`Treino gerado · ${novos.length} exercícios`);

      if (searchParams.get("andDiet") === "true") {
        setTimeout(async () => {
          await salvarPrescricao(novos);
          const prompt = searchParams.get("prompt");
          const promptQuery = prompt ? `&prompt=${encodeURIComponent(prompt)}` : "";
          navigate(`/${slug}/admin/montar-dieta?aluno=${alunoId}&auto=true${promptQuery}`);
        }, 1000);
      }
    } catch (e: any) {
      toast.error(e.message || "Falha ao gerar.");
    } finally {
      setGenerating(false);
    }
  }, [alunoId, tenant, perfil, divisoes]);

  const autoTriggeredRef = useRef(false);
  useEffect(() => {
    if (
      searchParams.get("auto") === "true" &&
      alunoId && tenant &&
      !generating &&
      exercicios.length === 0 &&
      !autoTriggeredRef.current
    ) {
      autoTriggeredRef.current = true;
      void gerarComIA();
    }
  }, [searchParams, alunoId, tenant, generating, exercicios.length, gerarComIA]);

  const salvarPrescricao = async (manualExercicios?: ExercicioPrescrito[]) => {
    if (!alunoId || !tenant) return;
    const exerciciosToSave = manualExercicios || exercicios;
    setSaving(true);
    await supabase.from("treinos_prescritos").delete().eq("aluno_id", alunoId).eq("tenant_id", tenant.id);
    if (exerciciosToSave.length > 0) {
      const rows = exerciciosToSave.map((e) => ({
        tenant_id: tenant.id,
        aluno_id: alunoId,
        dia_semana: e.dia_semana,
        ordem: e.ordem,
        exercicio: e.exercicio,
        series: e.series,
        repeticoes: e.repeticoes,
        cadencia: e.cadencia,
        detalhes_execucao: e.detalhes_execucao,
        observacao: e.observacao,
      }));
      const { error } = await supabase.from("treinos_prescritos").insert(rows);
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
    }
    toast.success("Prescrição salva!");
    setSaving(false);
  };

  const updateEx = (idx: number, patch: Partial<ExercicioPrescrito>) => {
    setExercicios((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  };
  const removeEx = (idx: number) => setExercicios((prev) => prev.filter((_, i) => i !== idx));
  const addEx = (dia: string) => {
    setExercicios((prev) => [
      ...prev,
      { dia_semana: dia, ordem: prev.filter((e) => e.dia_semana === dia).length, exercicio: "", series: "3", repeticoes: "10-12", observacao: "" },
    ]);
  };

  const dias = [...new Set(exercicios.map((e) => e.dia_semana))];

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <AdminBackButton 
          />
          <h1 className="font-display text-2xl">MONTAR TREINO</h1>
          <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary uppercase font-bold tracking-widest border border-primary/30 shadow-[0_0_10px_rgba(220,38,38,0.2)]">IA Coach</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Selecionar aluno */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-sm">
          <Label>Aluno</Label>
          <select
            value={alunoId}
            onChange={(e) => setAlunoId(e.target.value)}
            className="w-full mt-2 bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">— selecione —</option>
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>{a.nome_completo || a.email}</option>
            ))}
          </select>
        </div>

        {alunoId && (
          <>
            {/* Perfil */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl">PERFIL DO ALUNO</h2>
                <span className="text-xs px-3 py-1 rounded-full bg-primary/15 text-primary uppercase">Nível: {nivel}</span>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <Label>Sexo</Label>
                  <select
                    value={perfil.sexo || ""}
                    onChange={(e) => setPerfil({ ...perfil, sexo: e.target.value })}
                    className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                  </select>
                </div>
                <div><Label>Idade</Label><Input type="number" value={perfil.idade ?? ""} onChange={(e) => setPerfil({ ...perfil, idade: e.target.value ? +e.target.value : null })} /></div>
                <div><Label>Objetivo</Label>
                  <select value={perfil.objetivo || ""} onChange={(e) => setPerfil({ ...perfil, objetivo: e.target.value })}
                    className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm">
                    <option value="hipertrofia">Hipertrofia</option>
                    <option value="emagrecimento">Emagrecimento</option>
                    <option value="forca">Força</option>
                    <option value="saude">Saúde</option>
                  </select>
                </div>
                <div><Label>Peso (kg)</Label><Input type="number" step="0.1" value={perfil.peso_kg ?? ""} onChange={(e) => setPerfil({ ...perfil, peso_kg: e.target.value ? +e.target.value : null })} /></div>
                <div><Label>Altura (cm)</Label><Input type="number" value={perfil.altura_cm ?? ""} onChange={(e) => setPerfil({ ...perfil, altura_cm: e.target.value ? +e.target.value : null })} /></div>
                <div><Label>BF %</Label><Input type="number" step="0.1" value={perfil.bf_pct ?? ""} onChange={(e) => setPerfil({ ...perfil, bf_pct: e.target.value ? +e.target.value : null })} /></div>
                <div><Label>Frequência semanal</Label><Input type="number" min={2} max={6} value={perfil.frequencia_semanal ?? ""} onChange={(e) => setPerfil({ ...perfil, frequencia_semanal: e.target.value ? +e.target.value : null })} /></div>
                <div><Label>Tempo de treino</Label>
                  <select value={perfil.tempo_treino || ""} onChange={(e) => setPerfil({ ...perfil, tempo_treino: e.target.value })}
                    className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm">
                    <option value="Iniciante">Iniciante (&lt; 1 ano)</option>
                    <option value="Intermediário">Intermediário (1-3 anos)</option>
                    <option value="Avançado">Avançado (3+ anos)</option>
                    <option value="Atleta de Alto Nível">Atleta de Alto Nível (competidor)</option>
                  </select>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Lesões (separadas por vírgula)</Label>
                  <Input
                    value={perfil.lesoes.join(", ")}
                    onChange={(e) => setPerfil({ ...perfil, lesoes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    placeholder="ombro, lombar"
                  />
                </div>
                <div>
                  <Label>Limitações</Label>
                  <Input
                    value={perfil.limitacoes.join(", ")}
                    onChange={(e) => setPerfil({ ...perfil, limitacoes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    placeholder="joelho sensível"
                  />
                </div>
              </div>
            </div>

            {/* === ESCOLHA DA DIVISÃO === */}
            <div className="bg-black/40 border border-primary/30 rounded-2xl p-5 shadow-2xl backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl">DIVISÃO DO TREINO</h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary uppercase font-bold tracking-widest border border-primary/30">
                  {presetsDisponiveis.length} opções p/ {perfil.frequencia_semanal}x · {nivel}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Escolha como o aluno vai estruturar a semana. Você pode editar o nome de cada dia depois — a IA vai gerar os exercícios <strong className="text-foreground">respeitando exatamente essa divisão</strong>.
              </p>

              <div className="grid md:grid-cols-2 gap-2">
                {presetsDisponiveis.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setDivisaoSelecionadaId(p.id);
                      setDivisaoCustom(p.dias);
                    }}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      divisaoSelecionadaId === p.id
                        ? "bg-primary/15 border-primary shadow-[0_0_15px_rgba(220,38,38,0.25)]"
                        : "bg-secondary/40 border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="text-sm font-bold mb-1">{p.label}</div>
                    <div className="text-[11px] text-muted-foreground leading-relaxed">
                      {p.dias.map((d, i) => <div key={i}>• {d}</div>)}
                    </div>
                  </button>
                ))}
              </div>

              {divisaoCustom.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Editar nomes dos dias (combinações musculares)
                  </Label>
                  {divisaoCustom.map((dia, i) => (
                    <Input
                      key={i}
                      value={dia}
                      onChange={(e) => {
                        const novo = [...divisaoCustom];
                        novo[i] = e.target.value;
                        setDivisaoCustom(novo);
                        setDivisaoSelecionadaId(""); // marca como customizado
                      }}
                      placeholder={`Dia ${i + 1}`}
                      className="text-sm"
                    />
                  ))}
                </div>
              )}

              {/* === ESTÍMULOS EXTRAS === */}
              <div className="space-y-2 pt-3 border-t border-border/40">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Estímulos extras (opcional)
                </Label>
                <p className="text-[11px] text-muted-foreground">Grupos acessórios que a IA vai distribuir nos dias adequados da divisão.</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Panturrilha",
                    "Antebraço",
                    "Trapézio",
                    "Ombro Lateral",
                    "Ombro Posterior",
                    "Core / Abdômen",
                    "Glúteo Acessório",
                    "Lombar",
                    "Pescoço",
                  ].map((est) => {
                    const ativo = estimulosExtras.includes(est);
                    return (
                      <button
                        key={est}
                        type="button"
                        onClick={() =>
                          setEstimulosExtras((prev) =>
                            ativo ? prev.filter((e) => e !== est) : [...prev, est]
                          )
                        }
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                          ativo
                            ? "bg-primary text-primary-foreground border-primary shadow-[0_0_10px_rgba(220,38,38,0.4)]"
                            : "bg-secondary/40 border-border hover:border-primary/40"
                        }`}
                      >
                        {ativo ? "✓ " : "+ "}{est}
                      </button>
                    );
                  })}
                </div>
                {estimulosExtras.length > 0 && (
                  <p className="text-[11px] text-primary">
                    Incluindo: <strong>{estimulosExtras.join(", ")}</strong>
                  </p>
                )}
              </div>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-sm">
              <div className="text-xs text-muted-foreground mb-3">
                Divisão final: <strong className="text-foreground">{divisoes.join(" · ")}</strong>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => salvarPerfil()} variant="outline">Salvar perfil</Button>
                <Button onClick={() => gerarComIA()} disabled={generating} variant="outline">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Gerar com IA
                </Button>
              </div>
            </div>

            {/* Cardio */}
            {cardio && (
              <div className="bg-accent/10 border border-accent/30 rounded-2xl p-4">
                <p className="text-xs uppercase tracking-wider text-accent font-bold mb-1">Cardio sugerido</p>
                <p className="text-sm">{cardio}</p>
              </div>
            )}

            {/* Editor de prescrição */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-sm space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl">PRESCRIÇÃO</h2>
                <Button onClick={() => salvarPrescricao()} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar prescrição
                </Button>
              </div>

              {dias.length === 0 && (
                <p className="text-sm text-muted-foreground">Sem exercícios. Gere com IA ou adicione manualmente.</p>
              )}

              {dias.map((dia) => (
                <div key={dia} className="border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg">{dia}</h3>
                    <Button size="sm" variant="ghost" onClick={() => addEx(dia)}>
                      <Plus className="h-4 w-4 mr-1" /> Adicionar
                    </Button>
                  </div>
                  {exercicios
                    .map((e, globalIdx) => ({ e, globalIdx }))
                    .filter(({ e }) => e.dia_semana === dia)
                    .map(({ e, globalIdx }) => (
                      <div key={globalIdx} className="grid grid-cols-12 gap-2 items-start border-b border-border/50 pb-4 last:border-0 last:pb-0">
                        <div className="col-span-5 space-y-2">
                          <Input placeholder="Exercício" value={e.exercicio} onChange={(ev) => updateEx(globalIdx, { exercicio: ev.target.value })} />
                          <Input className="text-xs h-8" placeholder="Cadência (ex: 4-0-2-0)" value={e.cadencia} onChange={(ev) => updateEx(globalIdx, { cadencia: ev.target.value })} />
                        </div>
                        <div className="col-span-1">
                          <Input placeholder="Sx" value={e.series} onChange={(ev) => updateEx(globalIdx, { series: ev.target.value })} />
                        </div>
                        <div className="col-span-2">
                          <Input placeholder="Reps" value={e.repeticoes} onChange={(ev) => updateEx(globalIdx, { repeticoes: ev.target.value })} />
                        </div>
                        <div className="col-span-3 space-y-2">
                          <Textarea className="min-h-[40px] text-xs" placeholder="Detalhes de Execução (Coach style)" value={e.detalhes_execucao} onChange={(ev) => updateEx(globalIdx, { detalhes_execucao: ev.target.value })} />
                          <Textarea className="min-h-[40px] text-xs" placeholder="Observação" value={e.observacao} onChange={(ev) => updateEx(globalIdx, { observacao: ev.target.value })} />
                        </div>
                        <Button size="icon" variant="ghost" className="col-span-1 self-center" onClick={() => removeEx(globalIdx)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                </div>
              ))}

              {dias.length === 0 && (
                <Button onClick={() => addEx(divisoes[0] || "Treino A")} variant="outline">
                  <Plus className="h-4 w-4 mr-1" /> Começar do zero
                </Button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminMontarTreino;
