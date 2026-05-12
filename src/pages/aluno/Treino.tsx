import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Dumbbell, Music, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/contexts/BrandingProvider";
import { PageHeader } from "@/components/aluno/PageHeader";
import { TenantSymbol } from "@/components/TenantSymbol";
import { ExerciseCard, ExerciseCardData } from "@/components/aluno/ExerciseCard";
import { useAvatarVariant } from "@/hooks/use-avatar-variant";

interface Treino extends ExerciseCardData {
  dia_semana: string;
}

interface CargaMap {
  [exercicio: string]: { carga_kg: number; repeticoes_feitas: number; data_treino: string };
}

type VideoRef = { yt: string | null; coach: string | null };

const VOLUME_GROUPS = ["peito", "costas", "quadríceps", "quadriceps", "glúteo", "gluteo", "ombro", "bíceps", "biceps", "tríceps", "triceps"];
const MIN_EXERCISES_PER_DAY = 4;

const MOCK_TREINOS: Treino[] = [
  { id: "mock-a1", dia_semana: "Treino A", exercicio: "Supino Reto com Barra", series: "4", repeticoes: "12", observacao: "Controle a descida em 3 segundos." },
  { id: "mock-a2", dia_semana: "Treino A", exercicio: "Crucifixo Inclinado", series: "3", repeticoes: "12", observacao: "Cotovelos levemente flexionados." },
  { id: "mock-a3", dia_semana: "Treino A", exercicio: "Crossover", series: "3", repeticoes: "15", observacao: "Pico de contração." },
  { id: "mock-a4", dia_semana: "Treino A", exercicio: "Tríceps Pulley", series: "4", repeticoes: "12", observacao: "Cotovelos fixos." },
  { id: "mock-b1", dia_semana: "Treino B", exercicio: "Puxada Aberta", series: "4", repeticoes: "12", observacao: "Foco na dorsal." },
  { id: "mock-c1", dia_semana: "Treino C", exercicio: "Agachamento Livre", series: "4", repeticoes: "10", observacao: "Mantenha a postura neutra." },
];

const Treino = () => {
  const { user } = useAuth();
  const { tenant } = useBranding();
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [treinos, setTreinos] = useState<Treino[]>([]);
  const [observacaoClinica, setObservacaoClinica] = useState<string | null>(null);
  const [diaAtual, setDiaAtual] = useState("");
  const [isMock, setIsMock] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [cargas, setCargas] = useState<CargaMap>({});
  const [spotifyLink, setSpotifyLink] = useState<string | null>(null);

  useEffect(() => {
    const loadVideoRefs = async (): Promise<Record<string, VideoRef>> => {
      if (!tenant) return {};
      const { data } = await supabase
        .from("referencia_videos")
        .select("nome_exercicio, url_video, video_coach_url")
        .eq("tenant_id", tenant.id);
      const map: Record<string, VideoRef> = {};
      data?.forEach((r: any) => {
        map[r.nome_exercicio.trim().toLowerCase()] = {
          yt: r.url_video || null,
          coach: r.video_coach_url || null,
        };
      });
      return map;
    };

    const resolveVideo = (nome: string, refMap: Record<string, VideoRef>) =>
      refMap[nome.trim().toLowerCase()]?.yt || null;
    const resolveCoach = (nome: string, refMap: Record<string, VideoRef>) =>
      refMap[nome.trim().toLowerCase()]?.coach || null;

    const autoFillVolume = async (list: Treino[], refMap: Record<string, VideoRef>): Promise<Treino[]> => {
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
      // 1) Render imediato com MOCK para o usuário ver a tela na hora
      const mockEnriched = MOCK_TREINOS.map((m) => ({ ...m }));
      setTreinos(mockEnriched);
      setDiaAtual(mockEnriched[0].dia_semana);
      setIsMock(true);
      setLoading(false);

      if (!user) return;

      // 2) Em paralelo, busca tudo com timeout — se o banco está lento, ficamos no mock
      const spotifyP = withTimeout(loadSpotify()).catch(() => null);
      const refsP = withTimeout(loadVideoRefs()).catch(() => ({} as Record<string, VideoRef>));
      // Busca treinos do aluno SEM filtrar por tenant — evita falso "sem treino"
      // se o aluno trocou de tenant ou se o coach salvou com tenant diferente.
      // RLS já garante visibilidade correta (aluno_id = auth.uid()).
      const treinosP = withTimeout(
        Promise.resolve(
          supabase
            .from("treinos_prescritos")
            .select("id, dia_semana, ordem, exercicio, series, repeticoes, observacao, cadencia, detalhes_execucao, video_url, video_coach_url, observacao_clinica")
            .eq("aluno_id", user.id)
            .order("dia_semana")
            .order("ordem")
        ),
        15000
      ).catch(() => null);
      const cargasP = withTimeout(loadCargas()).catch(() => null);

      const [, refMapRes, treinosRes] = await Promise.all([spotifyP, refsP, treinosP]);
      void cargasP; // dispara em background, não bloqueia

      const refMap: Record<string, VideoRef> = (refMapRes as any) || {};

      if (treinosRes && !(treinosRes as any).error) {
        const data = (treinosRes as any).data as any[] | null;
        if (data && data.length > 0) {
          const mapped: Treino[] = data.map((t: any) => ({
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
          // autoFillVolume também com timeout para não travar a tela
          let filled = mapped;
          try {
            filled = await withTimeout(autoFillVolume(mapped, refMap), 4000);
          } catch (e) {
            console.warn("autoFillVolume pulado", e);
          }
          setTreinos(filled);
          setDiaAtual(filled[0].dia_semana);
          if (data[0].observacao_clinica) {
            setObservacaoClinica(data[0].observacao_clinica);
          }
          setIsMock(false);
          return;
        }
      }

      // Sem treino real disponível: enriquece o mock com vídeos se conseguimos buscar
      if (Object.keys(refMap).length > 0) {
        setTreinos((prev) =>
          prev.map((m) => ({
            ...m,
            video_url: m.video_url || resolveVideo(m.exercicio, refMap),
            video_coach_url: m.video_coach_url || resolveCoach(m.exercicio, refMap),
          }))
        );
      }
    };

    void load().catch((e) => {
      console.error("Erro fatal no load do treino", e);
      setLoading(false);
    });
  }, [tenant, user]);

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
      <PageHeader icon={Dumbbell} title="MEU TREINO" subtitle={`${treinos.length} exercícios`} />

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

        {isMock && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-xs text-primary mb-4">
            <TenantSymbol size={16} /> Prévia — seu treino personalizado será montado pelo coach
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
          {dias.map((dia) => (
            <button
              key={dia}
              onClick={() => {
                setDiaAtual(dia);
                setActiveIndex(null);
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition ${
                diaAtual === dia ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {dia}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <h2 className="font-display text-base flex items-center gap-2">
            <span className="text-primary">▶</span> TREINO DE HOJE — {treinosDoDia.length} EXERCÍCIOS
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
            />
          ))}
        </div>

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
