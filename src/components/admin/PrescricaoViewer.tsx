import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Dumbbell, Apple, AlertCircle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  alunoId: string;
  alunoNome?: string | null;
}

interface TreinoRow {
  id: string;
  dia_semana: string;
  ordem: number | null;
  exercicio: string;
  series: string | null;
  repeticoes: string | null;
  cadencia: string | null;
  observacao: string | null;
  detalhes_execucao: string | null;
}

interface DietaRow {
  id: string;
  kcal_alvo: number | null;
  macros_alvo: any;
  objetivo: string | null;
  observacoes_clinicas: string | null;
  created_at: string;
}

interface RefeicaoRow {
  id: string;
  nome: string;
  horario: string | null;
  ordem: number | null;
  descricao_ia: string | null;
}

export const PrescricaoViewer = ({ open, onOpenChange, alunoId, alunoNome }: Props) => {
  const [loading, setLoading] = useState(true);
  const [treinos, setTreinos] = useState<TreinoRow[]>([]);
  const [dieta, setDieta] = useState<DietaRow | null>(null);
  const [refeicoes, setRefeicoes] = useState<RefeicaoRow[]>([]);

  useEffect(() => {
    if (!open || !alunoId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [trRes, dtRes] = await Promise.all([
        supabase
          .from("treinos_prescritos")
          .select("id, dia_semana, ordem, exercicio, series, repeticoes, cadencia, observacao, detalhes_execucao")
          .eq("aluno_id", alunoId)
          .order("dia_semana")
          .order("ordem"),
        supabase
          .from("dietas")
          .select("id, kcal_alvo, macros_alvo, objetivo, observacoes_clinicas, created_at")
          .eq("user_id", alunoId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setTreinos((trRes.data as TreinoRow[]) || []);
      const d = dtRes.data as DietaRow | null;
      setDieta(d);
      if (d?.id) {
        const { data: refs } = await supabase
          .from("refeicoes")
          .select("id, nome, horario, ordem, descricao_ia")
          .eq("dieta_id", d.id)
          .order("ordem");
        if (!cancelled) setRefeicoes((refs as RefeicaoRow[]) || []);
      } else {
        setRefeicoes([]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, alunoId]);

  const dias = [...new Set(treinos.map((t) => t.dia_semana))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl uppercase tracking-wider">
            Prescrição do Atleta
          </DialogTitle>
          <DialogDescription className="text-xs">
            {alunoNome || "Atleta"} · O que está chegando no app do aluno agora
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="treino" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="treino" className="gap-2">
                <Dumbbell className="h-4 w-4" /> Treino ({treinos.length})
              </TabsTrigger>
              <TabsTrigger value="dieta" className="gap-2">
                <Apple className="h-4 w-4" /> Dieta ({refeicoes.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="treino" className="mt-4 space-y-4">
              {treinos.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                  <AlertCircle className="h-6 w-6" />
                  <p className="text-sm">Nenhum treino prescrito ainda.</p>
                </div>
              ) : (
                dias.map((dia) => {
                  const exs = treinos.filter((t) => t.dia_semana === dia);
                  return (
                    <div key={dia} className="rounded-xl border border-border bg-secondary/30 p-4">
                      <h3 className="font-display text-sm uppercase tracking-wider text-primary mb-3">
                        {dia}
                      </h3>
                      <ol className="space-y-2">
                        {exs.map((e, i) => (
                          <li key={e.id} className="text-sm border-l-2 border-primary/40 pl-3">
                            <p className="font-bold">
                              {i + 1}. {e.exercicio}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {e.series && <>Séries: <b>{e.series}</b> · </>}
                              {e.repeticoes && <>Reps: <b>{e.repeticoes}</b></>}
                              {e.cadencia && <> · Cadência: {e.cadencia}</>}
                            </p>
                            {e.observacao && (
                              <p className="text-[11px] text-muted-foreground italic mt-1">
                                {e.observacao}
                              </p>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="dieta" className="mt-4 space-y-4">
              {!dieta ? (
                <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                  <AlertCircle className="h-6 w-6" />
                  <p className="text-sm">Nenhuma dieta gerada ainda.</p>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-border bg-secondary/30 p-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground uppercase tracking-wider">Objetivo</p>
                      <p className="font-bold capitalize">{dieta.objetivo || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground uppercase tracking-wider">Kcal alvo</p>
                      <p className="font-bold">{dieta.kcal_alvo ?? "—"}</p>
                    </div>
                    {dieta.macros_alvo && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground uppercase tracking-wider mb-1">Macros</p>
                        <p className="font-mono text-[11px]">
                          P {dieta.macros_alvo?.proteina_g ?? "—"}g · C {dieta.macros_alvo?.carbo_g ?? dieta.macros_alvo?.carboidrato_g ?? "—"}g · G {dieta.macros_alvo?.gordura_g ?? dieta.macros_alvo?.lipideos_g ?? "—"}g
                        </p>
                      </div>
                    )}
                  </div>
                  {refeicoes.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Dieta sem refeições registradas.
                    </p>
                  ) : (
                    refeicoes.map((r) => (
                      <div key={r.id} className="rounded-xl border border-border bg-secondary/30 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-display text-sm uppercase tracking-wider text-primary">
                            {r.nome}
                          </h3>
                          {r.horario && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {r.horario.slice(0, 5)}
                            </span>
                          )}
                        </div>
                        {r.descricao_ia && (
                          <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                            {r.descricao_ia}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
