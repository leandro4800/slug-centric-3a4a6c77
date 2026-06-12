import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Dumbbell, Music, Loader2, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/contexts/BrandingProvider";
import { PageHeader } from "@/components/aluno/PageHeader";
import { TenantSymbol } from "@/components/TenantSymbol";
import { ExerciseCard, ExerciseCardData } from "@/components/aluno/ExerciseCard";
import { useAvatarVariant } from "@/hooks/use-avatar-variant";
import { TreinoConclusaoCard } from "@/components/aluno/TreinoConclusaoCard";

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
  const [avatarPerfil, setAvatarPerfil] = useState<string | null>(null);
  const completedKey = `treino:completed:${user?.id || "anon"}:${new Date().toISOString().split("T")[0]}`;
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(`treino:completed:${user?.id || "anon"}:${new Date().toISOString().split("T")[0]}`);
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch { return new Set<string>(); }
  });
  const markCompleted = (id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev); next.add(id);
      try { localStorage.setItem(completedKey, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  // Carrega nível de experiência (avançado / intermediário / iniciante) do aluno
  useEffect(() => {
    if (!user) return;
    supabase
      .from("anamnese_aluno")
      .select("nivel_experiencia")
      .eq("aluno_id", user.id)
      .maybeSingle()
      .then(({ data }) => setNivelExperiencia(data?.nivel_experiencia || null));
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
            return filled[0].dia_semana;
          });
          setIsMock(false);
          setLoading(false);
          return;
        }
      }

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

  const { url: avatarTreinando } = useAvatarVariant("treinando");
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
        {/* Saudação personalizada com avatar treinando */}
        {avatarTreinando && (
          <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 via-card to-card mb-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center gap-3 p-3">
              <img
                src={avatarTreinando}
                alt="Você treinando"
                className="w-20 h-24 object-cover rounded-xl shadow-[0_0_24px_-6px_hsl(var(--primary)/0.6)]"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold">{horaSaudacao}</p>
                <p className="font-display text-xl leading-tight truncate">{primeiroNome.toUpperCase()},</p>
                <p className="text-xs text-muted-foreground mt-0.5">Bora treinar pesado hoje. 💪</p>
              </div>
            </div>
          </div>
        )}

        {treinos.length === 0 && (
          <div className="bg-card border border-primary/20 rounded-2xl px-5 py-8 flex flex-col items-center justify-center gap-3 text-center mb-4">
            <TenantSymbol size={32} />
            <p className="font-display text-base">Aguardando seu treino</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Seu coach ainda não montou seu plano. Assim que ele liberar, seus exercícios aparecem aqui.
            </p>
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

        <div className="flex gap-2 mt-5 overflow-x-auto pb-1">
          {dias.map((dia) => {
            const n = dia.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const wd = ["segunda","terca","quarta","quinta","sexta","sabado","domingo"].find((d) => n.includes(d));
            const wdShort: Record<string, string> = { segunda: "SEG", terca: "TER", quarta: "QUA", quinta: "QUI", sexta: "SEX", sabado: "SAB", domingo: "DOM" };
            const letra = dia.match(/\b([A-E])\b/)?.[1];
            const label = `${wd ? wdShort[wd] : dia.slice(0, 3).toUpperCase()}${letra ? " · " + letra : ""}`;
            return (
              <button
                key={dia}
                onClick={() => {
                  setDiaAtual(dia);
                  setActiveIndex(null);
                }}
                className={`px-4 py-2 rounded-full font-display text-xs uppercase tracking-[0.2em] whitespace-nowrap transition ${
                  diaAtual === dia ? "bg-primary text-primary-foreground shadow-[0_0_20px_-4px_hsl(var(--primary)/0.6)]" : "bg-secondary text-muted-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <h2 className="font-display text-base flex items-center gap-2">
            <span>▶️</span> TREINO DE HOJE — {treinosDoDia.length} EXERCÍCIOS
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Toque em um exercício para abrir o modo execução</p>
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
          <button
            onClick={() => setShowConclusao(true)}
            className="mt-6 w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary/70 text-primary-foreground font-display tracking-[0.15em] flex items-center justify-center gap-3 shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)] border border-white/20 active:scale-[0.98] transition"
          >
            <Trophy className="h-5 w-5" />
            CONCLUIR TREINO E COMPARTILHAR
          </button>
        )}

        <TreinoConclusaoCard
          open={showConclusao}
          onClose={() => setShowConclusao(false)}
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
