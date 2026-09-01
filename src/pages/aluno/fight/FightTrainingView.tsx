import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Loader2, Flame, ChevronRight, GraduationCap } from "lucide-react";
import FightCampView from "./FightCampView";
import FightDojoView from "./FightDojoView";
import { FIGHT_MODALIDADES, modalidadeLabel, toModalidadeSlug } from "@/lib/fightModalidades";
import PersonalTreino from "@/pages/aluno/Treino";

type Camp = { id: string; modalidade: string | null; data_luta: string };

const DEFAULT_MODALIDADES = FIGHT_MODALIDADES.map((m) => m.slug);

const FightTrainingView = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState<"performance" | "camp" | "dojo">("performance");
  const [loading, setLoading] = useState(true);
  const [camps, setCamps] = useState<Camp[]>([]);
  const [modalidade, setModalidade] = useState<string>("bjj");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [c, p] = await Promise.all([
        supabase.from("camps_luta").select("id, modalidade, data_luta").eq("aluno_id", user.id),
        supabase.from("perfis").select("tenant_id, modalidade_luta").eq("id", user.id).maybeSingle(),
      ]);
      setCamps((c.data as Camp[]) ?? []);
      const saved = toModalidadeSlug((p.data as any)?.modalidade_luta);
      const doCamp = toModalidadeSlug((c.data as Camp[])?.find((x) => x.modalidade)?.modalidade ?? null);
      setModalidade(saved ?? doCamp ?? "bjj");
      setLoading(false);
    })();
  }, [user?.id]);

  const modalidades = useMemo(() => {
    const set = new Set<string>(DEFAULT_MODALIDADES);
    camps.forEach((c) => {
      const slug = toModalidadeSlug(c.modalidade);
      if (slug) set.add(slug);
    });
    return Array.from(set);
  }, [camps]);

  /** Persiste a modalidade do aluno — é a fonte usada pela IA de treino e pelo Dojo. */
  const selecionarModalidade = async (slug: string) => {
    setModalidade(slug);
    if (!user) return;
    await supabase.from("perfis").update({ modalidade_luta: slug }).eq("id", user.id);
  };

  const hasActiveCamp = useMemo(
    () => camps.some((c) => new Date(c.data_luta) >= new Date()),
    [camps],
  );

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

  if (mode === "dojo") {
    return (
      <div className="p-4 space-y-3 max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => setMode("performance")} className="text-xs uppercase tracking-widest">
          ← Voltar aos treinos
        </Button>
        <FightDojoView modalidade={modalidade} />
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center pt-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="px-5 pt-4 space-y-3">
        {/* Tabs de modalidades */}
        <div className="-mx-5 px-5 overflow-x-auto scrollbar-none">
          <div className="flex gap-2 min-w-max pb-1">
            {modalidades.map((m) => {
              const active = m === modalidade;
              return (
                <button
                  key={m}
                  onClick={() => selecionarModalidade(m)}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
                      : "bg-black/40 text-muted-foreground border border-white/10 hover:border-primary/40"
                  }`}
                >
                  {modalidadeLabel(m)}
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
                Preparação de camp ⚔️
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Peso, sessões e contagem regressiva para a luta.
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-primary shrink-0" />
          </div>
        </button>

        {/* Card premium: Dojo Virtual */}
        <button
          onClick={() => setMode("dojo")}
          className="w-full relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-black via-zinc-900/60 to-black p-5 text-left hover:border-primary/40 transition-colors"
        >
          <div className="relative flex items-center gap-4">
            <div className="rounded-xl bg-primary/15 border border-primary/30 p-3">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">Dojo Virtual</p>
              <h3 className="font-display text-xl uppercase italic tracking-tight leading-tight mt-0.5">
                Vídeo-aulas do seu CT 🥋
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Técnica e metodologia em {modalidadeLabel(modalidade)}.
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-primary shrink-0" />
          </div>
        </button>
      </div>

      {/* Treino prescrito — mesmo visual/funcionalidades da tela do personal */}
      <PersonalTreino />
    </div>
  );
};

export default FightTrainingView;
