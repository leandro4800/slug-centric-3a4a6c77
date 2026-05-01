import { useEffect, useMemo, useState } from "react";
import { Utensils, Sparkles, Loader2, RefreshCcw, AlertCircle, Activity, Play, Clock, X } from "lucide-react";
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
import imgBreakfast from "@/assets/meal-breakfast.jpg";
import imgLunch from "@/assets/meal-lunch.jpg";
import imgSnack from "@/assets/meal-snack.jpg";
import imgDinner from "@/assets/meal-dinner.jpg";
import imgPre from "@/assets/meal-pre.jpg";
import imgPost from "@/assets/meal-post.jpg";
import imgSupper from "@/assets/meal-supper.jpg";
import imgMacroProtein from "@/assets/macro-protein.jpg";
import imgMacroCarbs from "@/assets/macro-carbs.jpg";
import imgMacroFats from "@/assets/macro-fats.jpg";
import imgMacroHero from "@/assets/macro-hero.jpg";

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

// Cores fixas dos macros (estilo Netflix/semáforo)
const COLOR_PROT = "142 71% 45%";   // verde
const COLOR_CARB = "45 100% 51%";   // amarelo
const COLOR_FAT  = "0 84% 55%";     // vermelho

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

// Imagem cinematográfica por refeição (assets locais)
const imgFor = (nome: string) => {
  const n = (nome || "").toLowerCase();
  if (n.includes("pós") || n.includes("pos-treino") || n.includes("pos treino")) return imgPost;
  if (n.includes("pré") || n.includes("pre-treino") || n.includes("pre treino")) return imgPre;
  if (n.includes("ceia") || n.includes("noite")) return imgSupper;
  if (n.includes("jantar")) return imgDinner;
  if (n.includes("almoço") || n.includes("almoco")) return imgLunch;
  if (n.includes("café") || n.includes("cafe") || n.includes("manhã") || n.includes("manha")) return imgBreakfast;
  if (n.includes("lanche")) return imgSnack;
  return imgBreakfast;
};

const Dieta = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dieta, setDieta] = useState<Dieta | null>(null);
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedRef, setSelectedRef] = useState<Refeicao | null>(null);
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
    { name: "Proteína", value: totalDia.p * 4, color: `hsl(${COLOR_PROT})` },
    { name: "Carbo",    value: totalDia.c * 4, color: `hsl(${COLOR_CARB})` },
    { name: "Gordura",  value: totalDia.g * 9, color: `hsl(${COLOR_FAT})` },
  ];

  const badge = dieta?.macros_alvo?.badge;
  const selectedMacros = useMemo(() => selectedRef ? calcMacros(selectedRef.itens) : null, [selectedRef]);

  return (
    <>
      <PageHeader icon={Utensils} title="MINHA DIETA" subtitle={dieta?.objetivo || undefined} />
      <div className="px-5 pb-10">
        {/* Hero / CTA */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 via-background to-background p-5 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-primary mb-1">
                <Sparkles className="h-3.5 w-3.5" /> DR. IA NUTRI
              </div>
              <h2 className="font-display text-xl leading-tight">Plano alimentar personalizado</h2>
              <p className="text-xs text-muted-foreground mt-1">Baseado nos seus exames clínicos e objetivo</p>
              {badge && (
                <Badge variant="outline" className="mt-3 border-primary/50 text-primary bg-primary/10">
                  <Activity className="h-3 w-3 mr-1" /> Ajustada para {badge}
                </Badge>
              )}
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90">
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
                  <Button onClick={gerar} disabled={generating} className="w-full bg-primary text-primary-foreground">
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
            {/* Resumo + Pizza + cards laterais — estilo Netflix cinematográfico */}
            <div className="grid grid-cols-5 gap-3 mb-5">
              {/* Painel pizza com hero image de fundo */}
              <div className="col-span-2 relative rounded-2xl overflow-hidden border border-border group">
                <img
                  src={imgMacroHero}
                  alt="Plano alimentar"
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 group-hover:scale-105 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/30" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,hsl(var(--background))_75%)]" />
                <div className="relative p-3">
                  <div className="aspect-square">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" innerRadius="55%" outerRadius="90%" paddingAngle={2} stroke="none">
                          {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-center font-display text-2xl leading-none mt-1 drop-shadow-[0_0_12px_hsl(var(--primary)/0.6)]">{totalDia.kcal}</p>
                  <p className="text-center text-[10px] text-muted-foreground tracking-widest uppercase">kcal · meta {dieta.kcal_alvo}</p>
                </div>
              </div>

              {/* Cards macros estilo Netflix com imagens cinematográficas */}
              <div className="col-span-3 grid grid-cols-1 gap-2">
                {[
                  { l: "PROTEÍNA", v: totalDia.p, alvo: dieta.macros_alvo?.proteina_g, hsl: COLOR_PROT, img: imgMacroProtein },
                  { l: "CARBO",    v: totalDia.c, alvo: dieta.macros_alvo?.carboidrato_g, hsl: COLOR_CARB, img: imgMacroCarbs },
                  { l: "GORDURA",  v: totalDia.g, alvo: dieta.macros_alvo?.lipideos_g, hsl: COLOR_FAT, img: imgMacroFats },
                ].map(m => {
                  const pct = m.alvo ? Math.min(100, Math.round((m.v / m.alvo) * 100)) : 0;
                  return (
                    <div
                      key={m.l}
                      className="relative rounded-xl overflow-hidden border group cursor-pointer transition-all hover:scale-[1.015]"
                      style={{ borderColor: `hsl(${m.hsl} / 0.5)`, boxShadow: `0 0 20px hsl(${m.hsl} / 0.08)` }}
                    >
                      {/* Imagem de fundo */}
                      <img
                        src={m.img}
                        alt={m.l}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-110 transition-all duration-700"
                      />
                      {/* Gradiente lateral cor do macro -> transparente */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(90deg, hsl(${m.hsl} / 0.85) 0%, hsl(${m.hsl} / 0.35) 35%, hsl(0 0% 0% / 0.2) 60%, hsl(0 0% 0% / 0.7) 100%)`,
                        }}
                      />
                      {/* Vinheta inferior */}
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />

                      <div className="relative px-4 py-3 flex items-center justify-between min-h-[72px]">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold tracking-[0.2em] text-white drop-shadow-md">{m.l}</span>
                          <span className="text-[10px] text-white/70 uppercase tracking-wider">{pct}% da meta</span>
                        </div>
                        <div className="flex items-baseline gap-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                          <span className="font-display text-2xl text-white">{m.v}</span>
                          <span className="text-xs text-white/80">/ {m.alvo || "-"}g</span>
                        </div>
                      </div>

                      {/* Barra de progresso na borda inferior */}
                      <div className="relative h-[3px] bg-black/40">
                        <div
                          className="h-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: `hsl(${m.hsl})`, boxShadow: `0 0 10px hsl(${m.hsl})` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {dieta.observacoes_clinicas && (
              <div className="bg-primary/10 border border-primary/30 rounded-xl px-3 py-2 text-xs text-primary flex gap-2 mb-5">
                <TenantSymbol size={14} /> {dieta.observacoes_clinicas}
              </div>
            )}

            <h2 className="font-display text-base flex items-center gap-2 mb-3">
              <span className="text-primary">▶</span> REFEIÇÕES DIÁRIAS
            </h2>

            {/* Cards de refeição estilo Netflix */}
            <div className="space-y-3">
              {dieta.refeicoes.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRef(r)}
                  className="group relative w-full h-32 rounded-xl overflow-hidden bg-black ring-1 ring-white/5 hover:ring-primary/60 transition-all text-left"
                >
                  <img
                    src={imgFor(r.nome)}
                    alt={r.nome}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                  {/* Escurecimento global + gradiente suave da esquerda para legibilidade do texto */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/40 to-black/10" />
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute inset-0 p-4 flex flex-col justify-between">
                    {/* Topo: badge com ícone amarelo de talheres */}
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-black/60 backdrop-blur flex items-center justify-center ring-1 ring-white/10">
                        <Utensils className="h-3 w-3" style={{ color: `hsl(${COLOR_CARB})` }} />
                      </div>
                      <span className="text-xs font-bold text-white tracking-wide">{r.horario || "—"}</span>
                    </div>
                    {/* Base: título em itálico */}
                    <h3 className="font-display italic text-2xl tracking-wide text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                      {r.nome.toUpperCase()}
                    </h3>
                  </div>
                  {/* Play cinza no canto inferior direito */}
                  <div className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/20 flex items-center justify-center group-hover:bg-primary group-hover:ring-primary transition-colors">
                    <Play className="h-4 w-4 text-white fill-white ml-0.5" />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal de detalhes da refeição */}
      <Dialog open={!!selectedRef} onOpenChange={(o) => !o && setSelectedRef(null)}>
        <DialogContent
          overlayClassName="bg-background/90 backdrop-blur-sm"
          className="max-w-lg p-0 overflow-hidden gap-0 bg-card border-border shadow-2xl"
        >
          {selectedRef && (
            <>
              <div className="relative h-48 -mt-px">
                <img
                  src={imgFor(selectedRef.nome)}
                  alt={selectedRef.nome}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                <button
                  onClick={() => setSelectedRef(null)}
                  className="absolute top-3 right-3 h-8 w-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute bottom-3 left-4 right-4">
                  <Badge className="bg-primary text-primary-foreground border-0 text-[10px] mb-2 gap-1">
                    <Clock className="h-3 w-3" /> {selectedRef.horario || "—"}
                  </Badge>
                  <h2 className="font-display italic text-2xl tracking-wide drop-shadow-lg">
                    {selectedRef.nome.toUpperCase()}
                  </h2>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {selectedMacros && (
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-background/60 border border-border rounded-lg p-2 text-center">
                      <div className="text-[9px] text-muted-foreground font-bold tracking-wider">KCAL</div>
                      <div className="font-display text-xl">{selectedMacros.kcal}</div>
                    </div>
                    {[
                      { l: "PROT", v: selectedMacros.p, hsl: COLOR_PROT },
                      { l: "CARB", v: selectedMacros.c, hsl: COLOR_CARB },
                      { l: "GORD", v: selectedMacros.g, hsl: COLOR_FAT },
                    ].map(m => (
                      <div
                        key={m.l}
                        className="bg-background/60 border rounded-lg p-2 text-center"
                        style={{ borderColor: `hsl(${m.hsl} / 0.4)` }}
                      >
                        <div className="text-[9px] font-bold tracking-wider" style={{ color: `hsl(${m.hsl})` }}>{m.l}</div>
                        <div className="font-display text-xl" style={{ color: `hsl(${m.hsl})` }}>{m.v}<span className="text-[10px] text-muted-foreground">g</span></div>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <h3 className="text-[11px] font-bold tracking-wider text-muted-foreground mb-2">ALIMENTOS</h3>
                  <div className="divide-y divide-border/50 border border-border rounded-lg overflow-hidden">
                    {selectedRef.itens.map(it => (
                      <div key={it.id} className="px-3 py-2.5 flex items-center justify-between gap-3 bg-background/40">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{it.alimento?.nome || "—"}</p>
                          <p className="text-[11px] text-muted-foreground">{it.quantidade_g}g {it.substituicoes ? `· ${it.substituicoes}` : ""}</p>
                        </div>
                        {it.substituicoes && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[10px] h-7 px-2 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => toast.info(it.substituicoes!, { duration: 6000 })}
                          >
                            <RefreshCcw className="h-3 w-3 mr-1" /> Substituir
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Dieta;
