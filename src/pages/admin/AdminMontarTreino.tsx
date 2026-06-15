import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/contexts/BrandingProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Save, Trash2, Plus, ArrowUp, ArrowDown, Video, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { toast } from "sonner";
import { toNivelCanonico } from "@/lib/nivel-experiencia";

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

type DiaGeradoIA = {
  dia?: string;
  exercicios?: Array<{
    nome?: string;
    series?: string;
    repeticoes?: string;
    cadencia?: string;
    detalhes_execucao?: string;
    observacao?: string;
  }>;
};

const normalizarTexto = (texto: string) =>
  texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const tokensMusculares = (texto: string) =>
  normalizarTexto(texto)
    .split(" ")
    .filter((token) => token.length > 2 && !["treino", "dia", "seg", "ter", "qua", "qui", "sex", "sab", "dom", "completa", "completas"].includes(token));

const mapearDiasParaEstrutura = (diasIA: DiaGeradoIA[], divisoes: string[]): ExercicioPrescrito[] => {
  const diasComExercicios = diasIA.filter((d) => Array.isArray(d.exercicios) && d.exercicios.length > 0 && !/\boff\b|descanso/i.test(d.dia || ""));
  const usados = new Set<number>();

  return divisoes.flatMap((diaEstrutura) => {
    const esperados = tokensMusculares(diaEstrutura);
    let idxDia = diasComExercicios.findIndex((d, idx) => {
      if (usados.has(idx)) return false;
      const gerado = normalizarTexto(d.dia || "");
      return esperados.length > 0 && esperados.some((token) => gerado.includes(token));
    });

    if (idxDia < 0) idxDia = diasComExercicios.findIndex((_, idx) => !usados.has(idx));
    if (idxDia < 0) return [];

    usados.add(idxDia);
    return (diasComExercicios[idxDia].exercicios || []).map((e, idx) => ({
      dia_semana: diaEstrutura,
      ordem: idx,
      exercicio: e.nome || "",
      series: e.series || "",
      repeticoes: e.repeticoes || "",
      cadencia: e.cadencia || "",
      detalhes_execucao: e.detalhes_execucao || "",
      observacao: e.observacao || "",
    }));
  });
};

const classificarNivel = (tempo: string | null): "Iniciante" | "Intermediário" | "Avançado" | "Atleta de Alto Nível" => {
  if (!tempo) return "Iniciante";
  const t = tempo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (t.includes("alto")) return "Atleta de Alto Nível";
  if (t.includes("avan") || t.includes("3 a") || t.includes("4 a") || t.includes("5+")) return "Avançado";
  if (t.includes("inter") || t.includes("1 a") || t.includes("2 a")) return "Intermediário";
  return "Iniciante";
};

// === PRESETS DE DIVISÃO (baseados no curso "Além da Genética") ===
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
  { id: "ul-2x", label: "Upper/Lower 2x — Intermediário/Avançado", freq: 2, publico: "unisex", nivel: ["Intermediário", "Avançado", "Atleta de Alto Nível"], dias: ["Upper — Peito/Costas/Ombro/Braços", "Lower — Pernas Completas"] },
  { id: "fem-2x-ini", label: "Mulher 2x Iniciante — Inferior Glúteo / Superior Leve", freq: 2, publico: "feminino", nivel: ["Iniciante"], dias: ["A — Glúteo/Posterior/Quadríceps (técnica)", "B — Superior Leve + Glúteo Acessório"] },
  { id: "fem-2x-ab", label: "Mulher 2x Intermediária — Inferior/Superior", freq: 2, publico: "feminino", nivel: ["Intermediário"], dias: ["A — Glúteo/Posterior/Quadríceps", "B — Superior + Glúteo Acessório"] },
  { id: "fem-2x-av", label: "Mulher 2x Avançada — Glúteo Foco / Full Superior", freq: 2, publico: "feminino", nivel: ["Avançado", "Atleta de Alto Nível"], dias: ["A — Glúteo/Posterior (alta intensidade)", "B — Superior Completo + Quadríceps"] },

  // ===== 3x semana =====
  { id: "ini-3x-fb", label: "Iniciante 3x — Full Body ABC", freq: 3, publico: "unisex", nivel: ["Iniciante"], dias: ["A — Full Body (ênfase Pernas)", "B — Full Body (ênfase Peito/Costas)", "C — Full Body (ênfase Ombro/Braços)"] },
  { id: "ppl-3x", label: "PPL 3x — Push / Pull / Legs", freq: 3, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["Push — Peito/Ombro/Tríceps", "Pull — Costas/Bíceps", "Legs — Pernas Completas"] },
  { id: "abc-peitotri", label: "ABC 3x — Peito+Tríceps / Costas+Bíceps / Pernas", freq: 3, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["A — Peito + Tríceps + Ombro Anterior", "B — Costas + Bíceps + Ombro Posterior", "C — Pernas Completas"] },
  { id: "abc-peitobi", label: "ABC 3x — Peito+Bíceps / Costas+Tríceps / Pernas", freq: 3, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["A — Peito + Bíceps", "B — Costas + Tríceps", "C — Pernas + Ombro"] },
  { id: "fem-3x-ini", label: "Mulher 3x Iniciante — Inferior/Superior/Glúteo", freq: 3, publico: "feminino", nivel: ["Iniciante"], dias: ["A — Inferior (Quadríceps/Posterior técnica)", "B — Superior Leve + Core", "C — Glúteo + Panturrilha"] },
  { id: "fem-3x-int", label: "Mulher 3x Intermediária — Glúteo 2x", freq: 3, publico: "feminino", nivel: ["Intermediário"], dias: ["A — Glúteo/Posterior", "B — Superior (Costas/Ombro/Peito leve)", "C — Quadríceps/Panturrilha + Glúteo Acessório"] },
  { id: "fem-3x-av", label: "Mulher 3x Avançada — Glúteo 2x + Quadríceps", freq: 3, publico: "feminino", nivel: ["Avançado", "Atleta de Alto Nível"], dias: ["A — Glúteo/Posterior (pesado)", "B — Quadríceps + Panturrilha", "C — Superior + Glúteo Acessório"] },

  // ===== 4x semana =====
  { id: "ini-4x-fb", label: "Iniciante 4x — Full Body ABCD", freq: 4, publico: "unisex", nivel: ["Iniciante"], dias: ["A — Full Body (Pernas)", "B — Full Body (Peito/Costas)", "C — Full Body (Ombro/Braços)", "D — Full Body (Posterior/Core)"] },
  { id: "abcd-peitotri", label: "ABCD 4x — Peito+Tri / Costas+Bi / Pernas / Ombro", freq: 4, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["A — Peito + Tríceps", "B — Costas + Bíceps", "C — Pernas Completas", "D — Ombro + Trapézio + Braços"] },
  { id: "abcd-peitobi", label: "ABCD 4x — Peito+Bi / Costas+Tri / Pernas / Ombro", freq: 4, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["A — Peito + Bíceps", "B — Costas + Tríceps", "C — Pernas Completas", "D — Ombro + Trapézio + Antebraço"] },
  { id: "ppl-ul-4x", label: "Upper/Lower 4x — 2x Superior + 2x Inferior", freq: 4, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["Upper A — Peito/Costas/Ombro", "Lower A — Quadríceps/Glúteo", "Upper B — Braços/Ombro Lateral", "Lower B — Posterior/Panturrilha"] },
  { id: "ppl-abc-4x", label: "PPL+1 4x — Push / Pull / Legs / Ênfase Fraco", freq: 4, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["Push — Peito/Ombro/Tríceps", "Pull — Costas/Bíceps", "Legs — Pernas", "D — Ênfase Ponto Fraco"] },
  { id: "fem-4x-ini", label: "Mulher 4x Iniciante — Inferior/Superior alternado", freq: 4, publico: "feminino", nivel: ["Iniciante"], dias: ["A — Glúteo/Posterior (técnica)", "B — Superior Leve (Costas/Ombro)", "C — Quadríceps/Panturrilha", "D — Glúteo Acessório + Core"] },
  { id: "fem-4x-ab", label: "Mulher 4x Intermediária — Glúteo/Quad alternado", freq: 4, publico: "feminino", nivel: ["Intermediário"], dias: ["A — Glúteo/Posterior", "B — Peito/Ombro", "C — Glúteo/Quadríceps", "D — Costas/Braços"] },
  { id: "fem-4x-ul", label: "Mulher 4x Avançada — Upper/Lower com foco Glúteo", freq: 4, publico: "feminino", nivel: ["Avançado", "Atleta de Alto Nível"], dias: ["Lower A — Glúteo/Posterior", "Upper A — Costas/Ombro", "Lower B — Quadríceps/Glúteo", "Upper B — Peito/Braços"] },

  // ===== 5x semana =====
  { id: "abcde-inf", label: "ABCDE 5x — Ênfase Inferiores", freq: 5, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["A — Quadríceps", "B — Peito + Tríceps", "C — Costas + Bíceps", "D — Posterior + Glúteo", "E — Ombro + Trapézio"] },
  { id: "abcde-sup", label: "ABCDE 5x — Ênfase Superiores", freq: 5, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["A — Peito (Foco)", "B — Costas (Largura)", "C — Pernas Completas", "D — Ombro Completo", "E — Braços (Bi+Tri)"] },
  { id: "ppl-ul-5x", label: "PPL+UL 5x — Push/Pull/Legs/Upper/Lower", freq: 5, publico: "unisex", nivel: ["Avançado"], dias: ["Push", "Pull", "Legs", "Upper (Ênfase fraco)", "Lower (Ênfase fraco)"] },
  { id: "fem-5x-ini", label: "Mulher 5x Iniciante — Distribuído com técnica", freq: 5, publico: "feminino", nivel: ["Iniciante"], dias: ["A — Glúteo/Posterior (técnica)", "B — Superior Leve (Costas/Ombro)", "C — Quadríceps/Panturrilha", "D — Glúteo Acessório + Core", "E — Full Body Leve (revisão)"] },
  { id: "fem-5x-int", label: "Mulher 5x Intermediária — Glúteo 2x + Quad", freq: 5, publico: "feminino", nivel: ["Intermediário"], dias: ["A — Glúteo/Posterior", "B — Peito/Ombro", "C — Quadríceps + Panturrilha", "D — Glúteo Acessório", "E — Costas/Braços"] },
  { id: "fem-5x-quad", label: "Mulher 5x Avançada — Ênfase Quadríceps", freq: 5, publico: "feminino", nivel: ["Avançado", "Atleta de Alto Nível"], dias: ["A — Quadríceps", "B — Glúteo/Posterior", "C — Peito/Ombro", "D — Quadríceps + Panturrilha", "E — Costas/Braços"] },
  { id: "abcde-classic-pacho", label: "ABCDE 5x — Clássica (Peito+Tri / Costas+Bi / Pernas Quad / Ombro / Pernas Posterior)", freq: 5, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["Seg — Peito + Tríceps + Estímulo Anterior de Ombro", "Ter — Costas + Bíceps + Estímulo Posterior de Ombro", "Qua — Perna Completa (ênfase Quadríceps)", "Sex — Ombro Completo (Anterior/Lateral/Posterior + Trapézio)", "Sáb — Perna Completa (ênfase Posterior + Glúteo)"] },
  { id: "abcde-dorsal-sab", label: "ABCDE 5x — Sábado Dorsal+Peito (ênfase Dorsal)", freq: 5, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["Seg — Peito + Tríceps + Estímulo Anterior de Ombro", "Ter — Costas + Bíceps + Estímulo Posterior de Ombro", "Qua — Perna Completa (ênfase Quadríceps + Panturrilha)", "Sex — Ombro Completo (Anterior/Lateral/Posterior + Trapézio)", "Sáb — Costas + Peito (ênfase Dorsal — Largura e Espessura)"] },

  // ===== 6x semana =====
  { id: "abcdef-av", label: "ABCDEF 6x — Super Avançado (1 músculo/dia)", freq: 6, publico: "unisex", nivel: ["Avançado", "Atleta de Alto Nível"], dias: ["A — Peito", "B — Costas", "C — Pernas (Quad)", "D — Ombro", "E — Braços (Bi+Tri)", "F — Posterior + Trapézio"] },
  { id: "ppl-2x", label: "PPL 6x — Push/Pull/Legs 2x semana", freq: 6, publico: "unisex", nivel: ["Avançado"], dias: ["Push A", "Pull A", "Legs A (Quad)", "Push B", "Pull B", "Legs B (Posterior)"] },
  { id: "fem-6x-int", label: "Mulher 6x Intermediária — Glúteo 3x", freq: 6, publico: "feminino", nivel: ["Intermediário"], dias: ["A — Glúteo/Posterior", "B — Costas/Ombro", "C — Quadríceps + Panturrilha", "D — Glúteo Acessório + Core", "E — Peito/Braços", "F — Glúteo/Posterior (volume)"] },
  { id: "fem-6x-av", label: "Mulher 6x Avançada — Glúteo 3x + Quad 2x", freq: 6, publico: "feminino", nivel: ["Avançado", "Atleta de Alto Nível"], dias: ["A — Glúteo (pesado)", "B — Quadríceps", "C — Costas/Ombro", "D — Glúteo/Posterior", "E — Peito/Braços", "F — Quadríceps + Panturrilha"] },
];

// Para mulheres priorizamos SEMPRE presets femininos quando existirem para a
// (freq × nível) — Full Body unisex só entra como fallback se nenhum preset
// feminino daquele perfil existir. Isso evita que iniciantes/intermediárias/
// avançadas caiam em Full Body genérico masculino.
const filtrarPresets = (frequencia: number, sexo: string | null, nivel: string) => {
  const fem = !!sexo?.toLowerCase().startsWith("f");
  if (fem) {
    const femPresets = DIVISOES_PRESETS.filter(
      (p) => p.freq === frequencia && p.publico === "feminino" && p.nivel.includes(nivel as any)
    );
    if (femPresets.length > 0) return femPresets;
    // fallback: unisex compatível com o nível
    return DIVISOES_PRESETS.filter(
      (p) => p.freq === frequencia && p.publico === "unisex" && p.nivel.includes(nivel as any)
    );
  }
  return DIVISOES_PRESETS.filter(
    (p) => p.freq === frequencia && p.publico === "unisex" && p.nivel.includes(nivel as any)
  );
};

const sugerirDivisoes = (frequencia: number, sexo: string | null, nivel: string): string[] => {
  const candidatos = filtrarPresets(frequencia, sexo, nivel);
  return candidatos[0]?.dias || ["Treino A", "Treino B", "Treino C", "Treino D"];
};

const contemFullBody = (texto: string) => /full\s*body|corpo\s*todo/i.test(texto);
const fullBodyBloqueado = (nivel: string, divisoes: string[]) =>
  nivel !== "Iniciante" && divisoes.some(contemFullBody);

const AdminMontarTreino = () => {
  const [searchParams] = useSearchParams();
  const { tenant } = useBranding();
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
  const [pendingReview, setPendingReview] = useState(false);
  const [perfilLoading, setPerfilLoading] = useState(Boolean(searchParams.get("aluno")));
  const [divisaoSelecionadaId, setDivisaoSelecionadaId] = useState<string>("");
  const [divisaoCustom, setDivisaoCustom] = useState<string[]>([]);
  const [estimulosExtras, setEstimulosExtras] = useState<string[]>([]);
  const [biblioteca, setBiblioteca] = useState<Array<{ id: string; nome: string; grupo_muscular: string; video_url: string | null; video_coach_url: string | null }>>([]);

  useEffect(() => {
    if (!tenant) return;
    void (async () => {
      // Merge biblioteca tenant-scoped + referencia_exercicios (vídeos técnicos globais)
      const [bibRes, refRes] = await Promise.all([
        supabase
          .from("biblioteca_exercicios")
          .select("id, nome, grupo_muscular, video_url, video_coach_url")
          .eq("tenant_id", tenant.id),
        supabase
          .from("referencia_exercicios")
          .select("id, nome_exercicio, grupamento_muscular, url_video"),
      ]);
      const bib = ((bibRes.data as any[]) || []).map((b) => ({
        id: b.id,
        nome: b.nome,
        grupo_muscular: b.grupo_muscular || "",
        video_url: b.video_url,
        video_coach_url: b.video_coach_url,
      }));
      const ref = ((refRes.data as any[]) || []).map((r) => ({
        id: r.id,
        nome: r.nome_exercicio,
        grupo_muscular: r.grupamento_muscular || "",
        video_url: r.url_video,
        video_coach_url: null as string | null,
      }));
      // Dedup por nome normalizado, biblioteca tenant tem prioridade
      const seen = new Set<string>();
      const merged: typeof bib = [];
      for (const item of [...bib, ...ref]) {
        const key = normalizarTexto(item.nome || "");
        if (!key || seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
      }
      merged.sort((a, b) => a.nome.localeCompare(b.nome));
      setBiblioteca(merged);
    })();
  }, [tenant]);

  useEffect(() => {
    if (!tenant) return;
    void (async () => {
      const { data } = await supabase
        .from("perfis")
        .select("id, nome_completo, email")
        .eq("tenant_id", tenant.id);
      setAlunos(((data as Aluno[]) || []).filter((a) => a.id !== tenant.owner_user_id));
    })();
  }, [tenant]);

  useEffect(() => {
    if (!alunoId || !tenant) {
      setPerfilLoading(false);
      return;
    }
    void (async () => {
      setPerfilLoading(true);
      setExercicios([]);
      setCardio("");
      setPendingReview(false);
      // Buscar em paralelo todas as fontes do perfil real do aluno
      const [perfilTreinoRes, perfilRes, avaliacaoRes, anamneseRes] = await Promise.all([
        supabase.from("perfis_treino").select("*").eq("aluno_id", alunoId).maybeSingle(),
        supabase.from("perfis").select("sexo, data_nascimento").eq("id", alunoId).maybeSingle(),
        supabase.from("avaliacoes_fisicas").select("peso_kg, altura_cm, bf_pct_calculado, idade, sexo").eq("aluno_id", alunoId).order("data", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("anamnese_aluno").select("nivel_experiencia, anos_treino, lesoes_atuais, doencas, disponibilidade_dias").eq("aluno_id", alunoId).maybeSingle(),
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
      const tempoMesclado = toNivelCanonico(pt?.tempo_treino || an?.nivel_experiencia) || "Iniciante";

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
        frequencia_semanal: pt?.frequencia_semanal || (Array.isArray(an?.disponibilidade_dias) && an.disponibilidade_dias.length >= 2 ? Math.min(6, an.disponibilidade_dias.length) : 4),
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
      setExercicios([]);
      if (tp && tp.length > 0) {
        toast.info(`Já existe um treino salvo para este aluno (${tp.length} exercícios). Gere e revise para substituir.`);
      }
      setPerfilLoading(false);
    })();
  }, [alunoId, tenant]);

  const nivel = useMemo(() => classificarNivel(perfil.tempo_treino), [perfil.tempo_treino]);

  // Presets aplicáveis ao perfil atual (freq + sexo + nível)
  const presetsDisponiveis = useMemo(() => {
    return filtrarPresets(perfil.frequencia_semanal || 4, perfil.sexo, nivel);
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

  const prepararGeracaoDaDivisao = (preset?: DivisaoPreset) => {
    setPendingReview(false);
    setCardio("");
    setExercicios([]);
    if (preset) {
      setDivisaoSelecionadaId(preset.id);
      setDivisaoCustom(preset.dias);
      void gerarComIA(preset.dias);
      return;
    }
    void gerarComIA(divisoes);
  };

  const gerarComIA = async (divisoesParaGerar = divisoes, customPrompt?: string) => {
    if (!alunoId || !tenant) {
      toast.error("Selecione um aluno.");
      return;
    }
    if (perfilLoading) {
      toast.error("Aguarde carregar os dados do aluno antes de gerar.");
      return;
    }
    if (fullBodyBloqueado(nivel, divisoesParaGerar)) {
      toast.error("Full Body é permitido apenas para iniciantes. Escolha uma divisão split.");
      return;
    }
    if (!divisoesParaGerar.length) {
      toast.error("Escolha uma divisão antes de gerar o treino.");
      return;
    }
    setGenerating(true);
    try {
      await salvarPerfil(true);
      // Usa a biblioteca já mesclada (biblioteca_exercicios + referencia_exercicios/vídeos técnicos)
      // para garantir que a IA gere com os MESMOS nomes que têm vídeo cadastrado.
      const bibliotecaParaIA = biblioteca.map((b) => ({
        nome: b.nome,
        grupo_muscular: b.grupo_muscular,
        tem_video: !!(b.video_coach_url || b.video_url),
      }));

      const promptFromUrl = searchParams.get("prompt");
      const activePrompt = customPrompt || promptFromUrl || "";

      const { data, error } = await supabase.functions.invoke("gerar-treino-ia", {
        body: { perfil: { ...perfil, aluno_id: alunoId }, biblioteca: bibliotecaParaIA, divisoes: divisoesParaGerar, tenant_id: tenant.id, prompt: activePrompt, estimulos_extras: estimulosExtras },
      });
      if (error) throw error;
      if ((data as any)?.error && !(data as any)?.fallback) throw new Error((data as any).error);

      const novos = mapearDiasParaEstrutura((data.dias || []) as DiaGeradoIA[], divisoesParaGerar);
      if (novos.length === 0) throw new Error("A IA não retornou exercícios para a divisão escolhida. Tente gerar novamente.");
      setExercicios(novos);
      setCardio(data.cardio || "");
      setPendingReview(true);
      if ((data as any)?.fallback) {
        toast.warning((data as any).error || "Rascunho gerado para revisão porque a IA oscilou.");
      } else {
        toast.success(`Treino gerado · ${novos.length} exercícios — revise antes de salvar`);
      }

      if (searchParams.get("andDiet") === "true") {
        toast.info("Revise e confirme o treino antes de montar a dieta.");
      }
    } catch (e: any) {
      toast.error(e.message || "Falha ao gerar.");
    } finally {
      setGenerating(false);
    }
  };

  const salvarPrescricao = async (manualExercicios?: ExercicioPrescrito[]) => {
    if (!alunoId || !tenant) return;
    const exerciciosToSave = manualExercicios || exercicios;
    if (exerciciosToSave.length === 0) {
      toast.error("Gere ou adicione exercícios antes de salvar.");
      return;
    }
    setSaving(true);
    try {
      const { data: alunoTenant, error: alunoError } = await supabase
        .from("perfis")
        .select("tenant_id")
        .eq("id", alunoId)
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      if (alunoError) throw alunoError;
      if (!alunoTenant) throw new Error("Este aluno não pertence a este tenant.");

      const { error: deleteError } = await supabase
        .from("treinos_prescritos")
        .delete()
        .eq("aluno_id", alunoId)
        .eq("tenant_id", tenant.id);
      if (deleteError) throw deleteError;

      const rows = exerciciosToSave.map((e) => ({
        tenant_id: tenant.id,
        aluno_id: alunoId,
        dia_semana: e.dia_semana,
        ordem: e.ordem,
        ordem_execucao: e.ordem,
        exercicio: e.exercicio,
        series: e.series,
        repeticoes: e.repeticoes,
        cadencia: e.cadencia,
        detalhes_execucao: e.detalhes_execucao,
        observacao: e.observacao,
        status: "ativo",
      }));
      const { error } = await supabase.from("treinos_prescritos").insert(rows);
      if (error) throw error;
      toast.success(`Prescrição salva para o aluno · ${rows.length} exercícios`);
      
      // Enviar notificação push
      try {
        await supabase.functions.invoke("fcm-notifications", {
          body: {
            user_id: alunoId,
            title: "Novo Treino Disponível! 🏋️‍♂️",
            body: "Seu coach atualizou sua ficha de treino. Confira agora no app!",
          },
        });
      } catch (pushErr) {
        console.error("Erro ao enviar push:", pushErr);
      }

      setPendingReview(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar prescrição.");
    } finally {
      setSaving(false);
    }
  };

  const updateEx = (idx: number, patch: Partial<ExercicioPrescrito>) => {
    setExercicios((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  };
  const removeEx = (idx: number) => setExercicios((prev) => prev.filter((_, i) => i !== idx));
  const renameDia = (oldName: string, newName: string) => {
    const trimmed = (newName || "").trim();
    if (!trimmed || trimmed === oldName) return;
    setExercicios((prev) => {
      // evita colisão com dia existente
      if (prev.some((e) => e.dia_semana === trimmed)) {
        toast.error(`Já existe um dia chamado "${trimmed}".`);
        return prev;
      }
      return prev.map((e) => (e.dia_semana === oldName ? { ...e, dia_semana: trimmed } : e));
    });
  };
  const addEx = (dia: string) => {
    setExercicios((prev) => [
      ...prev,
      { dia_semana: dia, ordem: prev.filter((e) => e.dia_semana === dia).length, exercicio: "", series: "3", repeticoes: "10-12", observacao: "" },
    ]);
  };
  const moveEx = (globalIdx: number, dir: -1 | 1) => {
    setExercicios((prev) => {
      const item = prev[globalIdx];
      if (!item) return prev;
      const sameDayIdx = prev
        .map((e, i) => ({ e, i }))
        .filter(({ e }) => e.dia_semana === item.dia_semana)
        .map(({ i }) => i);
      const pos = sameDayIdx.indexOf(globalIdx);
      const targetPos = pos + dir;
      if (targetPos < 0 || targetPos >= sameDayIdx.length) return prev;
      const swapWith = sameDayIdx[targetPos];
      const next = [...prev];
      [next[globalIdx], next[swapWith]] = [next[swapWith], next[globalIdx]];
      // recompute ordem per day
      const counters: Record<string, number> = {};
      return next.map((e) => {
        const ord = counters[e.dia_semana] ?? 0;
        counters[e.dia_semana] = ord + 1;
        return { ...e, ordem: ord };
      });
    });
  };

  const suggestionsForDia = (dia: string) => {
    const tokens = tokensMusculares(dia);
    if (tokens.length === 0) return biblioteca;
    return biblioteca.filter((b) => {
      const hay = normalizarTexto(`${b.grupo_muscular} ${b.nome}`);
      return tokens.some((t) => hay.includes(t));
    });
  };

  const dias = [...new Set(exercicios.map((e) => e.dia_semana))];

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <AdminBackButton />
          <h1 className="font-display text-base sm:text-2xl truncate">MONTAR TREINO</h1>
          <span className="shrink-0 text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded bg-primary/20 text-primary uppercase font-bold tracking-wider border border-primary/30">IA Coach</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6 pb-24">
        {/* Selecionar aluno */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-3 sm:p-5 shadow-2xl backdrop-blur-sm">
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
            <div className="bg-black/40 border border-white/10 rounded-2xl p-3 sm:p-5 shadow-2xl backdrop-blur-sm space-y-4">
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
                <div><Label>Pescoço (cm)</Label><Input type="number" value={perfil.pescoco_cm ?? ""} onChange={(e) => setPerfil({ ...perfil, pescoco_cm: e.target.value ? +e.target.value : null })} /></div>
                <div><Label>Cintura (cm)</Label><Input type="number" value={perfil.cintura_cm ?? ""} onChange={(e) => setPerfil({ ...perfil, cintura_cm: e.target.value ? +e.target.value : null })} /></div>
                <div><Label>Quadril (cm)</Label><Input type="number" value={perfil.quadril_cm ?? ""} onChange={(e) => setPerfil({ ...perfil, quadril_cm: e.target.value ? +e.target.value : null })} /></div>
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
            <div className="bg-black/40 border border-primary/30 rounded-2xl p-3 sm:p-5 shadow-2xl backdrop-blur-sm space-y-4">
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
                    onClick={() => prepararGeracaoDaDivisao(p)}
                    disabled={generating || perfilLoading}
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
                    <div className="text-[10px] text-primary uppercase font-bold tracking-widest mt-2">
                      {generating && divisaoSelecionadaId === p.id ? "Gerando..." : "Tocar para gerar e revisar"}
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

            <div className="bg-black/40 border border-white/10 rounded-2xl p-3 sm:p-5 shadow-2xl backdrop-blur-sm">
              <div className="text-xs text-muted-foreground mb-3">
                {perfilLoading ? "Carregando dados reais do aluno..." : <>Divisão final: <strong className="text-foreground">{divisoes.join(" · ")}</strong></>}
              </div>
              <div className="flex gap-3">
                <Button onClick={() => salvarPerfil()} variant="outline">Salvar perfil</Button>
                <Button onClick={() => prepararGeracaoDaDivisao()} disabled={generating || perfilLoading} variant="outline">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  {perfilLoading ? "Aguardando perfil" : "Gerar e revisar"}
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

            {/* Banner de revisão pós IA */}
            {pendingReview && exercicios.length > 0 && (
              <div className="bg-primary/10 border border-primary/40 rounded-2xl p-4 sm:p-5 shadow-[0_0_25px_-8px_hsl(var(--primary)/0.6)] animate-in fade-in slide-in-from-top-2">
                <p className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold mb-1">Revisão necessária</p>
                <h3 className="font-display text-base sm:text-lg leading-tight">A IA gerou {exercicios.length} exercícios. Confira tudo antes de enviar ao aluno.</h3>
                <p className="text-xs text-muted-foreground mt-2">Edite o que precisar abaixo. O treino só vai para o aluno quando você clicar em <strong className="text-foreground">Confirmar e enviar</strong>.</p>
                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                  <Button onClick={() => salvarPrescricao()} disabled={saving} className="flex-1">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Confirmar e enviar ao aluno
                  </Button>
                  <Button onClick={() => prepararGeracaoDaDivisao()} disabled={generating} variant="outline" className="flex-1">
                    {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Refazer com IA
                  </Button>
                </div>
              </div>
            )}

            {/* Editor de prescrição */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-3 sm:p-5 shadow-2xl backdrop-blur-sm space-y-4 sm:space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h2 className="font-display text-lg sm:text-xl">PRESCRIÇÃO</h2>
                <Button onClick={() => salvarPrescricao()} disabled={saving} size="sm" className="w-full sm:w-auto">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  {pendingReview ? "Confirmar e enviar" : "Salvar prescrição"}
                </Button>
              </div>

              {dias.length === 0 && (
                <p className="text-sm text-muted-foreground">Sem exercícios. Gere com IA ou adicione manualmente.</p>
              )}

              {dias.map((dia) => (
                <div key={dia} className="border border-border rounded-xl p-3 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      defaultValue={dia}
                      onBlur={(ev) => renameDia(dia, ev.target.value)}
                      onKeyDown={(ev) => { if (ev.key === "Enter") (ev.target as HTMLInputElement).blur(); }}
                      className="flex-1 min-w-0 font-display text-sm sm:text-lg h-9 bg-transparent border-dashed"
                      title="Edite o nome do treino do dia (ex: Peito e Tríceps)"
                    />
                    <Button size="sm" variant="ghost" onClick={() => addEx(dia)} className="shrink-0 h-8 px-2 text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                    </Button>
                  </div>
                  {exercicios
                    .map((e, globalIdx) => ({ e, globalIdx }))
                    .filter(({ e }) => e.dia_semana === dia)
                    .map(({ e, globalIdx }, localIdx, arr) => {
                      const sugestoes = suggestionsForDia(dia);
                      const match = biblioteca.find((b) => normalizarTexto(b.nome) === normalizarTexto(e.exercicio || ""));
                      const temVideo = !!(match?.video_coach_url || match?.video_url);
                      return (
                      <div key={globalIdx} className="bg-secondary/30 border border-border/60 rounded-lg p-3 space-y-2.5 relative">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase tracking-wider text-primary font-bold">Exercício {localIdx + 1}</span>
                            {temVideo && (
                              <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider text-emerald-400 font-bold">
                                <Video className="h-3 w-3" /> vídeo
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={localIdx === 0} onClick={() => moveEx(globalIdx, -1)} title="Mover para cima">
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={localIdx === arr.length - 1} onClick={() => moveEx(globalIdx, 1)} title="Mover para baixo">
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeEx(globalIdx)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nome do exercício</Label>
                          <Popover>
                            <div className="flex gap-1 mt-1">
                              <Input
                                placeholder="Ex: Supino Reto"
                                value={e.exercicio}
                                onChange={(ev) => updateEx(globalIdx, { exercicio: ev.target.value })}
                                className="flex-1"
                              />
                              <PopoverTrigger asChild>
                                <Button type="button" variant="outline" size="sm" className="shrink-0 px-2" title="Escolher dos exercícios salvos (com vídeo)">
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </Button>
                              </PopoverTrigger>
                            </div>
                            <PopoverContent align="end" className="w-[280px] p-0 max-h-80 overflow-auto">
                              <div className="p-2 border-b border-border/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                                Da biblioteca · {sugestoes.length} sugestões
                              </div>
                              {sugestoes.length === 0 ? (
                                <div className="p-3 text-xs text-muted-foreground">Nenhum exercício salvo para esse grupo. Cadastre na Biblioteca.</div>
                              ) : (
                                <ul className="divide-y divide-border/30">
                                  {sugestoes.map((b) => (
                                    <li key={b.id}>
                                      <button
                                        type="button"
                                        onClick={(ev) => {
                                          updateEx(globalIdx, { exercicio: b.nome });
                                          // close popover
                                          (ev.currentTarget.closest("[data-radix-popper-content-wrapper]") as HTMLElement | null)
                                            ?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
                                        }}
                                        className="w-full text-left px-3 py-2 hover:bg-primary/10 flex items-center justify-between gap-2"
                                      >
                                        <span className="text-xs truncate">{b.nome}</span>
                                        <span className="text-[9px] uppercase text-muted-foreground shrink-0">{b.grupo_muscular}</span>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Séries</Label>
                            <Input placeholder="4" value={e.series} onChange={(ev) => updateEx(globalIdx, { series: ev.target.value })} className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Reps</Label>
                            <Input placeholder="8-12" value={e.repeticoes} onChange={(ev) => updateEx(globalIdx, { repeticoes: ev.target.value })} className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Cadência</Label>
                            <Input placeholder="3-1-X-0" value={e.cadencia} onChange={(ev) => updateEx(globalIdx, { cadencia: ev.target.value })} className="mt-1" />
                          </div>
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Detalhes de execução</Label>
                          <Textarea className="min-h-[60px] text-xs mt-1" placeholder="Ex: warm-up sets, RPE, técnica..." value={e.detalhes_execucao} onChange={(ev) => updateEx(globalIdx, { detalhes_execucao: ev.target.value })} />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Observação</Label>
                          <Textarea className="min-h-[50px] text-xs mt-1" placeholder="Observações para o aluno..." value={e.observacao} onChange={(ev) => updateEx(globalIdx, { observacao: ev.target.value })} />
                        </div>
                      </div>
                      );
                    })}
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
