import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Dumbbell, Music, Loader2, Trophy, Clock, Flame, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/contexts/BrandingProvider";
import { PageHeader } from "@/components/aluno/PageHeader";
import { TenantSymbol } from "@/components/TenantSymbol";
import { ExerciseCard, ExerciseCardData } from "@/components/aluno/ExerciseCard";
import { useAvatarVariant } from "@/hooks/use-avatar-variant";
import { TreinoConclusaoCard } from "@/components/aluno/TreinoConclusaoCard";
import { filtrarPresetsParaAluno, type DivisaoPreset, type Nivel } from "@/data/divisoesPresets";
import { toNivelCanonico } from "@/lib/nivel-experiencia";

interface Treino extends ExerciseCardData {
  dia_semana: string;
}

interface CargaMap {
  [exercicio: string]: { carga_kg: number; repeticoes_feitas: number; data_treino: string };
}

type VideoRef = { yt: string | null; coach: string | null };

const VOLUME_GROUPS = ["peito", "costas", "quadríceps", "quadriceps", "glúteo", "gluteo", "ombro", "bíceps", "biceps", "tríceps", "triceps"];
const MIN_EXERCISES_PER_DAY = 4;


const Treino = () => {
  const { user } = useAuth();
  const { tenant } = useBranding();
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [treinos, setTreinos] = useState<Treino[]>([]);
  const [observacaoClinica, setObservacaoClinica] = useState<string | null>(null);
  const [diaAtual, setDiaAtual] = useState<string>(() => sessionStorage.getItem("treino:diaAtual") || "");
  const [isMock, setIsMock] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(() => {
    const v = sessionStorage.getItem("treino:activeIndex");
    return v !== null && v !== "" ? Number(v) : null;
  });
  const [cargas, setCargas] = useState<CargaMap>({});
  const [spotifyLink, setSpotifyLink] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showConclusao, setShowConclusao] = useState(false);
  const [nivelExperiencia, setNivelExperiencia] = useState<string | null>(null);
  const [sexo, setSexo] = useState<string | null>(null);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [generatingPresetId, setGeneratingPresetId] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [avatarPerfil, setAvatarPerfil] = useState<string | null>(null);
  const [stats, setStats] = useState<{ treinos: number; minutos: number; sequencia: number }>({ treinos: 0, minutos: 0, sequencia: 0 });
  const isoWeekKey = (() => {
    const d = new Date();
    const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNr = (target.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNr + 3);
    const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
    return `${target.getUTCFullYear()}-W${week}`;
  })();
  const completedKey = `treino:completed:${user?.id || "anon"}:${isoWeekKey}:${diaAtual}`;
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  // Dias da semana ISO atual cujo treino já foi concluído (vem do banco)
  const [completedDaysWeek, setCompletedDaysWeek] = useState<Set<string>>(new Set());
  // Recarrega completedIds quando muda dia/semana/usuário
  useEffect(() => {
    try {
      const raw = localStorage.getItem(completedKey);
      setCompletedIds(new Set<string>(raw ? JSON.parse(raw) : []));
    } catch { setCompletedIds(new Set<string>()); }
  }, [completedKey]);
  const markCompleted = (id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev); next.add(id);
      try { localStorage.setItem(completedKey, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  // Helpers de semana (segunda 00:00 -> domingo 23:59) no horário local
  const weekRange = (() => {
    const d = new Date();
    const day = d.getDay(); // 0=Dom..6=Sáb
    const diffToMonday = (day === 0 ? -6 : 1 - day);
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (x: Date) => x.toISOString().split("T")[0];
    return { startDate: fmt(monday), endDate: fmt(sunday) };
  })();

  // Carrega dias da semana atual já concluídos a partir do banco (historico_cargas)
  const loadCompletedDaysWeek = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("historico_cargas")
      .select("exercicio_nome, data_treino")
      .eq("user_id", user.id)
      .gte("data_treino", weekRange.startDate)
      .lte("data_treino", weekRange.endDate)
      .like("exercicio_nome", "__treino_concluido__:%");
    const dias = new Set<string>();
    (data || []).forEach((r: any) => {
      const dia = (r.exercicio_nome as string).split("__treino_concluido__:")[1];
      if (dia) dias.add(dia);
    });
    setCompletedDaysWeek(dias);
  };
  useEffect(() => { void loadCompletedDaysWeek(); }, [user?.id, reloadKey]);

  const resetTreinoDoDia = () => {
    // Limpa estado dos cards do dia (carga/reps/done) e a marcação de concluído
    treinosDoDia.forEach((t) => {
      try { localStorage.removeItem(`treino-state:${user?.id || "anon"}:${t.id}:${isoWeekKey}`); } catch {}
    });
    try { localStorage.removeItem(completedKey); } catch {}
    setCompletedIds(new Set());
    setActiveIndex(null);
    setReloadKey((k) => k + 1);
  };

  // Carrega nível de experiência + avatar do perfil
  useEffect(() => {
    if (!user) return;
    supabase
      .from("anamnese_aluno")
      .select("nivel_experiencia, disponibilidade_dias")
      .eq("aluno_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setNivelExperiencia(data?.nivel_experiencia || null);
        const dd = ((data as any)?.disponibilidade_dias as string[]) || [];
        const ORDER = ["seg", "ter", "qua", "qui", "sex", "sáb", "sab", "dom"];
        const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").slice(0, 3);
        const sorted = [...dd].sort((a, b) => {
          const ia = ORDER.findIndex((d) => norm(a).startsWith(d.slice(0, 3)));
          const ib = ORDER.findIndex((d) => norm(b).startsWith(d.slice(0, 3)));
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });
        setAvailableDays(sorted);
      });
    supabase
      .from("perfis")
      .select("avatar_url, sexo")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setAvatarPerfil((data as any)?.avatar_url || null);
        setSexo((data as any)?.sexo || null);
      });

    // Stats: deriva treinos concluídos, minutos e sequência a partir de historico_cargas
    (async () => {
      const { data } = await supabase
        .from("historico_cargas")
        .select("data_treino")
        .eq("user_id", user.id);
      if (!data) return;
      const dias = Array.from(new Set(data.map((r: any) => r.data_treino).filter(Boolean))).sort();
      const treinos = dias.length;
      const minutos = treinos * 60;
      // sequência: dias consecutivos até hoje (ou ontem)
      let sequencia = 0;
      const set = new Set(dias);
      const d = new Date();
      // se hoje não treinou, começa de ontem
      const today = d.toISOString().split("T")[0];
      if (!set.has(today)) d.setDate(d.getDate() - 1);
      while (set.has(d.toISOString().split("T")[0])) {
        sequencia++;
        d.setDate(d.getDate() - 1);
      }
      setStats({ treinos, minutos, sequencia });
    })();
  }, [user?.id]);

  // Persiste seleção de dia / exercício aberto
  useEffect(() => {
    if (diaAtual) sessionStorage.setItem("treino:diaAtual", diaAtual);
  }, [diaAtual]);
  useEffect(() => {
    if (activeIndex === null) sessionStorage.removeItem("treino:activeIndex");
    else sessionStorage.setItem("treino:activeIndex", String(activeIndex));
  }, [activeIndex]);

  useEffect(() => {
    const norm = (s: string) =>
      (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !["com","sem","dos","das","para","pelo","pela","reto","livre","barra","halter","halteres","maquina","cabo","polia","banco","pulley"].includes(w));

    const loadVideoRefs = async (): Promise<{ entries: { tokens: string[]; yt: string; coach: string | null }[] }> => {
      const { data } = await supabase
        .from("referencia_exercicios")
        .select("nome_exercicio, url_video");
      const entries = (data || []).map((r: any) => ({
        tokens: norm(r.nome_exercicio),
        yt: r.url_video as string,
        coach: null as string | null,
      })).filter((e) => e.tokens.length > 0 && e.yt);
      return { entries };
    };

    const findBest = (nome: string, refMap: any): { yt: string | null; coach: string | null } => {
      const tokens = norm(nome);
      if (!tokens.length) return { yt: null, coach: null };
      let best: any = null;
      let bestScore = 0;
      for (const e of refMap.entries || []) {
        const overlap = e.tokens.filter((t: string) => tokens.includes(t)).length;
        if (overlap > bestScore) {
          bestScore = overlap;
          best = e;
        }
      }
      if (bestScore < 1) return { yt: null, coach: null };
      return { yt: best.yt, coach: best.coach };
    };

    const resolveVideo = (nome: string, refMap: any) => findBest(nome, refMap).yt;
    const resolveCoach = (nome: string, refMap: any) => findBest(nome, refMap).coach;

    const autoFillVolume = async (list: Treino[], refMap: any): Promise<Treino[]> => {
      if (!tenant) return list;
      const dias = [...new Set(list.map((t) => t.dia_semana))];
      const extras: Treino[] = [];
      for (const dia of dias) {
        const diaEx = list.filter((t) => t.dia_semana === dia);
        if (diaEx.length >= MIN_EXERCISES_PER_DAY) continue;
        const allText = diaEx.map((e) => `${e.exercicio} ${e.observacao || ""}`).join(" ").toLowerCase();
        const matched = VOLUME_GROUPS.find((g) => allText.includes(g));
        if (!matched) continue;
        const needed = MIN_EXERCISES_PER_DAY - diaEx.length;
        const existing = new Set(diaEx.map((e) => e.exercicio.toLowerCase()));
        const grupo = matched.charAt(0).toUpperCase() + matched.slice(1);
        const { data: candidates } = await supabase
          .from("biblioteca_exercicios")
          .select("nome, series_trabalho, repeticoes, tecnica_intensidade, video_url, video_coach_url")
          .eq("tenant_id", tenant.id)
          .ilike("grupo_muscular", `%${grupo}%`)
          .limit(20);
        if (!candidates) continue;
        const filtered = candidates.filter((c: any) => !existing.has(c.nome.toLowerCase())).slice(0, needed);
        for (const ex of filtered as any[]) {
          extras.push({
            id: `extra-${dia}-${ex.nome}`,
            dia_semana: dia,
            exercicio: ex.nome,
            series: ex.series_trabalho ? String(ex.series_trabalho) : "3",
            repeticoes: ex.repeticoes || "10-12",
            observacao: ex.tecnica_intensidade || "Adicionado para volume ideal.",
            video_url: ex.video_url || resolveVideo(ex.nome, refMap),
            video_coach_url: ex.video_coach_url || resolveCoach(ex.nome, refMap),
            is_extra: true,
          });
        }
      }
      return [...list, ...extras];
    };

    const loadCargas = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("historico_cargas")
        .select("exercicio_nome, carga_kg, repeticoes_feitas, data_treino")
        .eq("user_id", user.id)
        .order("data_treino", { ascending: false });
      if (!data) return;
      const map: CargaMap = {};
      data.forEach((c) => {
        if (!map[c.exercicio_nome]) {
          map[c.exercicio_nome] = {
            carga_kg: Number(c.carga_kg) || 0,
            repeticoes_feitas: c.repeticoes_feitas || 0,
            data_treino: c.data_treino || "",
          };
        }
      });
      setCargas(map);
    };

    const loadSpotify = async () => {
      if (!tenant) return;
      const { data } = await supabase
        .from("configuracoes_tenant")
        .select("valor")
        .eq("tenant_id", tenant.id)
        .eq("chave", "link_spotify_coach")
        .maybeSingle();
      if (data?.valor) setSpotifyLink(data.valor);
    };

    // Timeout helper — evita ficar preso em retries do PostgREST quando o banco está em recovery
    const withTimeout = <T,>(p: Promise<T>, ms = 12000): Promise<T> =>
      Promise.race([
        p,
        new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
      ]);

    const load = async () => {
      if (!user) {
        setTreinos([]);
        setLoading(false);
        return;
      }

      const spotifyP = withTimeout(loadSpotify()).catch(() => null);
      const refsP = withTimeout(loadVideoRefs()).catch(() => ({} as Record<string, VideoRef>));
      const treinosP = withTimeout(
        Promise.resolve(
          supabase
            .from("treinos_prescritos")
            .select("id, dia_semana, ordem, exercicio, series, repeticoes, observacao, cadencia, detalhes_execucao, video_url, video_coach_url")
            .eq("aluno_id", user.id)
            .order("dia_semana")
            .order("ordem")
        ),
        15000
      ).catch(() => null);
      const cargasP = withTimeout(loadCargas()).catch(() => null);

      const [, refMapRes, treinosRes] = await Promise.all([spotifyP, refsP, treinosP]);
      void cargasP;

      const refMap: any = refMapRes || { entries: [] };

      const WEEK_ORDER = ["segunda","terca","quarta","quinta","sexta","sabado","domingo"];
      const weekIdx = (s: string) => {
        const n = (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const i = WEEK_ORDER.findIndex((d) => n.includes(d));
        return i === -1 ? 99 : i;
      };
      const isOff = (s: string) => /\boff\b|descanso|rest/i.test(s || "");

      if (treinosRes && !(treinosRes as any).error) {
        const data = (treinosRes as any).data as any[] | null;
        if (data && data.length > 0) {
          const filteredData = data.filter((t) => !isOff(t.dia_semana));
          const mapped: Treino[] = filteredData.map((t: any) => ({
            id: t.id,
            dia_semana: t.dia_semana,
            exercicio: t.exercicio,
            series: t.series,
            repeticoes: t.repeticoes,
            observacao: t.observacao,
            cadencia: t.cadencia,
            detalhes_execucao: t.detalhes_execucao,
            video_url: t.video_url || resolveVideo(t.exercicio, refMap),
            video_coach_url: t.video_coach_url || resolveCoach(t.exercicio, refMap),
          }));
          mapped.sort((a, b) => weekIdx(a.dia_semana) - weekIdx(b.dia_semana));
          let filled = mapped;
          try {
            filled = await withTimeout(autoFillVolume(mapped, refMap), 4000);
            filled.sort((a, b) => weekIdx(a.dia_semana) - weekIdx(b.dia_semana));
          } catch (e) {
            console.warn("autoFillVolume pulado", e);
          }
          setTreinos(filled);
          setDiaAtual((cur) => {
            if (cur && filled.some((t) => t.dia_semana === cur)) return cur;
            const todayWd = ["domingo","segunda","terca","quarta","quinta","sexta","sabado"][new Date().getDay()];
            const todayMatch = filled.find((t) => {
              const n = (t.dia_semana || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              return n.includes(todayWd);
            });
            return todayMatch ? todayMatch.dia_semana : filled[0].dia_semana;
          });
          setIsMock(false);
          setLoading(false);
          return;
        }
      }

      // Fallback: carrega treino gerado pela IA pelos cards de divisão (persistido localmente)
      try {
        const raw = localStorage.getItem(`treino:ia-gerado:${user.id}`);
        if (raw) {
          const parsed = JSON.parse(raw) as { presetId?: string; treinos: Treino[] };
          if (parsed?.treinos?.length) {
            const ord = parsed.treinos.slice().sort((a, b) => weekIdx(a.dia_semana) - weekIdx(b.dia_semana));
            setTreinos(ord);
            setSelectedPresetId(parsed.presetId || null);
            setDiaAtual((cur) => {
              if (cur && ord.some((t) => t.dia_semana === cur)) return cur;
              const todayWd = ["domingo","segunda","terca","quarta","quinta","sexta","sabado"][new Date().getDay()];
              const todayMatch = ord.find((t) => {
                const n = (t.dia_semana || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                return n.includes(todayWd);
              });
              return todayMatch ? todayMatch.dia_semana : ord[0].dia_semana;
            });
            setIsMock(false);
            setLoading(false);
            return;
          }
        }
      } catch {}

      setTreinos([]);
      setIsMock(false);
      setLoading(false);
    };

    void load().catch((e) => {
      console.error("Erro fatal no load do treino", e);
      setLoading(false);
    });
  }, [tenant, user, reloadKey]);

  // Realtime: quando o coach salvar/atualizar treinos, recarrega automaticamente
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`treinos-aluno-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "treinos_prescritos", filter: `aluno_id=eq.${user.id}` },
        () => setReloadKey((k) => k + 1)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Recarrega quando a aba volta a ficar visível (ex.: aluno volta do treino do coach)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") setReloadKey((k) => k + 1);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const dias = [...new Set(treinos.map((t) => t.dia_semana))];
  const treinosDoDia = treinos.filter((t) => t.dia_semana === diaAtual);

  // Deriva nome do grupo muscular a partir dos exercícios do dia
  const grupoMuscularDoDia = (() => {
    const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const grupos: { keys: string[]; label: string }[] = [
      { keys: ["peito", "supino", "crucifixo", "peck"], label: "PEITO" },
      { keys: ["costas", "dorsal", "remada", "puxada", "pulldown", "pull down"], label: "COSTAS" },
      { keys: ["ombro", "deltoide", "desenvolvimento", "elevacao lateral", "elevacao frontal", "arnold"], label: "OMBRO" },
      { keys: ["biceps", "rosca"], label: "BÍCEPS" },
      { keys: ["triceps", "frances", "testa", "corda"], label: "TRÍCEPS" },
      { keys: ["quadriceps", "agachamento", "leg press", "cadeira extensora", "afundo", "avanco", "hack", "bulgaro"], label: "QUADRÍCEPS" },
      { keys: ["posterior", "isquio", "stiff", "mesa flexora", "cadeira flexora"], label: "POSTERIOR DE COXA" },
      { keys: ["gluteo", "elevacao pelvica", "hip thrust", "coice", "abducao"], label: "GLÚTEO" },
      { keys: ["panturrilha", "gemeo", "gastrocnemio", "soleo"], label: "PANTURRILHA" },
      { keys: ["abdomen", "abdominal", "prancha", "core"], label: "ABDÔMEN" },
    ];
    const scores = new Map<string, number>();
    for (const t of treinosDoDia) {
      const texto = norm(`${t.exercicio} ${t.observacao || ""}`);
      for (const g of grupos) {
        if (g.keys.some((k) => texto.includes(k))) {
          scores.set(g.label, (scores.get(g.label) || 0) + 1);
          break;
        }
      }
    }
    if (scores.size === 0) return null;
    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted[0][1];
    const principais = sorted.filter(([, n]) => n === top).map(([l]) => l);
    if (principais.length >= 2) return principais.slice(0, 2).join(" E ");
    if (sorted.length >= 2 && sorted[1][1] >= Math.max(2, Math.ceil(top / 2))) {
      return `${sorted[0][0]} E ${sorted[1][0]}`;
    }
    return sorted[0][0];
  })();

  const primeiroNome = (user?.user_metadata?.nome_completo || user?.email || "Atleta")
    .toString()
    .split(/\s|@/)[0];
  const horaSaudacao = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();
  const handleCargaSaved = (nome: string, carga: number, reps: number) => {
    setCargas((prev) => ({
      ...prev,
      [nome]: { carga_kg: carga, repeticoes_feitas: reps, data_treino: new Date().toISOString().split("T")[0] },
    }));
  };

  // ====== CARDS DE DIVISÃO DE TREINO (gera com IA Pacholok) ======
  const nivelCanon: Nivel = (toNivelCanonico(nivelExperiencia) || "Iniciante") as Nivel;
  const presetsDisponiveis = useMemo(
    () => filtrarPresetsParaAluno(sexo, nivelCanon),
    [sexo, nivelCanon]
  );
  const frequenciasDisponiveis = useMemo(
    () => Array.from(new Set(presetsDisponiveis.map((p) => p.freq))).sort((a, b) => a - b),
    [presetsDisponiveis]
  );

  const gerarTreinoComPreset = async (preset: DivisaoPreset) => {
    if (!user || !tenant) {
      toast.error("Aguarde — perfil ainda carregando.");
      return;
    }
    setGeneratingPresetId(preset.id);
    try {
      // Busca biblioteca para a IA respeitar nomes com vídeo cadastrado
      const { data: bib } = await supabase
        .from("biblioteca_exercicios")
        .select("nome, grupo_muscular, video_url, video_coach_url")
        .eq("tenant_id", tenant.id)
        .limit(800);
      const bibliotecaParaIA = (bib || []).map((b: any) => ({
        nome: b.nome,
        grupo_muscular: b.grupo_muscular,
        tem_video: !!(b.video_coach_url || b.video_url),
      }));

      const perfilIA = {
        aluno_id: user.id,
        sexo: sexo || "",
        nivel_experiencia: nivelCanon,
      };

      const { data, error } = await supabase.functions.invoke("gerar-treino-ia", {
        body: {
          perfil: perfilIA,
          biblioteca: bibliotecaParaIA,
          divisoes: preset.dias,
          tenant_id: tenant.id,
          prompt: `Divisão escolhida pelo aluno: ${preset.label}`,
          estimulos_extras: [],
        },
      });
      if (error) throw error;
      const dias = ((data as any)?.dias || []) as Array<{ dia: string; exercicios: any[] }>;
      if (!dias.length) throw new Error("A IA não retornou exercícios. Tente novamente.");

      // Mapeia cada dia para a estrutura Treino[] usada pelo render
      const norm = (s: string) =>
        s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const usados = new Set<number>();
      const novos: Treino[] = [];
      preset.dias.forEach((diaEstrutura) => {
        const esperados = norm(diaEstrutura).split(" ").filter((t) => t.length > 2);
        let idx = dias.findIndex((d, i) => {
          if (usados.has(i)) return false;
          const g = norm(d.dia || "");
          return esperados.some((t) => g.includes(t));
        });
        if (idx < 0) idx = dias.findIndex((_, i) => !usados.has(i));
        if (idx < 0) return;
        usados.add(idx);
        (dias[idx].exercicios || []).forEach((e: any, i: number) => {
          novos.push({
            id: `ia-${preset.id}-${idx}-${i}`,
            dia_semana: diaEstrutura,
            exercicio: e.nome || "",
            series: e.series || "",
            repeticoes: e.repeticoes || "",
            cadencia: e.cadencia || "",
            detalhes_execucao: e.detalhes_execucao || "",
            observacao: e.observacao || "",
            video_url: null,
            video_coach_url: null,
          } as Treino);
        });
      });

      if (!novos.length) throw new Error("Não foi possível mapear os exercícios gerados.");

      try {
        localStorage.setItem(
          `treino:ia-gerado:${user.id}`,
          JSON.stringify({ presetId: preset.id, treinos: novos })
        );
      } catch {}
      setTreinos(novos);
      setSelectedPresetId(preset.id);
      setDiaAtual(novos[0].dia_semana);
      setActiveIndex(null);
      if ((data as any)?.fallback) {
        toast.warning("Rascunho gerado — IA oscilou, revise os exercícios.");
      } else {
        toast.success(`Treino "${preset.label}" gerado pela IA.`);
      }
    } catch (e: any) {
      toast.error(e?.message || "Falha ao gerar treino. Tente novamente.");
    } finally {
      setGeneratingPresetId(null);
    }
  };

  const trocarDivisao = () => {
    if (!user) return;
    try { localStorage.removeItem(`treino:ia-gerado:${user.id}`); } catch {}
    setTreinos([]);
    setSelectedPresetId(null);
    setActiveIndex(null);
    setDiaAtual("");
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PageHeader icon={Dumbbell} title="MEUS TREINOS" subtitle={`${treinos.length} exercícios`} />

      <div className="px-5">
        {/* Saudação com foto do perfil flush nas bordas */}
        <div className="relative overflow-hidden rounded-2xl bg-card mb-3 animate-in fade-in slide-in-from-top-2 duration-500 h-44">
          <div className="relative z-10 h-full flex flex-col justify-center px-5 max-w-[55%]">
            <p className="text-[10px] uppercase tracking-[0.25em] text-foreground/80 font-bold">BORA TREINAR,</p>
            <p className="font-display text-3xl leading-tight truncate">{primeiroNome.toUpperCase()}!</p>
            <p className="text-xs text-muted-foreground mt-2 leading-snug">
              Disciplina hoje,<br/>resultado amanhã.
            </p>
          </div>
          {avatarPerfil ? (
            <>
              <img
                src={avatarPerfil}
                alt="Foto de perfil"
                className="absolute inset-y-0 right-0 h-full w-[55%] sm:w-[50%] md:w-[45%] object-cover object-[center_20%]"
              />
              {/* fade da esquerda da foto para o card */}
              <div className="absolute inset-y-0 right-[45%] sm:right-[50%] md:right-[55%] w-24 sm:w-32 bg-gradient-to-r from-card to-transparent pointer-events-none" />
            </>
          ) : (
            <div className="absolute inset-y-0 right-0 w-[55%] sm:w-[50%] md:w-[45%] bg-secondary/40 flex items-center justify-center">
              <Dumbbell className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Stats: treinos, minutos, sequência */}
        <div className="grid grid-cols-3 gap-2 bg-card rounded-2xl p-3 mb-4 border border-border/50">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">TREINOS</p>
              <p className="font-display text-xl leading-none">{stats.treinos}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">concluídos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">MINUTOS</p>
              <p className="font-display text-xl leading-none">{stats.minutos.toLocaleString("pt-BR")}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">treinados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">SEQUÊNCIA</p>
              <p className="font-display text-xl leading-none">{stats.sequencia}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">dias</p>
            </div>
          </div>
        </div>


        {/* Cards de divisão de treino — IA Pacholok gera o treino a partir da divisão escolhida */}
        {treinos.length === 0 && (
          <div className="bg-card border border-primary/20 rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-display text-base uppercase tracking-wide">Escolha sua divisão</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Nível detectado:{" "}
              <span className="text-foreground font-semibold">{nivelCanon}</span>
              {sexo ? <> · {sexo}</> : null}. Toque numa divisão e a IA monta seu treino na metodologia Pacholok.
            </p>

            {presetsDisponiveis.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhuma divisão sugerida para seu nível. Atualize sua anamnese para liberar opções.
              </p>
            ) : (
              <div className="space-y-5">
                {frequenciasDisponiveis.map((freq) => (
                  <div key={freq}>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                      {freq}x na semana
                    </p>
                    <div className="grid gap-2">
                      {presetsDisponiveis
                        .filter((p) => p.freq === freq)
                        .map((p) => {
                          const isGen = generatingPresetId === p.id;
                          const isAny = generatingPresetId !== null;
                          return (
                            <button
                              key={p.id}
                              disabled={isAny}
                              onClick={() => gerarTreinoComPreset(p)}
                              className={`text-left rounded-xl border p-4 transition active:scale-[0.99] ${
                                isGen
                                  ? "border-primary bg-primary/10"
                                  : "border-border/60 bg-secondary/30 hover:border-primary/60 hover:bg-secondary/50"
                              } disabled:opacity-60`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <p className="font-display text-sm leading-tight">{p.label}</p>
                                {isGen ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                                ) : (
                                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {p.dias.map((d, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] px-2 py-0.5 rounded-full bg-background/60 border border-border/40 text-muted-foreground"
                                  >
                                    {d.length > 36 ? d.slice(0, 36) + "…" : d}
                                  </span>
                                ))}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[10px] text-muted-foreground mt-4 text-center">
              Seu coach também pode prescrever um treino — quando ele liberar, esse plano substitui o gerado.
            </p>
          </div>
        )}

        {treinos.length > 0 && selectedPresetId && (
          <button
            onClick={trocarDivisao}
            className="w-full mb-3 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] py-2 rounded-full border border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-primary/40 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Trocar divisão de treino
          </button>
        )}


        {spotifyLink && (
          <a
            href={spotifyLink}
            target="_blank"
            rel="noreferrer"
            className="w-full bg-primary text-primary-foreground font-display text-lg py-3 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.6)]"
          >
            <Music className="h-5 w-5" /> PLAYLIST DO TIME
          </a>
        )}

        <div className="flex gap-2 mt-5 overflow-x-auto pb-1">
          {dias.map((dia) => {
            const n = dia.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const wd = ["segunda","terca","quarta","quinta","sexta","sabado","domingo"].find((d) => n.includes(d));
            const wdShort: Record<string, string> = { segunda: "SEG", terca: "TER", quarta: "QUA", quinta: "QUI", sexta: "SEX", sabado: "SAB", domingo: "DOM" };
            const letra = dia.match(/\b([A-E])\b/)?.[1];
            const label = `${wd ? wdShort[wd] : dia.slice(0, 3).toUpperCase()}${letra ? " · " + letra : ""}`;
            const done = completedDaysWeek.has(dia);
            return (
              <button
                key={dia}
                onClick={() => {
                  setDiaAtual(dia);
                  setActiveIndex(null);
                }}
                className={`px-4 py-2 rounded-full font-display text-xs uppercase tracking-[0.2em] whitespace-nowrap transition flex items-center gap-1.5 ${
                  diaAtual === dia ? "bg-primary text-primary-foreground shadow-[0_0_20px_-4px_hsl(var(--primary)/0.6)]" : done ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40" : "bg-secondary text-muted-foreground"
                }`}
              >
                {done && <span aria-hidden>✓</span>}
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <h2 className="font-display text-lg flex items-center gap-2 uppercase tracking-wide">
            <span>▶️</span> {grupoMuscularDoDia || `TREINO DE HOJE — ${treinosDoDia.length} EXERCÍCIOS`}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {treinosDoDia.length} exercícios · Toque em um para abrir o modo execução
          </p>
        </div>


        <div className="space-y-3 mt-4">
          {treinosDoDia.map((t, i) => (
            <ExerciseCard
              key={t.id}
              data={t}
              isOpen={activeIndex === i}
              onToggle={() => setActiveIndex(activeIndex === i ? null : i)}
              cargaAnterior={cargas[t.exercicio]}
              userId={user?.id || null}
              tenantId={tenant?.id || null}
              onCargaSaved={handleCargaSaved}
              nivelExperiencia={nivelExperiencia}
              completed={completedIds.has(t.id)}
              onCompleted={() => markCompleted(t.id)}
            />
          ))}
        </div>

        {treinosDoDia.length > 0 && (
          completedDaysWeek.has(diaAtual) ? (
            <div className="mt-6 w-full py-4 rounded-2xl bg-emerald-600/15 border border-emerald-500/40 text-emerald-300 font-display tracking-[0.15em] flex items-center justify-center gap-3">
              <Trophy className="h-5 w-5" />
              TREINO CONCLUÍDO ✓
            </div>
          ) : (
            <button
              onClick={async () => {
                // Registra um marker do treino concluído (alimenta stats/evolução)
                if (user && tenant) {
                  try {
                    const hoje = new Date().toISOString().split("T")[0];
                    const { data: existe } = await supabase
                      .from("historico_cargas")
                      .select("id")
                      .eq("user_id", user.id)
                      .eq("data_treino", hoje)
                      .eq("exercicio_nome", `__treino_concluido__:${diaAtual}`)
                      .maybeSingle();
                    if (!existe) {
                      await supabase.from("historico_cargas").insert({
                        tenant_id: tenant.id,
                        user_id: user.id,
                        exercicio_nome: `__treino_concluido__:${diaAtual}`,
                        carga_kg: 0,
                        repeticoes_feitas: treinosDoDia.length,
                        tipo_serie: "Conclusao",
                        serie_index: 0,
                      });
                    }
                    // marca todos como concluído na UI
                    const next = new Set(completedIds);
                    treinosDoDia.forEach((t) => next.add(t.id));
                    setCompletedIds(next);
                    try { localStorage.setItem(completedKey, JSON.stringify([...next])); } catch {}
                    // marca o dia como concluído na semana
                    setCompletedDaysWeek((prev) => new Set(prev).add(diaAtual));
                    // recarrega stats
                    setReloadKey((k) => k + 1);
                  } catch (e) {
                    console.warn("Não foi possível registrar conclusão", e);
                  }
                }
                setShowConclusao(true);
              }}
              className="mt-6 w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary/70 text-primary-foreground font-display tracking-[0.15em] flex items-center justify-center gap-3 shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)] border border-white/20 active:scale-[0.98] transition"
            >
              <Trophy className="h-5 w-5" />
              CONCLUIR TREINO E COMPARTILHAR
            </button>
          )
        )}

        <TreinoConclusaoCard
          open={showConclusao}
          onClose={() => { setShowConclusao(false); resetTreinoDoDia(); }}
          diaTreino={diaAtual}
          totalExercicios={treinosDoDia.length}
        />

        {observacaoClinica && (
          <div className="mt-8 mb-10 bg-card border border-primary/30 rounded-2xl p-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-2 mb-3 text-primary">
              <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Dumbbell className="h-4 w-4" />
              </span>
              <h3 className="font-display text-lg uppercase">Parecer da Dr. IA (Clínico)</h3>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed italic border-l-2 border-primary pl-4">
              "{observacaoClinica}"
            </p>
            <p className="text-[10px] text-muted-foreground mt-4 uppercase tracking-widest text-center">
              Baseado em seus exames de sangue mais recentes
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default Treino;
