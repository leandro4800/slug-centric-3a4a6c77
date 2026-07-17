import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/aluno/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Utensils, Loader2, Droplet, TrendingDown, Flame } from "lucide-react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { DietScienceFooter } from "@/components/HealthScienceFootnotes";

type Fase = { id: string; fase: "off_season" | "pre_camp" | "weight_cut"; data_inicio: string; data_fim: string; kcal_meta: number | null; proteina_g: number | null; carboidrato_g: number | null; lipideos_g: number | null; peso_meta_kg: number | null; observacoes: string | null; camp_id: string | null };
type Peso = { data: string; peso: number };
type Camp = { id: string; nome: string; data_luta: string; peso_meta: number | null };

const FASE_LABEL: Record<Fase["fase"], { title: string; sub: string; color: string; icon: any }> = {
  off_season: { title: "Off-Season", sub: "Manutenção e ganho de força", color: "from-emerald-900/60 to-black", icon: Flame },
  pre_camp: { title: "Pré-Camp", sub: "Ajuste calórico e volume", color: "from-amber-900/60 to-black", icon: Utensils },
  weight_cut: { title: "Corte de Peso", sub: "Precisão total — cada grama conta", color: "from-red-900/70 to-black", icon: TrendingDown },
};

const FightNutritionView = () => {
  const { user } = useAuth();
  const [fases, setFases] = useState<Fase[]>([]);
  const [pesos, setPesos] = useState<Peso[]>([]);
  const [camp, setCamp] = useState<Camp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [f, p, c] = await Promise.all([
        supabase.from("fight_nutrition_fases").select("*").eq("aluno_id", user.id).order("data_inicio"),
        supabase.from("peso_diario").select("data,peso").eq("aluno_id", user.id).order("data", { ascending: true }).limit(60),
        supabase.from("camps_luta").select("id,nome,data_luta,peso_meta").eq("aluno_id", user.id).order("data_luta", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setFases((f.data as Fase[]) ?? []);
      setPesos((p.data as Peso[]) ?? []);
      setCamp((c.data as Camp) ?? null);
      setLoading(false);
    })();
  }, [user?.id]);

  const hoje = new Date();
  const faseAtual = useMemo(
    () => fases.find((f) => new Date(f.data_inicio) <= hoje && new Date(f.data_fim) >= hoje) ?? fases[fases.length - 1],
    [fases]
  );

  const chartData = useMemo(() => pesos.map((p) => ({ data: format(parseISO(p.data), "dd/MM"), peso: p.peso })), [pesos]);
  const pesoMeta = camp?.peso_meta ?? faseAtual?.peso_meta_kg ?? null;

  if (loading) return <div className="flex justify-center pt-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (fases.length === 0) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <PageHeader icon={Utensils} title="Nutrição de Combate" subtitle="Fases da preparação" />
        <Card className="p-8 text-center">
          <Utensils className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Sua nutrição de combate será estruturada pelo seu técnico assim que o camp for definido.</p>
        </Card>
        <DietScienceFooter />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <PageHeader icon={Utensils} title="Nutrição de Combate" subtitle="Fases da preparação" />

      {faseAtual && (() => {
        const cfg = FASE_LABEL[faseAtual.fase];
        const Icon = cfg.icon;
        const diasRestantes = differenceInCalendarDays(parseISO(faseAtual.data_fim), hoje);
        return (
          <div className={`relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br ${cfg.color} p-6`}>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(0_84%_50%/0.2),transparent_60%)]" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">Fase atual</p>
                  <h2 className="font-display text-3xl uppercase italic tracking-tight mt-1">{cfg.title}</h2>
                  <p className="text-xs text-muted-foreground mt-1">{cfg.sub}</p>
                </div>
                <Icon className="h-6 w-6 text-primary/80" />
              </div>
              <div className="grid grid-cols-4 gap-2 mt-4">
                <div className="rounded-xl bg-black/50 p-2.5 text-center border border-white/5">
                  <p className="font-display text-2xl tabular-nums">{faseAtual.kcal_meta ?? "—"}</p>
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">kcal</p>
                </div>
                <div className="rounded-xl bg-black/50 p-2.5 text-center border border-white/5">
                  <p className="font-display text-2xl tabular-nums text-emerald-400">{faseAtual.proteina_g ?? "—"}</p>
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">prot g</p>
                </div>
                <div className="rounded-xl bg-black/50 p-2.5 text-center border border-white/5">
                  <p className="font-display text-2xl tabular-nums text-amber-400">{faseAtual.carboidrato_g ?? "—"}</p>
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">carb g</p>
                </div>
                <div className="rounded-xl bg-black/50 p-2.5 text-center border border-white/5">
                  <p className="font-display text-2xl tabular-nums text-red-400">{faseAtual.lipideos_g ?? "—"}</p>
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">gord g</p>
                </div>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-3">
                {format(parseISO(faseAtual.data_inicio), "dd/MM", { locale: ptBR })} → {format(parseISO(faseAtual.data_fim), "dd/MM", { locale: ptBR })}
                {diasRestantes >= 0 && ` · ${diasRestantes} dias restantes`}
              </p>
              {faseAtual.observacoes && <p className="text-xs text-muted-foreground mt-3 border-l-2 border-primary/50 pl-3">{faseAtual.observacoes}</p>}
            </div>
          </div>
        );
      })()}

      {chartData.length > 1 && (
        <Card className="p-4 bg-card/60 backdrop-blur border-white/5">
          <h3 className="font-bold uppercase tracking-widest text-xs mb-3 flex items-center gap-2"><TrendingDown className="h-4 w-4 text-primary" />Projeção de peso</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="data" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} domain={["dataMin - 1", "dataMax + 1"]} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                {pesoMeta && <ReferenceLine y={pesoMeta} stroke="hsl(var(--primary))" strokeDasharray="4 4" label={{ value: `meta ${pesoMeta}kg`, fill: "hsl(var(--primary))", fontSize: 10, position: "insideTopRight" }} />}
                <Line type="monotone" dataKey="peso" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card className="p-4 bg-card/60 backdrop-blur border-white/5">
        <h3 className="font-bold uppercase tracking-widest text-xs mb-3">Linha do tempo</h3>
        <div className="space-y-2">
          {fases.map((f) => {
            const cfg = FASE_LABEL[f.fase];
            const isNow = faseAtual?.id === f.id;
            return (
              <div key={f.id} className={`p-3 rounded-xl border ${isNow ? "border-primary/60 bg-primary/5" : "border-white/5 bg-black/20"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold uppercase tracking-wider text-sm">{cfg.title}</p>
                      {isNow && <Badge className="bg-primary text-primary-foreground text-[9px] uppercase">Agora</Badge>}
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                      {format(parseISO(f.data_inicio), "dd MMM", { locale: ptBR })} → {format(parseISO(f.data_fim), "dd MMM", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg tabular-nums">{f.kcal_meta ?? "—"}<span className="text-[10px] text-muted-foreground ml-1">kcal</span></p>
                    {f.peso_meta_kg && <p className="text-[10px] text-muted-foreground">meta {f.peso_meta_kg}kg</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-4 bg-card/60 backdrop-blur border-white/5">
        <div className="flex items-center gap-3">
          <Droplet className="h-5 w-5 text-blue-400" />
          <div>
            <p className="text-sm font-bold uppercase tracking-wider">Hidratação</p>
            <p className="text-xs text-muted-foreground">Mantenha 35ml por kg de peso corporal durante todo o camp. No corte, siga o protocolo do técnico.</p>
          </div>
        </div>
      </Card>

      <DietScienceFooter />
    </div>
  );
};

export default FightNutritionView;
