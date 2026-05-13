import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/contexts/BrandingProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Dumbbell,
  Apple,
  AlertCircle,
  Pencil,
  Save,
  X,
  Mic,
  MicOff,
  Upload,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

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
  id?: string;
  nome: string;
  horario: string | null;
  ordem: number | null;
  descricao_ia: string | null;
}

export const PrescricaoViewer = ({ open, onOpenChange, alunoId, alunoNome }: Props) => {
  const { tenant } = useBranding();
  const [loading, setLoading] = useState(true);
  const [treinos, setTreinos] = useState<TreinoRow[]>([]);
  const [dieta, setDieta] = useState<DietaRow | null>(null);
  const [refeicoes, setRefeicoes] = useState<RefeicaoRow[]>([]);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [recIdx, setRecIdx] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    setLoading(true);
    const [trRes, dtRes] = await Promise.all([
      supabase
        .from("treinos_prescritos")
        .select(
          "id, dia_semana, ordem, exercicio, series, repeticoes, cadencia, observacao, detalhes_execucao",
        )
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
    setTreinos((trRes.data as TreinoRow[]) || []);
    const d = dtRes.data as DietaRow | null;
    setDieta(d);
    if (d?.id) {
      const { data: refs } = await supabase
        .from("refeicoes")
        .select("id, nome, horario, ordem, descricao_ia")
        .eq("dieta_id", d.id)
        .order("ordem");
      setRefeicoes((refs as RefeicaoRow[]) || []);
    } else {
      setRefeicoes([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!open || !alunoId) return;
    setEditing(false);
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, alunoId]);

  const dias = [...new Set(treinos.map((t) => t.dia_semana))];

  const updateRef = (idx: number, patch: Partial<RefeicaoRow>) => {
    setRefeicoes((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRefeicao = () => {
    setRefeicoes((prev) => [
      ...prev,
      {
        nome: `Refeição ${prev.length + 1}`,
        horario: "08:00:00",
        ordem: prev.length,
        descricao_ia: "",
      },
    ]);
  };

  const removeRefeicao = (idx: number) => {
    setRefeicoes((prev) => prev.filter((_, i) => i !== idx));
  };

  const startVoice = (idx: number) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Seu navegador não suporta reconhecimento de voz.");
      return;
    }
    if (recIdx === idx) {
      recognitionRef.current?.stop();
      setRecIdx(null);
      return;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onstart = () => setRecIdx(idx);
    rec.onend = () => setRecIdx(null);
    rec.onerror = () => setRecIdx(null);
    rec.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(" ");
      setRefeicoes((prev) =>
        prev.map((r, i) =>
          i === idx
            ? { ...r, descricao_ia: ((r.descricao_ia || "") + " " + transcript).trim() }
            : r,
        ),
      );
    };
    rec.start();
    recognitionRef.current = rec;
  };

  const salvarDieta = async () => {
    if (!alunoId) return;
    setSaving(true);
    const tId = toast.loading("Salvando dieta...");
    try {
      let dietaId = dieta?.id;
      if (!dietaId) {
        const { data, error } = await supabase
          .from("dietas")
          .insert({
            user_id: alunoId,
            objetivo: dieta?.objetivo || "hipertrofia",
            kcal_alvo: dieta?.kcal_alvo || 0,
            macros_alvo: dieta?.macros_alvo || {},
            is_published: true,
          } as any)
          .select()
          .single();
        if (error) throw error;
        dietaId = data.id;
      } else {
        const { error } = await supabase
          .from("dietas")
          .update({
            objetivo: dieta?.objetivo,
            kcal_alvo: dieta?.kcal_alvo,
            macros_alvo: dieta?.macros_alvo,
            is_published: true,
          })
          .eq("id", dietaId);
        if (error) throw error;
      }

      await supabase.from("refeicoes").delete().eq("dieta_id", dietaId);
      if (refeicoes.length > 0) {
        const { error } = await supabase.from("refeicoes").insert(
          refeicoes.map((r, i) => ({
            dieta_id: dietaId,
            nome: r.nome,
            horario: r.horario,
            ordem: i,
            descricao_ia: r.descricao_ia,
          })),
        );
        if (error) throw error;
      }

      toast.success("Dieta atualizada!", { id: tId });
      setEditing(false);
      await reload();
    } catch (e: any) {
      toast.error("Erro: " + e.message, { id: tId });
    } finally {
      setSaving(false);
    }
  };

  const handleFile = async (file: File) => {
    if (!tenant) {
      toast.error("Tenant não identificado.");
      return;
    }
    setImporting(true);
    const tId = toast.loading("Lendo arquivo com IA...");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const r = (reader.result as string) || "";
          resolve(r.split(",")[1] || r);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("import-with-ai", {
        body: {
          file: base64,
          fileType: file.type,
          importType: "dieta",
          alunoId,
          tenantId: tenant.id,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Falha ao importar");

      toast.success("Dieta importada com sucesso!", { id: tId });
      await reload();
    } catch (e: any) {
      toast.error("Erro ao importar: " + e.message, { id: tId });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
              {/* Toolbar de edição */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Visualização idêntica ao app do aluno
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleFile(f);
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                  >
                    {importing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Upload className="h-4 w-4 mr-1" />
                    )}
                    Importar PDF/Foto
                  </Button>
                  {!editing ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(true)}
                      className="border-primary/50 text-primary"
                    >
                      <Pencil className="h-4 w-4 mr-1" /> Editar
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(false);
                          void reload();
                        }}
                        disabled={saving}
                      >
                        <X className="h-4 w-4 mr-1" /> Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={salvarDieta}
                        disabled={saving}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Salvar
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {!dieta && refeicoes.length === 0 && !editing ? (
                <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                  <AlertCircle className="h-6 w-6" />
                  <p className="text-sm">Nenhuma dieta gerada ainda.</p>
                  <p className="text-[11px]">
                    Use "Editar" para criar manualmente ou "Importar PDF/Foto".
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-border bg-secondary/30 p-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground uppercase tracking-wider">Objetivo</p>
                      {editing ? (
                        <Input
                          value={dieta?.objetivo || ""}
                          onChange={(e) =>
                            setDieta((d) => ({ ...(d || ({} as any)), objetivo: e.target.value }))
                          }
                          className="h-8 mt-1"
                        />
                      ) : (
                        <p className="font-bold capitalize">{dieta?.objetivo || "—"}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground uppercase tracking-wider">Kcal alvo</p>
                      {editing ? (
                        <Input
                          type="number"
                          value={dieta?.kcal_alvo ?? ""}
                          onChange={(e) =>
                            setDieta((d) => ({
                              ...(d || ({} as any)),
                              kcal_alvo: Number(e.target.value),
                            }))
                          }
                          className="h-8 mt-1"
                        />
                      ) : (
                        <p className="font-bold">{dieta?.kcal_alvo ?? "—"}</p>
                      )}
                    </div>
                    {dieta?.macros_alvo && !editing && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground uppercase tracking-wider mb-1">Macros</p>
                        <p className="font-mono text-[11px]">
                          P {dieta.macros_alvo?.proteina_g ?? "—"}g · C{" "}
                          {dieta.macros_alvo?.carbo_g ?? dieta.macros_alvo?.carboidrato_g ?? "—"}g · G{" "}
                          {dieta.macros_alvo?.gordura_g ?? dieta.macros_alvo?.lipideos_g ?? "—"}g
                        </p>
                      </div>
                    )}
                  </div>

                  {refeicoes.length === 0 && !editing ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Dieta sem refeições registradas.
                    </p>
                  ) : (
                    refeicoes.map((r, idx) => (
                      <div
                        key={r.id || `new-${idx}`}
                        className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2"
                      >
                        {editing ? (
                          <>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="col-span-2">
                                <Label className="text-[9px] uppercase tracking-widest text-muted-foreground">
                                  Nome
                                </Label>
                                <Input
                                  value={r.nome}
                                  onChange={(e) => updateRef(idx, { nome: e.target.value })}
                                  className="h-8 mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-[9px] uppercase tracking-widest text-muted-foreground">
                                  Horário
                                </Label>
                                <Input
                                  type="time"
                                  value={r.horario?.slice(0, 5) || ""}
                                  onChange={(e) =>
                                    updateRef(idx, { horario: e.target.value + ":00" })
                                  }
                                  className="h-8 mt-1"
                                />
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <Textarea
                                value={r.descricao_ia || ""}
                                onChange={(e) => updateRef(idx, { descricao_ia: e.target.value })}
                                placeholder="Ex: 100g frango, 200g arroz, salada à vontade..."
                                className="min-h-[90px] flex-1"
                              />
                              <div className="flex flex-col gap-1">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  onClick={() => startVoice(idx)}
                                  className={
                                    recIdx === idx
                                      ? "bg-red-500/20 text-red-500 border-red-500/50 h-8 w-8"
                                      : "h-8 w-8"
                                  }
                                  title={recIdx === idx ? "Parar gravação" : "Ditar por voz"}
                                >
                                  {recIdx === idx ? (
                                    <MicOff className="h-4 w-4 animate-pulse" />
                                  ) : (
                                    <Mic className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  onClick={() => removeRefeicao(idx)}
                                  className="h-8 w-8 text-destructive"
                                  title="Remover refeição"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {recIdx === idx && (
                              <p className="text-[10px] text-red-500 animate-pulse uppercase tracking-widest">
                                Ouvindo... fale os alimentos e quantidades
                              </p>
                            )}
                          </>
                        ) : (
                          <>
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
                          </>
                        )}
                      </div>
                    ))
                  )}

                  {editing && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addRefeicao}
                      className="w-full border-dashed"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Adicionar refeição
                    </Button>
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
