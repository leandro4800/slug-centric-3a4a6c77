import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  Upload,
  Plus,
  Trash2,
  Sparkles,
  RefreshCw,
  ChevronDown,
  Video,
  Link2,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { invokeEdgeFunction } from "@/lib/invoke-edge-function";
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

interface ItemDietaRow {
  id: string;
  refeicao_id: string;
  quantidade_g: number | null;
  substituicoes: string | null;
  alimento_id: string | null;
  alimento?: { id: string; nome: string } | null;
}

const VincularAlimento = ({
  item,
  onLinked,
}: {
  item: ItemDietaRow;
  onLinked: (itemId: string, alimento: { id: string; nome: string }) => void;
}) => {
  const [openPop, setOpenPop] = useState(false);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<Array<{ id: string; nome: string }>>([]);
  const [buscando, setBuscando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!openPop) return;
    const q = busca.trim();
    const t = setTimeout(async () => {
      setBuscando(true);
      let query = supabase.from("alimentos_taco").select("id, nome").order("nome").limit(12);
      if (q) query = query.ilike("nome", `%${q}%`);
      const { data } = await query;
      setResultados((data as Array<{ id: string; nome: string }>) || []);
      setBuscando(false);
    }, 250);
    return () => clearTimeout(t);
  }, [busca, openPop]);

  const vincular = async (a: { id: string; nome: string }) => {
    setSalvando(true);
    const { error } = await supabase.from("itens_refeicao").update({ alimento_id: a.id }).eq("id", item.id);
    setSalvando(false);
    if (error) {
      toast.error("Erro ao vincular: " + error.message);
      return;
    }
    onLinked(item.id, a);
    setOpenPop(false);
    toast.success(`Item vinculado a "${a.nome}" (TACO).`);
  };

  return (
    <Popover open={openPop} onOpenChange={setOpenPop}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[10px] font-bold uppercase tracking-wider border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground shrink-0"
        >
          <Link2 className="h-3 w-3 mr-1" /> Vincular alimento
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="end">
        <Input
          autoFocus
          placeholder="Buscar na TACO... (ex: ovo, frango)"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-8 text-xs mb-2"
        />
        <div className="max-h-56 overflow-y-auto space-y-0.5">
          {buscando ? (
            <div className="flex justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          ) : resultados.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-3">
              Nenhum alimento encontrado.
            </p>
          ) : (
            resultados.map((a) => (
              <button
                key={a.id}
                onClick={() => void vincular(a)}
                disabled={salvando}
                className="w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
              >
                {a.nome}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const PrescricaoViewer = ({ open, onOpenChange, alunoId, alunoNome }: Props) => {
  const { tenant } = useBranding();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [treinos, setTreinos] = useState<TreinoRow[]>([]);
  const [dieta, setDieta] = useState<DietaRow | null>(null);
  const [refeicoes, setRefeicoes] = useState<RefeicaoRow[]>([]);
  const [itensPorRef, setItensPorRef] = useState<Record<string, ItemDietaRow[]>>({});

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [iaCommand, setIaCommand] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    const [trRes, dtRes] = await Promise.all([
      supabase
        .from("treinos_prescritos")
        .select(
          "id, dia_semana, dia_ordem, ordem, exercicio, series, repeticoes, cadencia, observacao, detalhes_execucao",
        )
        .eq("aluno_id", alunoId)
        .eq("tenant_id", tenant.id)
        .order("dia_ordem", { nullsFirst: false })
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
      const refList = (refs as RefeicaoRow[]) || [];
      setRefeicoes(refList);
      const refIds = refList.map((r) => r.id).filter(Boolean) as string[];
      if (refIds.length > 0) {
        const { data: its } = await supabase
          .from("itens_refeicao")
          .select("id, refeicao_id, quantidade_g, substituicoes, alimento_id, alimento:alimentos_taco(id, nome)")
          .in("refeicao_id", refIds);
        const map: Record<string, ItemDietaRow[]> = {};
        ((its as unknown as ItemDietaRow[]) || []).forEach((i) => {
          (map[i.refeicao_id] ||= []).push(i);
        });
        setItensPorRef(map);
      } else {
        setItensPorRef({});
      }
    } else {
      setRefeicoes([]);
      setItensPorRef({});
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


  const aplicarTotaisDieta = (totais: any) => {
    if (!totais) return;
    const kcal = Math.round(Number(totais.kcal) || 0);
    const macros = {
      proteina_g: Math.round(Number(totais.proteina_g) || 0),
      carboidrato_g: Math.round(Number(totais.carboidrato_g) || 0),
      lipideos_g: Math.round(Number(totais.lipideos_g) || 0),
      badge: "Recalculado",
    };
    setDieta((d) => ({
      ...(d || ({} as any)),
      kcal_alvo: kcal,
      macros_alvo: macros,
    }));
  };

  const recalcularMacros = async (baseRefeicoes = refeicoes, showToast = true) => {
    if (!alunoId || baseRefeicoes.length === 0 || !dieta?.id) {
      if (showToast) toast.error("Salve a dieta antes de recalcular.");
      return null;
    }
    setRecalculating(true);
    const tId = showToast ? toast.loading("Recalculando calorias e macros...") : undefined;
    try {
      await supabase.from("refeicoes").delete().eq("dieta_id", dieta.id);
      const { error: refsError } = await supabase.from("refeicoes").insert(
        baseRefeicoes.map((r, i) => ({
          dieta_id: dieta.id,
          nome: r.nome,
          horario: r.horario,
          ordem: i,
          descricao_ia: r.descricao_ia,
        })),
      );
      if (refsError) throw refsError;

      const { data, error } = await supabase.functions.invoke("gerar-dieta", {
        body: {
          mode: "recalc",
          aluno_id: alunoId,
          dieta_id: dieta.id,
          refeicoes: baseRefeicoes.map((r) => ({ nome: r.nome, descricao: r.descricao_ia || "" })),
        },
      });
      if (error) throw error;
      if (data?.totais) {
        aplicarTotaisDieta(data.totais);
        if (showToast) {
          toast.success(`Recalculado: ${Math.round(data.totais.kcal || 0)} kcal`, { id: tId });
        }
      }
      if (Array.isArray(data?.refeicoes)) {
        setRefeicoes((prev) =>
          prev.map((r, i) => ({ ...r, descricao_ia: data.refeicoes[i]?.descricao_ia || r.descricao_ia })),
        );
      }
      return data;
    } catch (e: any) {
      if (showToast) toast.error("Erro ao recalcular: " + e.message, { id: tId });
      throw e;
    } finally {
      setRecalculating(false);
    }
  };

  const ajustarComIA = async () => {
    if (!alunoId || refeicoes.length === 0) return;
    setAdjusting(true);
    const tId = toast.loading("Ajustando dieta com IA...");
    try {
      const { data, error } = await supabase.functions.invoke("gerar-dieta", {
        body: { 
          mode: "refine",
          aluno_id: alunoId,
          dieta_id: dieta?.id,
          kcal_alvo: dieta?.kcal_alvo,
          macros_alvo: dieta?.macros_alvo,
          prompt: iaCommand,
          refeicoes: refeicoes.map(r => ({ nome: r.nome, descricao: r.descricao_ia }))
        },
      });

      if (error) throw error;

      if (data?.refeicoes) {
        const ajustadas = refeicoes.map((r, i) => ({
          ...r,
          descricao_ia: data.refeicoes[i]?.descricao_ia || r.descricao_ia,
        }));
        setRefeicoes(ajustadas);
        if (data?.totais) aplicarTotaisDieta(data.totais);
        const recalc = await recalcularMacros(ajustadas, false).catch(() => null);
        if (recalc?.totais) aplicarTotaisDieta(recalc.totais);
        toast.success(
          `Dieta ajustada e recalculada! ${recalc?.totais?.kcal ? `${Math.round(recalc.totais.kcal)} kcal` : ""}`,
          { id: tId }
        );
      }
    } catch (e: any) {
      toast.error("Erro ao ajustar: " + e.message, { id: tId });
    } finally {
      setAdjusting(false);
    }
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

      const data = await invokeEdgeFunction<{ success?: boolean }>("import-with-ai", {
        file: base64,
        fileType: file.type,
        importType: "dieta",
        alunoId,
        tenantId: tenant.id,
      });
      if (!data?.success) throw new Error("Falha ao importar");

      toast.success("Dieta importada com sucesso!", { id: tId });
      await reload();
    } catch (e: any) {
      // Erros 422 da função (ex.: nenhuma refeição identificada) chegam com a mensagem
      // real no corpo — exibe de forma visível e NÃO avança a tela.
      toast.error(e?.message || "Erro ao importar", { id: tId, duration: 10000 });
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
              <TreinoEditor
                alunoId={alunoId}
                tenantId={tenant?.id || null}
                treinos={treinos}
                onSaved={reload}
              />
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void recalcularMacros()}
                      disabled={recalculating || refeicoes.length === 0 || !dieta?.id}
                      className="border-primary/40 text-primary"
                    >
                      {recalculating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-1" />
                      )}
                      Recalcular macros
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
                  {editing && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Comando Geral para IA
                        </Label>
                        <span className="text-[9px] text-muted-foreground uppercase">Muda a dieta por inteiro</span>
                      </div>
                      <div className="flex gap-2">
                        <Textarea 
                          value={iaCommand}
                          onChange={(e) => setIaCommand(e.target.value)}
                          placeholder="Ex: Dieta com muito volume, colocar no máximo 100g de aveia por refeição..."
                          className="min-h-[70px] flex-1 bg-background/50 text-xs"
                        />
                        <Button
                          type="button"
                          onClick={ajustarComIA}
                          disabled={adjusting || !iaCommand}
                          className="h-auto bg-primary text-primary-foreground text-[10px] uppercase font-bold px-4"
                        >
                          {adjusting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Ajustar"}
                        </Button>
                      </div>
                    </div>
                  )}

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
                            {(itensPorRef[r.id || ""] || []).length > 0 && (
                              <div className="border-t border-border/50 pt-2 space-y-1.5">
                                {(itensPorRef[r.id || ""] || []).map((it) => (
                                  <div key={it.id} className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs text-foreground/90 truncate">
                                        {it.quantidade_g ? `${it.quantidade_g}g ` : ""}
                                        {it.substituicoes || it.alimento?.nome || "—"}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground truncate">
                                        {it.alimento ? `TACO: ${it.alimento.nome}` : "Sem alimento vinculado"}
                                      </p>
                                    </div>
                                    {!it.alimento_id && (
                                      <VincularAlimento
                                        item={it}
                                        onLinked={(itemId, al) =>
                                          setItensPorRef((prev) => ({
                                            ...prev,
                                            [r.id as string]: (prev[r.id as string] || []).map((x) =>
                                              x.id === itemId ? { ...x, alimento_id: al.id, alimento: al } : x,
                                            ),
                                          }))
                                        }
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
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

// ====================== Treino inline editor ======================
interface TreinoEditItem {
  _key: string;
  id?: string;
  dia_semana: string;
  ordem: number;
  exercicio: string;
  series: string;
  repeticoes: string;
  cadencia: string;
  detalhes_execucao: string;
  observacao: string;
}

interface BibliotecaExercicio {
  id: string;
  nome: string;
  grupo_muscular: string;
  video_url: string | null;
  video_coach_url: string | null;
}

const normalizarBusca = (texto: string) =>
  texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const ExerciseLibraryPicker = ({
  value,
  biblioteca,
  onChange,
}: {
  value: string;
  biblioteca: BibliotecaExercicio[];
  onChange: (value: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const termo = normalizarBusca(busca);
  const lista = termo
    ? biblioteca.filter((item) =>
        normalizarBusca(`${item.nome} ${item.grupo_muscular}`).includes(termo),
      )
    : biblioteca;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative isolate mt-1 overflow-visible">
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ex: Agachamento Livre"
          className="relative z-0 w-full min-w-0 pr-14"
        />
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="icon"
            className="absolute right-px top-px z-[60] h-[calc(100%-2px)] w-12 rounded-l-none rounded-r-[5px] border-0 border-l border-primary-foreground/30 bg-primary p-0 text-primary-foreground shadow-none hover:bg-primary/90"
            title="Buscar exercícios salvos nos vídeos técnicos"
            aria-label="Buscar exercícios salvos nos vídeos técnicos"
          >
            <ChevronDown className="h-6 w-6" />
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent align="end" className="z-[100] w-[min(340px,calc(100vw-2rem))] max-h-[22rem] overflow-auto p-0">
        <div className="sticky top-0 z-10 border-b border-border/40 bg-popover p-2">
          <Input
            autoFocus
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar exercício..."
            className="h-8 text-xs"
          />
        </div>
        {lista.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">Nenhum exercício salvo encontrado.</p>
        ) : (
          <ul className="divide-y divide-border/30">
            {lista.map((item) => (
              <li key={item.id}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    onChange(item.nome);
                    setOpen(false);
                    setBusca("");
                  }}
                  className="h-auto w-full justify-between rounded-none px-3 py-2 text-left"
                >
                  <span className="flex min-w-0 items-center gap-1.5 truncate text-xs">
                    {(item.video_coach_url || item.video_url) && (
                      <Video className="h-3 w-3 shrink-0 text-emerald-400" />
                    )}
                    <span className="truncate">{item.nome}</span>
                  </span>
                  <span className="ml-2 shrink-0 text-[9px] uppercase text-muted-foreground">
                    {item.grupo_muscular}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
};

// Campo compacto que abre um editor maior em modal ao clicar
const ExpandableField = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);
  return (
    <>
      <Input
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        onFocus={(ev) => {
          ev.currentTarget.blur();
          setOpen(true);
        }}
        readOnly
        placeholder={placeholder}
        className="cursor-pointer"
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>Edite o valor completo abaixo.</DialogDescription>
          </DialogHeader>
          <Textarea
            autoFocus
            rows={4}
            value={draft}
            onChange={(ev) => setDraft(ev.target.value)}
            placeholder={placeholder}
            className="text-base"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
            >
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};


const TreinoEditor = ({
  alunoId,
  tenantId,
  treinos,
  onSaved,
}: {
  alunoId: string;
  tenantId: string | null;
  treinos: TreinoRow[];
  onSaved: () => Promise<void> | void;
}) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<TreinoEditItem[]>([]);
  const [biblioteca, setBiblioteca] = useState<BibliotecaExercicio[]>([]);

  useEffect(() => {
    void (async () => {
      const bibliotecaQuery = tenantId
        ? supabase
            .from("biblioteca_exercicios")
            .select("id, nome, grupo_muscular, video_url, video_coach_url")
            .eq("tenant_id", tenantId)
            .limit(2000)
        : Promise.resolve({ data: [] as any[] });
      const [bibliotecaRes, referenciasRes] = await Promise.all([
        bibliotecaQuery,
        supabase
          .from("referencia_exercicios")
          .select("id, nome_exercicio, grupamento_muscular, url_video")
          .not("url_video", "is", null)
          .range(0, 4999),
      ]);
      const locais: BibliotecaExercicio[] = ((bibliotecaRes.data as any[]) || []).map((item) => ({
        id: item.id,
        nome: item.nome,
        grupo_muscular: item.grupo_muscular || "",
        video_url: item.video_url,
        video_coach_url: item.video_coach_url,
      }));
      const referencias: BibliotecaExercicio[] = ((referenciasRes.data as any[]) || []).map((item) => ({
        id: item.id,
        nome: item.nome_exercicio,
        grupo_muscular: item.grupamento_muscular || "",
        video_url: item.url_video,
        video_coach_url: null,
      }));
      // Prioriza a versão que possui vídeo. Sem isso, um item local sem vídeo
      // pode ocultar uma referência técnica de mesmo nome que possui URL salva.
      const porPrioridade = [...locais, ...referencias].sort((a, b) => {
        const aTemVideo = Boolean(a.video_coach_url || a.video_url);
        const bTemVideo = Boolean(b.video_coach_url || b.video_url);
        return Number(bTemVideo) - Number(aTemVideo);
      });
      const nomes = new Set<string>();
      const mesclados = porPrioridade
        .filter((item) => {
          const chave = normalizarBusca(item.nome || "");
          if (!chave || nomes.has(chave)) return false;
          nomes.add(chave);
          return true;
        })
        .sort((a, b) => a.nome.localeCompare(b.nome));
      setBiblioteca(mesclados);
    })();
  }, [tenantId]);

  const buildFromTreinos = (): TreinoEditItem[] =>
    treinos.map((t, i) => ({
      _key: t.id || `k-${i}`,
      id: t.id,
      dia_semana: t.dia_semana || "",
      ordem: typeof t.ordem === "number" ? t.ordem : i,
      exercicio: t.exercicio || "",
      series: t.series || "",
      repeticoes: t.repeticoes || "",
      cadencia: t.cadencia || "",
      detalhes_execucao: t.detalhes_execucao || "",
      observacao: t.observacao || "",
    }));

  useEffect(() => {
    if (!editing) setItems(buildFromTreinos());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treinos, editing]);

  const dias = [...new Set(items.map((i) => i.dia_semana))];

  const updateItem = (key: string, patch: Partial<TreinoEditItem>) =>
    setItems((prev) => prev.map((it) => (it._key === key ? { ...it, ...patch } : it)));

  const removeItem = (key: string) =>
    setItems((prev) => prev.filter((it) => it._key !== key));

  const moveItem = (key: string, dir: -1 | 1) => {
    setItems((prev) => {
      const dia = prev.find((i) => i._key === key)?.dia_semana;
      if (!dia) return prev;
      const arr = [...prev];
      const dayIdxs = arr.map((it, i) => ({ it, i })).filter((x) => x.it.dia_semana === dia);
      const localIdx = dayIdxs.findIndex((x) => x.it._key === key);
      const targetLocal = localIdx + dir;
      if (targetLocal < 0 || targetLocal >= dayIdxs.length) return prev;
      const globA = dayIdxs[localIdx].i;
      const globB = dayIdxs[targetLocal].i;
      [arr[globA], arr[globB]] = [arr[globB], arr[globA]];
      return arr;
    });
  };

  const addExercicio = (dia: string) => {
    setItems((prev) => {
      const indices = prev.map((i, idx) => (i.dia_semana === dia ? idx : -1)).filter((x) => x >= 0);
      const lastIdx = indices.length > 0 ? indices[indices.length - 1] : undefined;
      const novo: TreinoEditItem = {
        _key: `new-${Date.now()}-${Math.random()}`,
        dia_semana: dia,
        ordem: 0,
        exercicio: "",
        series: "",
        repeticoes: "",
        cadencia: "",
        detalhes_execucao: "",
        observacao: "",
      };
      if (lastIdx === undefined) return [...prev, novo];
      const arr = [...prev];
      arr.splice(lastIdx + 1, 0, novo);
      return arr;
    });
  };

  const addDia = () => {
    const letras = ["A", "B", "C", "D", "E", "F", "G"];
    const usados = new Set(dias.map((d) => d.trim().charAt(0).toUpperCase()));
    const proxima = letras.find((l) => !usados.has(l)) || `Dia ${dias.length + 1}`;
    const label = `${proxima} — Novo Treino`;
    setItems((prev) => [
      ...prev,
      {
        _key: `new-${Date.now()}-${Math.random()}`,
        dia_semana: label,
        ordem: 0,
        exercicio: "",
        series: "",
        repeticoes: "",
        cadencia: "",
        detalhes_execucao: "",
        observacao: "",
      },
    ]);
  };

  const renameDia = (diaAntigo: string, novo: string) => {
    setItems((prev) => prev.map((it) => (it.dia_semana === diaAntigo ? { ...it, dia_semana: novo } : it)));
  };

  const removeDia = (dia: string) => {
    if (!confirm(`Remover o dia "${dia}" e todos os seus exercícios?`)) return;
    setItems((prev) => prev.filter((it) => it.dia_semana !== dia));
  };

  // Move o dia inteiro para cima/baixo na sequência (reordena dia_ordem ao salvar)
  const moveDia = (dia: string, dir: -1 | 1) => {
    setItems((prev) => {
      const ordemDias = [...new Set(prev.map((t) => t.dia_semana))];
      const idx = ordemDias.indexOf(dia);
      const alvo = idx + dir;
      if (idx < 0 || alvo < 0 || alvo >= ordemDias.length) return prev;
      [ordemDias[idx], ordemDias[alvo]] = [ordemDias[alvo], ordemDias[idx]];
      return ordemDias.flatMap((d) => prev.filter((t) => t.dia_semana === d));
    });
  };

  const salvar = async () => {
    if (!tenantId) {
      toast.error("Tenant não identificado.");
      return;
    }
    const validos = items.filter((i) => i.exercicio.trim() && i.dia_semana.trim());
    if (validos.length === 0) {
      toast.error("Adicione ao menos 1 exercício antes de salvar.");
      return;
    }
    setSaving(true);
    const tId = toast.loading("Salvando treino...");
    try {
      const { error: delErr } = await supabase
        .from("treinos_prescritos")
        .delete()
        .eq("aluno_id", alunoId)
        .eq("tenant_id", tenantId);
      if (delErr) throw delErr;

      const porDia: Record<string, number> = {};
      // dia_ordem segue a ordem de aparição dos dias no editor (1, 2, 3...)
      const ordemDias = new Map<string, number>();
      const rows = validos.map((i) => {
        porDia[i.dia_semana] = (porDia[i.dia_semana] ?? -1) + 1;
        if (!ordemDias.has(i.dia_semana)) ordemDias.set(i.dia_semana, ordemDias.size + 1);
        return {
          aluno_id: alunoId,
          tenant_id: tenantId,
          dia_semana: i.dia_semana,
          dia_ordem: ordemDias.get(i.dia_semana)!,
          ordem: porDia[i.dia_semana],
          exercicio: i.exercicio,
          series: i.series || null,
          repeticoes: i.repeticoes || null,
          cadencia: i.cadencia || null,
          detalhes_execucao: i.detalhes_execucao || null,
          observacao: i.observacao || null,
        };
      });

      const { error: insErr } = await supabase.from("treinos_prescritos").insert(rows);
      if (insErr) throw insErr;

      toast.success("Treino atualizado!", { id: tId });
      setEditing(false);
      await onSaved();
    } catch (e: any) {
      toast.error("Erro: " + e.message, { id: tId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {editing ? "Editando o treino do atleta" : "Visualização idêntica ao app do aluno"}
        </div>
        <div className="flex flex-wrap gap-2">
          {!editing ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setItems(buildFromTreinos());
                setEditing(true);
              }}
              className="border-primary/50 text-primary"
            >
              <Pencil className="h-4 w-4 mr-1" />
              {treinos.length === 0 ? "Montar Treino" : "Editar Treino"}
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setItems(buildFromTreinos());
                }}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
              <Button
                size="sm"
                onClick={salvar}
                disabled={saving}
                className="bg-primary hover:bg-primary/90"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Confirmar e Enviar
              </Button>
            </>
          )}
        </div>
      </div>

      {!editing && treinos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <AlertCircle className="h-6 w-6" />
          <p className="text-sm">Nenhum treino prescrito ainda.</p>
          <p className="text-[11px]">Clique em "Montar Treino" para começar.</p>
        </div>
      ) : !editing ? (
        <>
          {dias.map((dia) => {
            const exs = items.filter((t) => t.dia_semana === dia);
            return (
              <div key={dia} className="rounded-xl border border-border bg-secondary/30 p-4">
                <h3 className="font-display text-sm uppercase tracking-wider text-primary mb-3">
                  {dia}
                </h3>
                <ol className="space-y-2">
                  {exs.map((e, i) => (
                    <li key={e._key} className="text-sm border-l-2 border-primary/40 pl-3">
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
          })}
        </>
      ) : (
        <>
          {dias.map((dia, diaIdx) => {
            const exs = items.filter((t) => t.dia_semana === dia);
            return (
              <div key={dia}>
                {diaIdx > 0 && (
                  <div className="flex justify-center my-5 sm:my-6" aria-hidden>
                    <div className="h-1.5 w-full rounded-full bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
                  </div>
                )}
              <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground select-none"
                    title={`Dia ${diaIdx + 1}`}
                  >
                    {diaIdx + 1}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-6"
                      title="Mover dia para cima"
                      onClick={() => moveDia(dia, -1)}
                      disabled={diaIdx === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-6"
                      title="Mover dia para baixo"
                      onClick={() => moveDia(dia, 1)}
                      disabled={diaIdx === dias.length - 1}
                    >
                      ↓
                    </Button>
                  </div>
                  <Input
                    value={dia}
                    onChange={(e) => renameDia(dia, e.target.value)}
                    className="flex-1 font-display uppercase tracking-wider text-primary bg-background"
                  />
                  <Button size="sm" variant="ghost" onClick={() => addExercicio(dia)}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeDia(dia)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  {exs.map((e, i) => (
                    <div
                      key={e._key}
                      className="rounded-lg border border-border bg-background p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-widest text-primary font-bold">
                          Exercício {i + 1}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => moveItem(e._key, -1)}
                            disabled={i === 0}
                          >
                            ↑
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => moveItem(e._key, 1)}
                            disabled={i === exs.length - 1}
                          >
                            ↓
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeItem(e._key)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label className="text-[10px] uppercase">Nome do exercício</Label>
                        <ExerciseLibraryPicker
                          value={e.exercicio}
                          biblioteca={biblioteca}
                          onChange={(value) => updateItem(e._key, { exercicio: value })}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-[10px] uppercase">Séries</Label>
                          <ExpandableField
                            label="Séries"
                            value={e.series}
                            onChange={(v) => updateItem(e._key, { series: v })}
                            placeholder="3x"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase">Reps</Label>
                          <ExpandableField
                            label="Repetições"
                            value={e.repeticoes}
                            onChange={(v) => updateItem(e._key, { repeticoes: v })}
                            placeholder="8-12"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase">Cadência</Label>
                          <ExpandableField
                            label="Cadência"
                            value={e.cadencia}
                            onChange={(v) => updateItem(e._key, { cadencia: v })}
                            placeholder="3-1-X-0"
                          />
                        </div>
                      </div>


                      <div>
                        <Label className="text-[10px] uppercase">Detalhes de execução</Label>
                        <Textarea
                          rows={2}
                          value={e.detalhes_execucao}
                          onChange={(ev) => updateItem(e._key, { detalhes_execucao: ev.target.value })}
                          placeholder="Warm-up, feeder, work sets..."
                        />
                      </div>

                      <div>
                        <Label className="text-[10px] uppercase">Observação</Label>
                        <Textarea
                          rows={2}
                          value={e.observacao}
                          onChange={(ev) => updateItem(e._key, { observacao: ev.target.value })}
                          placeholder="PSE, ponto fraco, foco..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <Button
            variant="outline"
            className="w-full border-dashed border-primary/50 text-primary"
            onClick={addDia}
          >
            <Plus className="h-4 w-4 mr-1" /> Adicionar Dia (A, B, C...)
          </Button>
        </>
      )}
    </div>
  );
};
