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
  tempo_descanso_segundos?: number | null;
}

interface CargaMap {
  [exercicio: string]: { carga_kg: number; repeticoes_feitas: number; data_treino: string };
}

type VideoRef = { yt: string | null; coach: string | null };

import FightTrainingView from "@/pages/aluno/fight/FightTrainingView";

const Treino = () => {
  const { tenant } = useBranding();
  if (tenant?.vertical === "fight") return <FightTrainingView />;
  return <PersonalTreino />;
};

const PersonalTreino = () => {
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
  const [startingSession, setStartingSession] = useState(false);
  const [concluindo, setConcluindo] = useState(false);
  const [sessaoAndamento, setSessaoAndamento] = useState<{ id: string; startedAt: number } | null>(null);
  const [sessaoStats, setSessaoStats] = useState<{ volume: number; series: number }>({ volume: 0, series: 0 });
  const [recordeBanner, setRecordeBanner] = useState<string | null>(null);
  const [agora, setAgora] = useState(() => Date.now());

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

    // Stats: treinos concluídos, minutos e sequência computados no banco (sessoes_treino)
    (async () => {
      const { data, error } = await supabase.rpc("get_stats_treino" as any, {} as any);
      if (!error && data) {
        const s = data as any;
        setStats({
          treinos: Number(s.treinos) || 0,
          minutos: Number(s.minutos) || 0,
          sequencia: Number(s.sequencia) || 0,
        });
      }
    })();
  }, [user?.id, reloadKey]);

  // Cronômetro da sessão: marca o início ao abrir o treino do dia
  const sessionStartKey = `treino:inicio:${user?.id || "anon"}:${new Date().toISOString().split("T")[0]}:${diaAtual}`;
  useEffect(() => {
    if (!diaAtual) return;
    try {
      if (!localStorage.getItem(sessionStartKey)) {
        localStorage.setItem(sessionStartKey, String(Date.now()));
      }
    } catch {}
  }, [sessionStartKey, diaAtual]);


  // Persiste seleção de dia / exercício aberto
  useEffect(() => {
    if (diaAtual) sessionStorage.setItem("treino:diaAtual", diaAtual);
  }, [diaAtual]);
  useEffect(() => {
    if (activeIndex === null) sessionStorage.removeItem("treino:activeIndex");
    else sessionStorage.setItem("treino:activeIndex", String(activeIndex));
  }, [activeIndex]);

  useEffect(() => {


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
      const treinosP = withTimeout(
        Promise.resolve(
          supabase
            .from("treinos_prescritos")
            .select("id, dia_semana, ordem, exercicio, series, repeticoes, observacao, cadencia, detalhes_execucao, tempo_descanso_segundos, video_url, video_coach_url, referencia_exercicio_id, referencia_exercicios(url_video)")
            .eq("aluno_id", user.id)
            .eq("tenant_id", tenant.id)
            .order("dia_semana")
            .order("ordem")
        ),
        15000
      ).catch(() => null);
      const cargasP = withTimeout(loadCargas()).catch(() => null);

      const [, treinosRes] = await Promise.all([spotifyP, treinosP]);
      void cargasP;

      const WEEK_ORDER = ["segunda","terca","quarta","quinta","sexta","sabado","domingo"];
      const weekIdx = (s: string) => {
        const n = (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const i = WEEK_ORDER.findIndex((d) => n.includes(d));
        return i === -1 ? 99 : i;
      };
      const isOff = (s: string) => {
        const n = (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        // Não tratar técnicas como Rest-Pause como descanso.
        return /\boff\b|descanso|folga|sem\s+treino|dia\s+livre/i.test(n);
      };

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
            tempo_descanso_segundos: t.tempo_descanso_segundos ?? 90,
            // Fonte da verdade: vínculo por ID com a biblioteca. Sem matching por texto.
            video_url: t.referencia_exercicios?.url_video || t.video_url || null,
            video_coach_url: t.video_coach_url || null,
          }));

          mapped.sort((a, b) => weekIdx(a.dia_semana) - weekIdx(b.dia_semana));
          setTreinos(mapped);
          setDiaAtual((cur) => {
            if (cur && mapped.some((t) => t.dia_semana === cur)) return cur;
            const todayWd = ["domingo","segunda","terca","quarta","quinta","sexta","sabado"][new Date().getDay()];
            const todayMatch = mapped.find((t) => {
              const n = (t.dia_semana || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              return n.includes(todayWd);
            });
            return todayMatch ? todayMatch.dia_semana : mapped[0].dia_semana;
          });
          setIsMock(false);
          setLoading(false);
          return;
        }
      }

      // Sem fallback de IA no app do aluno — o treino só aparece quando o coach prescreve.


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

  const diasRaw = [...new Set(treinos.map((t) => t.dia_semana))];
  const treinosDoDia = treinos.filter((t) => t.dia_semana === diaAtual);

  // ---- Mapeamento dia do treino → dia da semana real escolhido na anamnese ----
  const WD_SHORT = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"] as const;
  const normTxt = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const wdIndexFromText = (s: string): number => {
    const n = normTxt(s);
    const full = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"];
    const i = full.findIndex((d) => n.includes(d));
    if (i >= 0) return i;
    const abbr = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
    const j = abbr.findIndex((d) => n.startsWith(d));
    return j;
  };

  // Dias disponíveis da anamnese, já em índices de semana (0=Seg ... 6=Dom)
  const availableIdx = availableDays.map(wdIndexFromText).filter((i) => i >= 0);

  // Ordem "de prescrição" (A, B, C...) — usa a letra quando existir, senão mantém a ordem vinda do banco
  const diasOrdemPrescricao = [...diasRaw].sort((a, b) => {
    const la = a.match(/\b([A-Z])\b/)?.[1];
    const lb = b.match(/\b([A-Z])\b/)?.[1];
    if (la && lb) return la.charCodeAt(0) - lb.charCodeAt(0);
    if (la) return -1;
    if (lb) return 1;
    return diasRaw.indexOf(a) - diasRaw.indexOf(b);
  });

  // Índice de semana resolvido para cada dia de treino
  const weekIdxForDia = (dia: string): number => {
    const own = wdIndexFromText(dia);
    if (own >= 0) return own;
    if (!availableIdx.length) return 99;
    const pos = diasOrdemPrescricao.indexOf(dia);
    // Se o aluno tem menos dias disponíveis que treinos prescritos, faz o ciclo pela lista
    if (pos < 0) return 99;
    return availableIdx[pos % availableIdx.length] ?? 99;
  };

  const weekdayLabelFor = (dia: string): string | null => {
    const i = weekIdxForDia(dia);
    return i >= 0 && i < 7 ? WD_SHORT[i] : null;
  };

  // Chips sempre na ordem da semana (Seg → Dom)
  const dias = [...diasRaw].sort((a, b) => {
    const d = weekIdxForDia(a) - weekIdxForDia(b);
    if (d !== 0) return d;
    return diasOrdemPrescricao.indexOf(a) - diasOrdemPrescricao.indexOf(b);
  });

  // Quando availableDays carrega, seleciona automaticamente o dia de HOJE (se hoje for treino).
  useEffect(() => {
    if (!dias.length) return;
    const todayIdx = (new Date().getDay() + 6) % 7; // 0=Seg ... 6=Dom
    const targetDia = dias.find((d) => weekIdxForDia(d) === todayIdx);
    if (targetDia && targetDia !== diaAtual) setDiaAtual(targetDia);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableDays.join("|"), dias.join("|")]);


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
  // Detecta sessão em andamento (duracao_min = 0) — fonte da verdade: created_at do banco
  useEffect(() => {
    if (!user || !tenant) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("sessoes_treino")
        .select("id, created_at, dia_semana")
        .eq("aluno_id", user.id)
        .eq("duracao_min", 0)
        .gte("created_at", new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data?.id) {
        setSessaoAndamento({ id: (data as any).id, startedAt: new Date((data as any).created_at).getTime() });
      } else {
        setSessaoAndamento(null);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, tenant?.id, reloadKey]);

  // Relógio do aviso de sessão em andamento
  useEffect(() => {
    if (!sessaoAndamento) return;
    setAgora(Date.now());
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [sessaoAndamento?.id]);

  const duracaoAndamento = (() => {
    if (!sessaoAndamento) return "00:00";
    const total = Math.max(0, Math.floor((agora - sessaoAndamento.startedAt) / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60).toString().padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  })();

  // Estatísticas da sessão (volume / séries) lidas de series_executadas
  const carregarStatsSessao = async (sessId?: string | null) => {
    const id = sessId ?? sessaoAndamento?.id;
    if (!id) { setSessaoStats({ volume: 0, series: 0 }); return; }
    const { data } = await supabase
      .from("series_executadas")
      .select("volume_kg")
      .eq("sessao_id", id)
      .limit(2000);
    const rows = (data as any[]) || [];
    setSessaoStats({
      volume: rows.reduce((acc, r) => acc + (Number(r.volume_kg) || 0), 0),
      series: rows.length,
    });
  };

  useEffect(() => {
    carregarStatsSessao(sessaoAndamento?.id);
  }, [sessaoAndamento?.id]);

  // Banner de recordes some sozinho
  useEffect(() => {
    if (!recordeBanner) return;
    const t = setTimeout(() => setRecordeBanner(null), 6000);
    return () => clearTimeout(t);
  }, [recordeBanner]);

  // Inicia a sessão de treino (cria registro em sessoes_treino)
  const iniciarTreinoAoVivo = async () => {
    if (!user || !tenant || !treinosDoDia.length || sessaoAndamento) return;
    setStartingSession(true);
    try {
      const { data, error } = await supabase
        .from("sessoes_treino")
        .insert({
          aluno_id: user.id,
          tenant_id: tenant.id,
          dia_semana: diaAtual,
          duracao_min: 0,
          exercicios_total: treinosDoDia.length,
        } as any)
        .select("id, created_at")
        .maybeSingle();
      if (error) throw error;
      const id = (data as any)?.id || null;
      const startedAt = (data as any)?.created_at ? new Date((data as any).created_at).getTime() : Date.now();
      if (id) setSessaoAndamento({ id, startedAt });
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível iniciar o treino.");
    } finally {
      setStartingSession(false);
    }
  };

  // Conclui a sessão: fecha sessoes_treino e abre o card de compartilhar
  const concluirTreino = async () => {
    if (!user || !tenant) { setShowConclusao(true); return; }
    setConcluindo(true);
    try {
      if (sessaoAndamento) {
        const min = Math.min(
          Math.max(Math.round((Date.now() - sessaoAndamento.startedAt) / 60000) || 1, 1),
          300,
        );
        await supabase
          .from("sessoes_treino")
          .update({ duracao_min: min, exercicios_total: treinosDoDia.length } as any)
          .eq("id", sessaoAndamento.id);
      } else {
        await supabase.rpc("registrar_sessao_treino" as any, {
          _tenant_id: tenant.id,
          _dia_semana: diaAtual,
          _duracao_min: 60,
          _exercicios_total: treinosDoDia.length,
        } as any);
      }
      const next = new Set(completedIds);
      treinosDoDia.forEach((t) => next.add(t.id));
      setCompletedIds(next);
      try { localStorage.setItem(completedKey, JSON.stringify([...next])); } catch {}
      try { localStorage.removeItem(sessionStartKey); } catch {}
      setCompletedDaysWeek((prev) => new Set(prev).add(diaAtual));
      setSessaoAndamento(null);
      setReloadKey((k) => k + 1);
    } catch (e) {
      console.warn("Não foi possível registrar conclusão", e);
    } finally {
      setConcluindo(false);
      setShowConclusao(true);
    }
  };



  const handleCargaSaved = (nome: string, carga: number, reps: number) => {
    setCargas((prev) => ({
      ...prev,
      [nome]: { carga_kg: carga, repeticoes_feitas: reps, data_treino: new Date().toISOString().split("T")[0] },
    }));
  };

  // ====== CARDS DE DIVISÃO DE TREINO (gera com IA metodologia AlphaCoach) ======
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


        {/* Empty state — o treino só aparece quando o coach prescreve */}
        {treinos.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center mb-4">
            <Dumbbell className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Seu treino personalizado será montado pelo seu coach.</p>
          </div>
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

        <div className="flex flex-wrap gap-2 mt-5 pb-1">
          {dias.map((dia) => {
            const n = dia.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const wd = ["segunda","terca","quarta","quinta","sexta","sabado","domingo"].find((d) => n.includes(d));
            const wdShort: Record<string, string> = { segunda: "SEG", terca: "TER", quarta: "QUA", quinta: "QUI", sexta: "SEX", sabado: "SAB", domingo: "DOM" };
            const letra = dia.match(/\b([A-F])\b/)?.[1];
            // Prioriza o dia da semana vindo da anamnese (mapeado pela letra A→1º dia disponível, B→2º, ...)
            const wdFromAnamnese = weekdayLabelFor(dia);
            const wdLabel = wdFromAnamnese || (wd ? wdShort[wd] : null);
            const label = `${wdLabel || dia.slice(0, 3).toUpperCase()}${letra ? " · " + letra : ""}`;
            const done = completedDaysWeek.has(dia);
            return (
              <button
                key={dia}
                onClick={() => {
                  setDiaAtual(dia);
                  setActiveIndex(null);
                }}
                className={`px-3 py-2 rounded-full font-display text-[11px] uppercase tracking-[0.18em] whitespace-nowrap transition flex items-center gap-1.5 ${
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

        {treinosDoDia.length > 0 && (
          sessaoAndamento ? (
            <div className="mt-4 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.18em] text-emerald-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Treino em andamento
                </span>
                <span className="font-mono text-lg text-primary">⏱ {duracaoAndamento}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Duração</p>
                  <p className="font-mono text-base">{duracaoAndamento}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Volume</p>
                  <p className="font-mono text-base">{Math.round(sessaoStats.volume)} kg</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Séries</p>
                  <p className="font-mono text-base">{sessaoStats.series}</p>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={startingSession}
              onClick={iniciarTreinoAoVivo}
              className="mt-4 w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-display tracking-[0.15em] uppercase flex items-center justify-center gap-2 shadow-[0_10px_40px_-12px_hsl(var(--primary)/0.6)] active:scale-[0.98] transition disabled:opacity-70"
            >
              {startingSession ? <Loader2 className="h-5 w-5 animate-spin" /> : <Dumbbell className="h-5 w-5" />}
              Iniciar Treino
            </button>
          )
        )}

        {recordeBanner && (
          <div className="mt-3 rounded-xl border border-amber-400/50 bg-amber-400/15 px-4 py-3 text-center text-sm font-bold text-amber-300">
            🏆 Novo recorde de {recordeBanner}!
          </div>
        )}

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
              sessaoId={sessaoAndamento?.id || null}
              sessionActive={!!sessaoAndamento}
              onSeriesSaved={() => carregarStatsSessao()}
              onRecords={(tipos) => setRecordeBanner(tipos.join(" e "))}
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
              onClick={concluirTreino}
              disabled={concluindo}
              className="mt-6 w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary/70 text-primary-foreground font-display tracking-[0.15em] flex items-center justify-center gap-3 shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)] border border-white/20 active:scale-[0.98] transition disabled:opacity-70"
            >
              {concluindo ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trophy className="h-5 w-5" />}
              CONCLUIR TREINO
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
