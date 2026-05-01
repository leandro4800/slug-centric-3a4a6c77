import { useEffect, useState } from "react";
import { Utensils, Sparkles, Loader2, RefreshCcw, AlertCircle, Activity } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { PageHeader } from "@/components/aluno/PageHeader";
import { TenantSymbol } from "@/components/TenantSymbol";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type Alimento = { id: string; nome: string; energia_kcal: number; proteina_g: number; carboidrato_g: number; lipideos_g: number };
type Item = { id: string; quantidade_g: number; substituicoes: string | null; alimento: Alimento | null };
type Refeicao = { id: string; nome: string; horario: string | null; ordem: number | null; itens: Item[] };
type Dieta = {
  id: string;
  objetivo: string | null;
  kcal_alvo: number | null;
  tmb_estimada: number | null;
  macros_alvo: any;
  observacoes_clinicas: string | null;
  refeicoes: Refeicao[];
};

const calcMacros = (itens: Item[]) => {
  let kcal = 0, p = 0, c = 0, g = 0;
  itens.forEach(i => {
    if (!i.alimento) return;
    const f = (Number(i.quantidade_g) || 0) / 100;
    kcal += (Number(i.alimento.energia_kcal) || 0) * f;
    p += (Number(i.alimento.proteina_g) || 0) * f;
    c += (Number(i.alimento.carboidrato_g) || 0) * f;
    g += (Number(i.alimento.lipideos_g) || 0) * f;
  });
  return { kcal: Math.round(kcal), p: Math.round(p), c: Math.round(c), g: Math.round(g) };
};

const Dieta = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dieta, setDieta] = useState<Dieta | null>(null);
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ objetivo: "hipertrofia", peso_kg: 75, altura_cm: 175, idade: 28, sexo: "M", nivel_atividade: 1.55 });

  const carregar = async () => {
    if (!user) return;
    setLoading(true);
    const { data: dietas } = await supabase
      .from("dietas")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);
    const d = dietas?.[0];
    if (!d) { setDieta(null); setLoading(false); return; }

    const { data: refs } = await supabase
      .from("refeicoes")
      .select("*")
      .eq("dieta_id", d.id)
      .order("ordem", { ascending: true });

    const refIds = (refs || []).map(r => r.id);
    const { data: itens } = refIds.length
      ? await supabase
          .from("itens_refeicao")
          .select("id, quantidade_g, substituicoes, refeicao_id, alimento:alimentos_taco(id, nome, energia_kcal, proteina_g, carboidrato_g, lipideos_g)")
          .in("refeicao_id", refIds)
      : { data: [] as any[] };

    const refeicoes: Refeicao[] = (refs || []).map(r => ({
      id: r.id,
      nome: r.nome,
      horario: r.horario,
      ordem: r.ordem,
      itens: (itens || []).filter((i: any) => i.refeicao_id === r.id).map((i: any) => ({
        id: i.id,
        quantidade_g: Number(i.quantidade_g),
        substituicoes: i.substituicoes,
        alimento: i.alimento,
      })),
    }));

    setDieta({ ...d, refeicoes } as Dieta);
    setLoading(false);
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [user]);

  const gerar = async () => {
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke("gerar-dieta", { body: form });
      if (error) throw error;
      toast.success("Dieta gerada pelo Dr. IA!");
      setOpen(false);
      await carregar();
    } catch (e: any) {
      toast.error(e.message || "Falha ao gerar dieta");
    } finally {
      setGenerating(false);
    }
  };

  const totalDia = dieta ? dieta.refeicoes.reduce((acc, r) => {
    const m = calcMacros(r.itens);
    return { kcal: acc.kcal + m.kcal, p: acc.p + m.p, c: acc.c + m.c, g: acc.g + m.g };
  }, { kcal: 0, p: 0, c: 0, g: 0 }) : { kcal: 0, p: 0, c: 0, g: 0 };

  const pieData = [
    { name: "Proteína", value: totalDia.p * 4, color: "hsl(142 70% 55%)" },
    { name: "Carbo", value: totalDia.c * 4, color: "hsl(var(--accent))" },
    { name: "Gordura", value: totalDia.g * 9, color: "hsl(0 80% 60%)" },
  ];

  const badge = dieta?.macros_alvo?.badge;

  return (
    <>
      <PageHeader icon={Utensils} title="MINHA DIETA" subtitle={dieta?.objetivo || undefined} />
      <div className="px-5 pb-10">
        {/* Hero / CTA */}
        <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/20 via-background to-background p-5 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-accent mb-1">
                <Sparkles className="h-3.5 w-3.5" /> DR. IA NUTRI
              </div>
              <h2 className="font-display text-xl leading-tight">Plano alimentar personalizado</h2>
              <p className="text-xs text-muted-foreground mt-1">Baseado nos seus exames clínicos e objetivo</p>
              {badge && (
                <Badge variant="outline" className="mt-3 border-accent/50 text-accent bg-accent/10">
                  <Activity className="h-3 w-3 mr-1" /> Ajustada para {badge}
                </Badge>
              )}
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/90">
                  {dieta ? <><RefreshCcw className="h-3.5 w-3.5 mr-1" />Refazer</> : <><Sparkles className="h-3.5 w-3.5 mr-1" />Gerar</>}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle className="font-display">Gerar plano com Dr. IA</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Peso (kg)</Label><Input type="number" value={form.peso_kg} onChange={e => setForm({ ...form, peso_kg: Number(e.target.value) })} /></div>
                    <div><Label className="text-xs">Altura (cm)</Label><Input type="number" value={form.altura_cm} onChange={e => setForm({ ...form, altura_cm: Number(e.target.value) })} /></div>
                    <div><Label className="text-xs">Idade</Label><Input type="number" value={form.idade} onChange={e => setForm({ ...form, idade: Number(e.target.value) })} /></div>
                    <div>
                      <Label className="text-xs">Sexo</Label>
                      <Select value={form.sexo} onValueChange={v => setForm({ ...form, sexo: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="M">Masculino</SelectItem><SelectItem value="F">Feminino</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Objetivo</Label>
                    <Select value={form.objetivo} onValueChange={v => setForm({ ...form, objetivo: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hipertrofia">Hipertrofia (superávit)</SelectItem>
                        <SelectItem value="cutting">Cutting (déficit)</SelectItem>
                        <SelectItem value="manutencao">Manutenção</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Nível de atividade</Label>
                    <Select value={String(form.nivel_atividade)} onValueChange={v => setForm({ ...form, nivel_atividade: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1.2">Sedentário</SelectItem>
                        <SelectItem value="1.375">Leve</SelectItem>
                        <SelectItem value="1.55">Moderado</SelectItem>
                        <SelectItem value="1.725">Intenso</SelectItem>
                        <SelectItem value="1.9">Atleta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={gerar} disabled={generating} className="w-full bg-accent text-accent-foreground">
                    {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Gerando...</> : <><Sparkles className="h-4 w-4 mr-2" />Gerar Dieta</>}
                  </Button>
                  <p className="text-[10px] text-muted-foreground flex gap-1"><AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />Sugestão educacional. Consulte seu nutricionista.</p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Carregando...</div>
        ) : !dieta ? (
          <div className="text-center py-12 border border-dashed border-border rounded-2xl">
            <Utensils className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Você ainda não tem uma dieta. Gere agora com o Dr. IA.</p>
          </div>
        ) : (
          <>
            {/* Resumo + Pizza */}
            <div className="grid grid-cols-5 gap-3 mb-5">
              <div className="col-span-2 bg-card/40 border border-border rounded-2xl p-3">
                <div className="aspect-square">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" innerRadius="55%" outerRadius="90%" paddingAngle={2}>
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-center font-display text-lg leading-none mt-1">{totalDia.kcal}</p>
                <p className="text-center text-[10px] text-muted-foreground">kcal / meta {dieta.kcal_alvo}</p>
              </div>
              <div className="col-span-3 grid grid-cols-1 gap-2">
                {[
                  { l: "PROTEÍNA", v: totalDia.p, alvo: dieta.macros_alvo?.proteina_g, c: "text-[hsl(142_70%_55%)]", b: "border-[hsl(142_70%_55%)]/40" },
                  { l: "CARBO", v: totalDia.c, alvo: dieta.macros_alvo?.carboidrato_g, c: "text-accent", b: "border-accent/40" },
                  { l: "GORDURA", v: totalDia.g, alvo: dieta.macros_alvo?.lipideos_g, c: "text-[hsl(0_80%_60%)]", b: "border-[hsl(0_80%_60%)]/40" },
                ].map(m => (
                  <div key={m.l} className={`bg-card/40 border ${m.b} rounded-xl px-3 py-2 flex items-center justify-between`}>
                    <span className={`text-[10px] font-bold ${m.c}`}>{m.l}</span>
                    <span className={`font-display text-lg ${m.c}`}>{m.v}<span className="text-xs text-muted-foreground">/{m.alvo || "-"}g</span></span>
                  </div>
                ))}
              </div>
            </div>

            {dieta.observacoes_clinicas && (
              <div className="bg-accent/10 border border-accent/30 rounded-xl px-3 py-2 text-xs text-accent flex gap-2 mb-5">
                <TenantSymbol size={14} /> {dieta.observacoes_clinicas}
              </div>
            )}

            <h2 className="font-display text-base flex items-center gap-2 mb-3">
              <span className="text-accent">▶</span> REFEIÇÕES DO DIA
            </h2>
            <div className="space-y-3">
              {dieta.refeicoes.map(r => {
                const m = calcMacros(r.itens);
                return (
                  <div key={r.id} className="bg-card/40 border border-border rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-accent/10 to-transparent">
                      <div>
                        <div className="text-[11px] text-accent font-semibold">{r.horario || ""}</div>
                        <div className="font-display italic text-lg tracking-wide">{r.nome.toUpperCase()}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-xl">{m.kcal}<span className="text-xs text-muted-foreground"> kcal</span></div>
                        <div className="text-[10px] text-muted-foreground">P {m.p}g · C {m.c}g · G {m.g}g</div>
                      </div>
                    </div>
                    <div className="divide-y divide-border/50">
                      {r.itens.map(it => (
                        <div key={it.id} className="px-4 py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{it.alimento?.nome || "—"}</p>
                            <p className="text-[11px] text-muted-foreground">{it.quantidade_g}g {it.substituicoes ? `· ${it.substituicoes}` : ""}</p>
                          </div>
                          {it.substituicoes && (
                            <Button size="sm" variant="ghost" className="text-[10px] h-7 px-2 text-accent" onClick={() => toast.info(it.substituicoes!, { duration: 6000 })}>
                              <RefreshCcw className="h-3 w-3 mr-1" /> Substituir
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Dieta;
