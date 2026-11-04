import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/contexts/BrandingProvider";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronRight, GraduationCap } from "lucide-react";
import { modalidadeLabel, toModalidadeSlug } from "@/lib/fightModalidades";
import PersonalTreino from "@/pages/aluno/Treino";

const FightTrainingView = () => {
  const { user } = useAuth();
  const { tenant } = useBranding();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lutas, setLutas] = useState<string[]>([]);
  const [modalidade, setModalidade] = useState<string>("");

  const ctPath = `/${slug}/app/ct`;

  useEffect(() => {
    if (!user || !tenant?.id) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("aluno_modalidades_luta")
        .select("modalidade, nivel, created_at")
        .eq("aluno_id", user.id)
        .eq("tenant_id", tenant.id)
        .order("created_at");
      if (cancel) return;
      const lista = Array.from(
        new Set((data ?? []).map((r) => toModalidadeSlug(r.modalidade) || r.modalidade).filter(Boolean)),
      );
      setLutas(lista);
      setModalidade((atual) => (atual && lista.includes(atual) ? atual : lista[0] ?? ""));
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [user?.id, tenant?.id]);

  if (loading) {
    return <div className="flex justify-center pt-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const temLutas = lutas.length > 0;

  return (
    <div className="space-y-4">
      <div className="px-5 pt-4 space-y-3">
        {temLutas ? (
          <div className="-mx-5 px-5 overflow-x-auto scrollbar-none">
            <div className="flex gap-2 min-w-max pb-1">
              {lutas.map((m) => {
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
                    {modalidadeLabel(m)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-black via-zinc-900/60 to-black p-5 space-y-3">
            <div>
              <h3 className="font-display text-xl uppercase italic tracking-tight leading-tight">Escolha suas lutas</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Responda quais lutas você treina para ver o treino certo para cada uma
              </p>
            </div>
            <Button onClick={() => navigate(ctPath)} className="w-full uppercase tracking-widest text-xs font-bold">
              Escolher minhas lutas
            </Button>
          </div>
        )}

        {/* Atalho: CT Virtual */}
        <button
          onClick={() => navigate(ctPath)}
          className="w-full relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-black via-zinc-900/60 to-black p-5 text-left hover:border-primary/40 transition-colors"
        >
          <div className="relative flex items-center gap-4">
            <div className="rounded-xl bg-primary/15 border border-primary/30 p-3">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-xl uppercase italic tracking-tight leading-tight">CT Virtual</h3>
              <p className="text-xs text-muted-foreground mt-1">Aulas e preparação de camp das suas lutas</p>
            </div>
            <ChevronRight className="h-5 w-5 text-primary shrink-0" />
          </div>
        </button>
      </div>

      {/* Treino prescrito — por luta quando o aluno já escolheu as lutas */}
      {temLutas && modalidade ? <PersonalTreino key={modalidade} modalidade={modalidade} /> : <PersonalTreino />}
    </div>
  );
};

export default FightTrainingView;
