import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Ruler, Calendar, TrendingUp, Info, Pencil, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { parseAlturaCm } from "@/lib/body-metrics";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alunoId: string;
}

const NUM_FIELDS: { key: string; label: string; suffix?: string }[] = [
  { key: "peso_kg", label: "Peso", suffix: "kg" },
  { key: "altura_cm", label: "Altura", suffix: "cm" },
  { key: "bf_pct_calculado", label: "BF", suffix: "%" },
  { key: "massa_magra_kg", label: "M. Magra", suffix: "kg" },
  { key: "massa_gorda_kg", label: "M. Gorda", suffix: "kg" },
  { key: "pescoco_cm", label: "Pescoço", suffix: "cm" },
  { key: "cintura_cm", label: "Cintura", suffix: "cm" },
  { key: "quadril_cm", label: "Quadril", suffix: "cm" },
  { key: "peitoral", label: "Peitoral", suffix: "mm" },
  { key: "axilar_media", label: "Ax. Média", suffix: "mm" },
  { key: "triceps", label: "Tríceps", suffix: "mm" },
  { key: "subescapular", label: "Subesc.", suffix: "mm" },
  { key: "abdominal", label: "Abdominal", suffix: "mm" },
  { key: "suprailiaca", label: "Suprailíaca", suffix: "mm" },
  { key: "coxa", label: "Coxa", suffix: "mm" },
];

export const AthleteEvaluationsViewer = ({ open, onOpenChange, alunoId }: Props) => {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && alunoId) {
      loadEvaluations();
    }
  }, [open, alunoId]);

  const loadEvaluations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("avaliacoes_fisicas")
        .select("*")
        .eq("aluno_id", alunoId)
        .order("data", { ascending: false });

      if (error) throw error;
      setEvaluations(data || []);
    } catch (err) {
      console.error("Erro ao carregar avaliações:", err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (ev: any) => {
    setEditingId(ev.id);
    const f: Record<string, any> = {};
    NUM_FIELDS.forEach(({ key }) => { f[key] = ev[key] ?? ""; });
    setEditForm(f);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      NUM_FIELDS.forEach(({ key }) => {
        const v = editForm[key];
        if (v === "" || v == null) {
          payload[key] = null;
        } else if (key === "altura_cm") {
          // Aceita "1,78", "1.78m" ou "178" — converte sempre para cm
          payload[key] = parseAlturaCm(v);
        } else {
          payload[key] = Number(String(v).replace(",", "."));
        }
      });
      const { error } = await supabase
        .from("avaliacoes_fisicas")
        .update(payload as any)
        .eq("id", id);
      if (error) throw error;
      toast.success("Avaliação atualizada!");
      setEditingId(null);
      await loadEvaluations();
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  const getMetodoLabel = (metodo: string) => {
    switch (metodo) {
      case "7_dobras_completo": return "7 Dobras (Jackson & Pollock)";
      case "jackson_pollock_7": return "Jackson & Pollock 7";
      case "marinha_americana": return "Marinha Americana";
      default: return metodo;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-card border-border shadow-2xl p-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Ruler className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Histórico de Evolução</span>
          </div>
          <DialogTitle className="font-display text-2xl uppercase tracking-tight">
            Minhas Avaliações
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 pb-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Carregando histórico...</p>
            </div>
          ) : evaluations.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-secondary/10">
              <Info className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-20" />
              <p className="text-sm text-muted-foreground">Você ainda não possui avaliações registradas.</p>
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              {evaluations.map((ev, idx) => {
                const isEditing = editingId === ev.id;
                return (
                <div key={ev.id} className="relative group">
                  {idx < evaluations.length - 1 && (
                    <div className="absolute left-6 top-10 bottom-[-20px] w-px bg-border group-last:hidden" />
                  )}
                  
                  <div className="bg-secondary/20 border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-tight">{formatDate(ev.data)}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{getMetodoLabel(ev.metodo)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
                          <TrendingUp className="h-3 w-3 mr-1" /> {ev.bf_pct_calculado}% BF
                        </Badge>
                        {!isEditing ? (
                          <Button size="sm" variant="ghost" onClick={() => startEdit(ev)} className="h-7 w-7 p-0">
                            <Pencil className="h-3 w-3" />
                          </Button>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving} className="h-7 w-7 p-0">
                              <X className="h-3 w-3" />
                            </Button>
                            <Button size="sm" onClick={() => saveEdit(ev.id)} disabled={saving} className="h-7 px-2 gap-1">
                              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                              <span className="text-[10px]">Salvar</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {NUM_FIELDS.map(({ key, label, suffix }) => (
                          <div key={key} className="space-y-1">
                            <Label className="text-[9px] uppercase tracking-widest text-muted-foreground">{label} ({suffix})</Label>
                            <Input
                              type={key === "altura_cm" ? "text" : "number"}
                              inputMode="decimal"
                              step="0.1"
                              placeholder={key === "altura_cm" ? "1,78 ou 178" : undefined}
                              value={editForm[key] ?? ""}
                              onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                              className="h-8 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-background/40 rounded-xl p-3 border border-border/50">
                            <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Peso</p>
                            <p className="font-display text-lg leading-none">{ev.peso_kg} <span className="text-[10px] font-sans">kg</span></p>
                          </div>
                          <div className="bg-background/40 rounded-xl p-3 border border-border/50">
                            <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">M. Magra</p>
                            <p className="font-display text-lg leading-none text-emerald-500">{ev.massa_magra_kg || "---"} <span className="text-[10px] font-sans">kg</span></p>
                          </div>
                          <div className="bg-background/40 rounded-xl p-3 border border-border/50">
                            <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">M. Gorda</p>
                            <p className="font-display text-lg leading-none text-red-500">{ev.massa_gorda_kg || "---"} <span className="text-[10px] font-sans">kg</span></p>
                          </div>
                        </div>

                        {(ev.pescoco_cm || ev.cintura_cm || ev.quadril_cm) && (
                          <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-3 gap-2">
                            {ev.pescoco_cm && (
                              <div className="flex flex-col">
                                <span className="text-[9px] text-muted-foreground uppercase">Pescoço</span>
                                <span className="text-xs font-semibold">{ev.pescoco_cm}cm</span>
                              </div>
                            )}
                            {ev.cintura_cm && (
                              <div className="flex flex-col">
                                <span className="text-[9px] text-muted-foreground uppercase">Cintura</span>
                                <span className="text-xs font-semibold">{ev.cintura_cm}cm</span>
                              </div>
                            )}
                            {ev.quadril_cm && (
                              <div className="flex flex-col">
                                <span className="text-[9px] text-muted-foreground uppercase">Quadril</span>
                                <span className="text-xs font-semibold">{ev.quadril_cm}cm</span>
                              </div>
                            )}
                          </div>
                        )}

                        {(ev.peitoral || ev.axilar_media || ev.triceps || ev.subescapular || ev.abdominal || ev.suprailiaca || ev.coxa) && (
                          <div className="mt-4 pt-4 border-t border-border/50">
                            <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-2">7 Dobras (mm)</p>
                            <div className="grid grid-cols-4 gap-2">
                              {[
                                ["Peitoral", ev.peitoral],
                                ["Ax. Média", ev.axilar_media],
                                ["Tríceps", ev.triceps],
                                ["Subesc.", ev.subescapular],
                                ["Abdominal", ev.abdominal],
                                ["Suprailíaca", ev.suprailiaca],
                                ["Coxa", ev.coxa],
                              ].filter(([, v]) => v != null && v !== "").map(([label, v]) => (
                                <div key={label as string} className="bg-background/40 rounded-lg p-2 border border-border/50">
                                  <span className="block text-[9px] text-muted-foreground uppercase">{label}</span>
                                  <span className="text-xs font-semibold">{v}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );})}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
