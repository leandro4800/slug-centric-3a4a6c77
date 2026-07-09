import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/aluno/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Swords, Loader2, Flame, Zap, ChevronRight, ChevronDown, Video, Play } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import FightCampView from "./FightCampView";
import { getFightBlock } from "@/data/fightPerformanceCatalog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ExercisePlayer from "@/components/aluno/ExercisePlayer";

type Sessao = {
  id: string;
  data: string;
  tipo: string | null;
  descricao: string | null;
  duracao_min: number | null;
  intensidade: string | null;
  rpe: number | null;
  modalidade?: string | null;
};

type Camp = { id: string; modalidade: string | null; data_luta: string };

const DEFAULT_MODALIDADES = ["BJJ", "Muay Thai", "Boxe", "MMA"];

const tipoIcon: Record<string, string> = {
  sparring: "🥊", tecnica: "🎯", fisico: "💪", cardio: "🏃", mobilidade: "🧘", estrategia: "🧠",
};

const rpeColor = (rpe: number | null) => {
  if (!rpe) return "bg-muted text-muted-foreground";
  if (rpe >= 9) return "bg-red-600/90 text-white shadow-[0_0_20px_hsl(0_84%_50%/0.5)]";
  if (rpe >= 7) return "bg-orange-500/90 text-white";
  if (rpe >= 5) return "bg-amber-500/80 text-black";
  return "bg-emerald-500/70 text-black";
};

const FightTrainingView = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState<"performance" | "camp">("performance");
  const [loading, setLoading] = useState(true);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [camps, setCamps] = useState<Camp[]>([]);
  const [modalidade, setModalidade] = useState<string>("BJJ");
  const [openExercise, setOpenExercise] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<{ url: string; nome: string } | null>(null);

    (async () => {
      setLoading(true);
      const [s, c] = await Promise.all([
        supabase.from("sessoes_luta").select("*").eq("aluno_id", user.id).order("data", { ascending: true }).limit(60),
        supabase.from("camps_luta").select("id, modalidade, data_luta").eq("aluno_id", user.id),
      ]);
      setSessoes((s.data as Sessao[]) ?? []);
      setCamps((c.data as Camp[]) ?? []);
      setLoading(false);
    })();
  }, [user?.id]);

  const modalidades = useMemo(() => {
    const set = new Set<string>(DEFAULT_MODALIDADES);
    camps.forEach((c) => c.modalidade && set.add(c.modalidade));
    return Array.from(set);
  }, [camps]);

  useEffect(() => {
    if (!modalidades.includes(modalidade)) setModalidade(modalidades[0] ?? "BJJ");
  }, [modalidades]);

  const hasActiveCamp = useMemo(
    () => camps.some((c) => new Date(c.data_luta) >= new Date()),
    [camps],
  );

  const sessoesFiltradas = useMemo(() => {
    const now = new Date(new Date().toDateString());
    return sessoes
      .filter((s) => new Date(s.data) >= now)
      .filter((s) => {
        if (!s.modalidade) return true; // mostra sessões sem modalidade em todas
        return s.modalidade.toLowerCase() === modalidade.toLowerCase();
      })
      .slice(0, 10);
  }, [sessoes, modalidade]);

  if (mode === "camp") {
    return (
      <div className="space-y-3">
        <div className="p-4 pb-0 max-w-2xl mx-auto">
          <Button variant="ghost" size="sm" onClick={() => setMode("performance")} className="text-xs uppercase tracking-widest">
            ← Voltar aos treinos
          </Button>
        </div>
        <FightCampView />
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center pt-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <PageHeader icon={Swords} title="Treino" subtitle="Alta performance no seu ritmo" />

      {/* Tabs de modalidades */}
      <div className="-mx-4 px-4 overflow-x-auto scrollbar-none">
        <div className="flex gap-2 min-w-max pb-1">
          {modalidades.map((m) => {
            const active = m === modalidade;
            return (
              <button
                key={m}
                onClick={() => setModalidade(m)}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
                    : "bg-black/40 text-muted-foreground border border-white/10 hover:border-primary/40"
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      {/* Card premium: Modo Competição */}
      <button
        onClick={() => setMode("camp")}
        className="w-full relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-black via-red-950/40 to-black p-5 text-left shadow-[0_0_30px_hsl(0_84%_40%/0.25)] hover:shadow-[0_0_40px_hsl(0_84%_40%/0.45)] transition-shadow"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(0_84%_50%/0.25),transparent_70%)]" />
        <div className="relative flex items-center gap-4">
          <div className="rounded-xl bg-primary/20 border border-primary/40 p-3">
            <Flame className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">
              {hasActiveCamp ? "Camp ativo" : "Modo competição"}
            </p>
            <h3 className="font-display text-xl uppercase italic tracking-tight leading-tight mt-0.5">
              Acessar preparação de camp ⚔️
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Peso, sessões e contagem regressiva para a luta.
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-primary" />
        </div>
      </button>

      {/* Sessões da modalidade */}
      <Card className="p-4 bg-card/60 backdrop-blur border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />Próximas sessões · {modalidade}
          </h3>
        </div>
        {sessoesFiltradas.length === 0 ? (
          <div className="py-8 text-center">
            <Swords className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma sessão programada para {modalidade}.
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Seu técnico programará sua rotina de manutenção e performance.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessoesFiltradas.map((s) => (
              <div key={s.id} className="p-3 rounded-xl border border-white/5 bg-black/30 flex items-center gap-3">
                <div className="text-2xl">{tipoIcon[s.tipo || ""] ?? "🥋"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold uppercase tracking-wider">
                      {format(parseISO(s.data), "EEE dd/MM", { locale: ptBR })}
                    </p>
                    {s.tipo && (
                      <Badge variant="outline" className="text-[10px] uppercase border-primary/40 text-primary">
                        {s.tipo}
                      </Badge>
                    )}
                    {s.intensidade && (
                      <span className="text-[10px] uppercase text-muted-foreground">{s.intensidade}</span>
                    )}
                    {s.duracao_min && (
                      <span className="text-[10px] text-muted-foreground">· {s.duracao_min}min</span>
                    )}
                  </div>
                  {s.descricao && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.descricao}</p>
                  )}
                </div>
                {s.rpe && (
                  <div className={`rounded-lg px-2.5 py-1.5 text-center min-w-[44px] ${rpeColor(s.rpe)}`}>
                    <p className="text-[8px] uppercase tracking-widest opacity-80">RPE</p>
                    <p className="font-display text-lg leading-none">{s.rpe}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default FightTrainingView;
