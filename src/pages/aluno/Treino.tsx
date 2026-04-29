import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Dumbbell, Music, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/contexts/BrandingProvider";
import { PageHeader } from "@/components/aluno/PageHeader";
import { ExerciseCard, ExerciseCardData } from "@/components/aluno/ExerciseCard";

interface Treino extends ExerciseCardData {
  dia_semana: string;
}

interface CargaMap {
  [exercicio: string]: { carga_kg: number; repeticoes_feitas: number; data_treino: string };
}

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
  const [diaAtual, setDiaAtual] = useState("");
  const [isMock, setIsMock] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [cargas, setCargas] = useState<CargaMap>({});
  const [spotifyLink, setSpotifyLink] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant) return;

    type VideoRef = { yt: string | null; coach: string | null };
    const loadVideoRefs = async (): Promise<Record<string, VideoRef>> => {
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

    const load = async () => {
      setLoading(true);
      let refMap: Record<string, string> = {};
      try {
        await loadSpotify();
        refMap = await loadVideoRefs();

        if (user) {
          const { data, error } = await supabase
            .from("treinos_prescritos")
            .select("id, dia_semana, ordem, exercicio, series, repeticoes, observacao, video_url")
            .eq("aluno_id", user.id)
            .eq("tenant_id", tenant.id)
            .order("dia_semana")
            .order("ordem");

          if (!error && data && data.length > 0) {
            const mapped: Treino[] = data.map((t) => ({
              id: t.id,
              dia_semana: t.dia_semana,
              exercicio: t.exercicio,
              series: t.series,
              repeticoes: t.repeticoes,
              observacao: t.observacao,
              video_url: t.video_url || resolveVideo(t.exercicio, refMap),
            }));
            let filled = mapped;
            try {
              filled = await autoFillVolume(mapped, refMap);
            } catch (e) {
              console.warn("autoFillVolume falhou, usando lista original", e);
            }
            setTreinos(filled);
            setDiaAtual(filled[0].dia_semana);
            setIsMock(false);
            try { await loadCargas(); } catch (e) { console.warn("loadCargas falhou", e); }
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn("Falha ao carregar treino do banco, usando prévia mock", e);
      }

      // fallback mock (banco indisponível ou sem treino prescrito)
      const enriched = MOCK_TREINOS.map((m) => ({ ...m, video_url: resolveVideo(m.exercicio, refMap) }));
      setTreinos(enriched);
      setDiaAtual(enriched[0].dia_semana);
      setIsMock(true);
      setLoading(false);
    };

    void load().catch((e) => {
      console.error("Erro fatal no load do treino", e);
      setTreinos(MOCK_TREINOS);
      setDiaAtual(MOCK_TREINOS[0].dia_semana);
      setIsMock(true);
      setLoading(false);
    });
  }, [tenant, user]);

  const dias = [...new Set(treinos.map((t) => t.dia_semana))];
  const treinosDoDia = treinos.filter((t) => t.dia_semana === diaAtual);

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
        {isMock && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 text-center text-xs text-accent mb-4">
            ⚡ Prévia — seu treino personalizado será montado pelo coach
          </div>
        )}

        {spotifyLink && (
          <a
            href={spotifyLink}
            target="_blank"
            rel="noreferrer"
            className="w-full bg-[hsl(142_70%_45%)] text-black font-display text-lg py-3 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_30px_-5px_hsl(142_70%_45%/0.6)]"
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
            <span className="text-accent">▶</span> TREINO DE HOJE — {treinosDoDia.length} EXERCÍCIOS
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
      </div>
    </>
  );
};

export default Treino;
