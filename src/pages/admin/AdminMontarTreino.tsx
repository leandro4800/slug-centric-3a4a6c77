import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/contexts/BrandingProvider";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Save, ArrowLeft, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

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

const classificarNivel = (tempo: string | null): "Iniciante" | "Intermediário" | "Avançado" | "Atleta de Alto Nível" => {
  if (!tempo) return "Iniciante";
  const t = tempo.toLowerCase();
  if (t.includes("alto")) return "Atleta de Alto Nível";
  if (t.includes("avan") || t.includes("3 a") || t.includes("4 a") || t.includes("5+")) return "Avançado";
  if (t.includes("inter") || t.includes("1 a") || t.includes("2 a")) return "Intermediário";
  return "Iniciante";
};

const sugerirDivisoes = (frequencia: number, sexo: string | null, nivel: string): string[] => {
  const fem = sexo?.toLowerCase().startsWith("f");
  
  if (nivel === "Atleta de Alto Nível" || nivel === "Avançado") {
    if (frequencia >= 5) {
      return ["Quadríceps", "Costas (Largura)", "Peito/Ombro", "Posterior/Glúteo", "Costas (Espessura)/Braços"];
    }
    if (frequencia === 4) {
      return ["Membros Inferiores (Foco Quad)", "Peito/Ombro", "Costas/Trapézio", "Membros Inferiores (Foco Post)"];
    }
  }

  if (frequencia <= 3) return fem ? ["Glúteo/Posterior", "Peito/Tríceps", "Costas/Bíceps"] : ["Push", "Pull", "Legs"];
  if (frequencia === 4) return fem
    ? ["Glúteo/Posterior", "Peito/Ombro", "Glúteo/Quadríceps", "Costas/Braço"]
    : ["Treino A", "Treino B", "Treino C", "Treino D"];
  if (frequencia === 5) return ["Treino A", "Treino B", "Treino C", "Treino D", "Treino E"];
  return ["Treino A", "Treino B", "Treino C", "Treino D", "Treino E", "Treino F"];
};

const AdminMontarTreino = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { tenant } = useBranding();
  const { user } = useAuth();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [alunoId, setAlunoId] = useState<string>("");
  const [perfil, setPerfil] = useState<PerfilTreino>({
    sexo: "", idade: null, peso_kg: null, altura_cm: null, bf_pct: null,
    objetivo: "hipertrofia", frequencia_semanal: 4, tempo_treino: "Iniciante",
    lesoes: [], limitacoes: [],
  });
  const [exercicios, setExercicios] = useState<ExercicioPrescrito[]>([]);
  const [cardio, setCardio] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    void (async () => {
      const { data } = await supabase
        .from("perfis")
        .select("id, nome_completo, email")
        .eq("tenant_id", tenant.id);
      setAlunos((data as Aluno[]) || []);
    })();
  }, [tenant]);

  useEffect(() => {
    if (!alunoId || !tenant) return;
    void (async () => {
      const { data } = await supabase
        .from("perfis_treino")
        .select("*")
        .eq("aluno_id", alunoId)
        .maybeSingle();
      if (data) {
        setPerfil({
          sexo: data.sexo,
          idade: data.idade,
          peso_kg: data.peso_kg,
          altura_cm: data.altura_cm,
          bf_pct: data.bf_pct,
          objetivo: data.objetivo,
          frequencia_semanal: data.frequencia_semanal,
          tempo_treino: data.tempo_treino,
          lesoes: data.lesoes || [],
          limitacoes: data.limitacoes || [],
        });
      }
      const { data: tp } = await supabase
        .from("treinos_prescritos")
        .select("dia_semana, ordem, exercicio, series, repeticoes, observacao, cadencia, detalhes_execucao")
        .eq("aluno_id", alunoId)
        .eq("tenant_id", tenant.id)
        .order("dia_semana")
        .order("ordem");
      if (tp) {
        setExercicios(tp.map((e) => ({
          dia_semana: e.dia_semana,
          ordem: e.ordem || 0,
          exercicio: e.exercicio,
          series: e.series || "",
          repeticoes: e.repeticoes || "",
          observacao: e.observacao || "",
          cadencia: e.cadencia || "",
          detalhes_execucao: e.detalhes_execucao || "",
        })));
      } else {
        setExercicios([]);
      }
    })();
  }, [alunoId, tenant]);

  const nivel = useMemo(() => classificarNivel(perfil.tempo_treino), [perfil.tempo_treino]);
  const divisoes = useMemo(
    () => sugerirDivisoes(perfil.frequencia_semanal || 4, perfil.sexo, nivel),
    [perfil.frequencia_semanal, perfil.sexo, nivel]
  );

  const salvarPerfil = async () => {
    if (!alunoId || !tenant) return;
    const { error } = await supabase
      .from("perfis_treino")
      .upsert({ aluno_id: alunoId, tenant_id: tenant.id, ...perfil }, { onConflict: "aluno_id" });
    if (error) toast.error(error.message);
    else toast.success("Perfil salvo.");
  };

  const gerarComIA = async () => {
    if (!alunoId || !tenant) {
      toast.error("Selecione um aluno.");
      return;
    }
    setGenerating(true);
    try {
      await salvarPerfil();
      const { data: biblioteca } = await supabase
        .from("biblioteca_exercicios")
        .select("nome, grupo_muscular, contraindicacoes")
        .eq("tenant_id", tenant.id);

      const { data, error } = await supabase.functions.invoke("gerar-treino-ia", {
        body: { perfil, biblioteca: biblioteca || [], divisoes },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const novos: ExercicioPrescrito[] = [];
      (data.dias || []).forEach((d: any) => {
        (d.exercicios || []).forEach((e: any, idx: number) => {
          novos.push({
            dia_semana: d.dia,
            ordem: idx,
            exercicio: e.nome,
            series: e.series,
            repeticoes: e.repeticoes,
            cadencia: e.cadencia,
            detalhes_execucao: e.detalhes_execucao,
            observacao: e.observacao,
          });
        });
      });
      setExercicios(novos);
      setCardio(data.cardio || "");
      toast.success(`Treino gerado · ${novos.length} exercícios`);
    } catch (e: any) {
      toast.error(e.message || "Falha ao gerar.");
    } finally {
      setGenerating(false);
    }
  };

  const salvarPrescricao = async () => {
    if (!alunoId || !tenant) return;
    setSaving(true);
    await supabase.from("treinos_prescritos").delete().eq("aluno_id", alunoId).eq("tenant_id", tenant.id);
    if (exercicios.length > 0) {
      const rows = exercicios.map((e) => ({
        tenant_id: tenant.id,
        aluno_id: alunoId,
        dia_semana: e.dia_semana,
        ordem: e.ordem,
        exercicio: e.exercicio,
        series: e.series,
        repeticoes: e.repeticoes,
        cadencia: e.cadencia,
        detalhes_execucao: e.detalhes_execucao,
        observacao: e.observacao,
      }));
      const { error } = await supabase.from("treinos_prescritos").insert(rows);
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
    }
    toast.success("Prescrição salva!");
    setSaving(false);
  };

  const updateEx = (idx: number, patch: Partial<ExercicioPrescrito>) => {
    setExercicios((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  };
  const removeEx = (idx: number) => setExercicios((prev) => prev.filter((_, i) => i !== idx));
  const addEx = (dia: string) => {
    setExercicios((prev) => [
      ...prev,
      { dia_semana: dia, ordem: prev.filter((e) => e.dia_semana === dia).length, exercicio: "", series: "3", repeticoes: "10-12", observacao: "" },
    ]);
  };

  const dias = [...new Set(exercicios.map((e) => e.dia_semana))];

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <Link to={`/${slug}/admin`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="font-display text-2xl">MONTAR TREINO</h1>
          <span className="text-[10px] px-2 py-0.5 rounded bg-red-600/20 text-red-500 uppercase font-black tracking-widest border border-red-600/30 shadow-[0_0_10px_rgba(220,38,38,0.2)]">IA Pacho</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Selecionar aluno */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-sm">
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
            <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-sm space-y-4">
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
              <div className="text-xs text-muted-foreground">
                Divisões sugeridas: <strong className="text-foreground">{divisoes.join(" · ")}</strong>
              </div>
              <div className="flex gap-3">
                <Button onClick={salvarPerfil} variant="outline">Salvar perfil</Button>
                <Button onClick={gerarComIA} disabled={generating} className="bg-gradient-primary shadow-glow">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Gerar com IA
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

            {/* Editor de prescrição */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-sm space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl">PRESCRIÇÃO</h2>
                <Button onClick={salvarPrescricao} disabled={saving} className="bg-gradient-primary">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar prescrição
                </Button>
              </div>

              {dias.length === 0 && (
                <p className="text-sm text-muted-foreground">Sem exercícios. Gere com IA ou adicione manualmente.</p>
              )}

              {dias.map((dia) => (
                <div key={dia} className="border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg">{dia}</h3>
                    <Button size="sm" variant="ghost" onClick={() => addEx(dia)}>
                      <Plus className="h-4 w-4 mr-1" /> Adicionar
                    </Button>
                  </div>
                  {exercicios
                    .map((e, globalIdx) => ({ e, globalIdx }))
                    .filter(({ e }) => e.dia_semana === dia)
                    .map(({ e, globalIdx }) => (
                      <div key={globalIdx} className="grid grid-cols-12 gap-2 items-start border-b border-border/50 pb-4 last:border-0 last:pb-0">
                        <div className="col-span-5 space-y-2">
                          <Input placeholder="Exercício" value={e.exercicio} onChange={(ev) => updateEx(globalIdx, { exercicio: ev.target.value })} />
                          <Input className="text-xs h-8" placeholder="Cadência (ex: 4-0-2-0)" value={e.cadencia} onChange={(ev) => updateEx(globalIdx, { cadencia: ev.target.value })} />
                        </div>
                        <div className="col-span-1">
                          <Input placeholder="Sx" value={e.series} onChange={(ev) => updateEx(globalIdx, { series: ev.target.value })} />
                        </div>
                        <div className="col-span-2">
                          <Input placeholder="Reps" value={e.repeticoes} onChange={(ev) => updateEx(globalIdx, { repeticoes: ev.target.value })} />
                        </div>
                        <div className="col-span-3 space-y-2">
                          <Textarea className="min-h-[40px] text-xs" placeholder="Detalhes de Execução (Pacho style)" value={e.detalhes_execucao} onChange={(ev) => updateEx(globalIdx, { detalhes_execucao: ev.target.value })} />
                          <Textarea className="min-h-[40px] text-xs" placeholder="Observação" value={e.observacao} onChange={(ev) => updateEx(globalIdx, { observacao: ev.target.value })} />
                        </div>
                        <Button size="icon" variant="ghost" className="col-span-1 self-center" onClick={() => removeEx(globalIdx)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
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
