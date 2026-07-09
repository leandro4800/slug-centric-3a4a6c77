import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/aluno/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Swords, CalendarClock, Scale, Loader2, Flame, Zap } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type Camp = { id: string; tenant_id: string; nome: string; data_inicio: string; data_luta: string; peso_meta: number | null; modalidade: string | null };
type Sessao = { id: string; data: string; tipo: string | null; descricao: string | null; duracao_min: number | null; intensidade: string | null; rpe: number | null };
type Peso = { id: string; data: string; peso: number };

const rpeColor = (rpe: number | null) => {
  if (!rpe) return "bg-muted text-muted-foreground";
  if (rpe >= 9) return "bg-red-600/90 text-white shadow-[0_0_20px_hsl(0_84%_50%/0.5)]";
  if (rpe >= 7) return "bg-orange-500/90 text-white";
  if (rpe >= 5) return "bg-amber-500/80 text-black";
  return "bg-emerald-500/70 text-black";
};

const tipoIcon: Record<string, string> = {
  sparring: "🥊", tecnica: "🎯", fisico: "💪", cardio: "🏃", mobilidade: "🧘", estrategia: "🧠",
};

const FightCampView = () => {
  const { user } = useAuth();
  const [camps, setCamps] = useState<Camp[]>([]);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [pesos, setPesos] = useState<Peso[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoPeso, setNovoPeso] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [c, s, p] = await Promise.all([
      supabase.from("camps_luta").select("*").eq("aluno_id", user.id).order("data_luta", { ascending: false }),
      supabase.from("sessoes_luta").select("*").eq("aluno_id", user.id).order("data", { ascending: true }).limit(30),
      supabase.from("peso_diario").select("*").eq("aluno_id", user.id).order("data", { ascending: false }).limit(30),
    ]);
    setCamps((c.data as Camp[]) ?? []);
    setSessoes((s.data as Sessao[]) ?? []);
    setPesos((p.data as Peso[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user?.id]);

  const campAtivo = useMemo(() => camps.find((c) => new Date(c.data_luta) >= new Date()) ?? camps[0], [camps]);
  const dias = campAtivo ? differenceInCalendarDays(parseISO(campAtivo.data_luta), new Date()) : null;
  const pesoAtual = pesos[0]?.peso;
  const diffMeta = pesoAtual && campAtivo?.peso_meta ? (pesoAtual - campAtivo.peso_meta) : null;
  const proximas = sessoes.filter((s) => new Date(s.data) >= new Date(new Date().toDateString())).slice(0, 8);

  const registrarPeso = async () => {
    if (!user || !campAtivo) return;
    const v = Number(novoPeso);
    if (!v || v <= 0) { toast.error("Peso inválido"); return; }
    setSaving(true);
    const hoje = format(new Date(), "yyyy-MM-dd");
    const { error } = await supabase.from("peso_diario").upsert({
      aluno_id: user.id, tenant_id: campAtivo.tenant_id, data: hoje, peso: v,
    }, { onConflict: "aluno_id,data" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Peso registrado");
    setNovoPeso("");
    load();
  };

  if (loading) return <div className="flex justify-center pt-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <PageHeader icon={Swords} title="Camp de Luta" subtitle="Sua preparação, dia a dia" />

      {campAtivo ? (
        <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-black via-red-950/40 to-black p-6 shadow-[0_0_40px_hsl(0_84%_40%/0.35)]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(0_84%_50%/0.25),transparent_70%)]" />
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold flex items-center gap-1"><Flame className="h-3 w-3" /> Camp ativo</p>
                <h2 className="font-display text-3xl uppercase italic tracking-tight leading-tight mt-1">{campAtivo.nome}</h2>
                {campAtivo.modalidade && <Badge variant="outline" className="mt-1 border-primary/50 text-primary uppercase text-[10px]">{campAtivo.modalidade}</Badge>}
              </div>
              <CalendarClock className="h-6 w-6 text-primary/80" />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-black/40 backdrop-blur p-3 border border-white/5">
                <p className="font-display text-4xl text-white tabular-nums">{dias !== null && dias >= 0 ? dias : "—"}</p>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1">dias p/ luta</p>
              </div>
              <div className="rounded-xl bg-black/40 backdrop-blur p-3 border border-white/5">
                <p className="font-display text-4xl text-white tabular-nums">{campAtivo.peso_meta ?? "—"}</p>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1">meta kg</p>
              </div>
              <div className="rounded-xl bg-black/40 backdrop-blur p-3 border border-white/5">
                <p className={`font-display text-4xl tabular-nums ${diffMeta !== null && diffMeta > 0 ? "text-primary" : "text-emerald-400"}`}>
                  {diffMeta !== null ? (diffMeta > 0 ? `+${diffMeta.toFixed(1)}` : diffMeta.toFixed(1)) : "—"}
                </p>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1">diferença</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground uppercase tracking-widest">Luta em {format(parseISO(campAtivo.data_luta), "dd 'de' MMMM", { locale: ptBR })}</p>
          </div>
        </div>
      ) : (
        <Card className="p-6 text-center">
          <Swords className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum camp ativo. Seu técnico programará sua próxima preparação.</p>
        </Card>
      )}

      <Card className="p-4 bg-card/60 backdrop-blur border-white/5">
        <h3 className="font-bold uppercase tracking-widest text-xs mb-3 flex items-center gap-2"><Scale className="h-4 w-4 text-primary" />Peso de hoje</h3>
        <div className="flex gap-2">
          <Input type="number" step="0.1" placeholder="Ex: 72.4" value={novoPeso} onChange={(e) => setNovoPeso(e.target.value)} disabled={!campAtivo} />
          <Button onClick={registrarPeso} disabled={saving || !campAtivo}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button>
        </div>
        {pesos.length > 0 && (
          <div className="mt-4 grid grid-cols-4 md:grid-cols-6 gap-1.5">
            {pesos.slice(0, 12).map((p) => (
              <div key={p.id} className="p-1.5 rounded bg-muted/40 text-center">
                <p className="text-[9px] uppercase text-muted-foreground">{format(parseISO(p.data), "dd/MM")}</p>
                <p className="font-display text-sm">{p.peso}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 bg-card/60 backdrop-blur border-white/5">
        <h3 className="font-bold uppercase tracking-widest text-xs mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-primary" />Próximas sessões</h3>
        {proximas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma sessão programada.</p>
        ) : (
          <div className="space-y-2">
            {proximas.map((s) => (
              <div key={s.id} className="p-3 rounded-xl border border-white/5 bg-black/30 flex items-center gap-3">
                <div className="text-2xl">{tipoIcon[s.tipo || ""] ?? "🥋"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold uppercase tracking-wider">{format(parseISO(s.data), "EEE dd/MM", { locale: ptBR })}</p>
                    <Badge variant="outline" className="text-[10px] uppercase border-primary/40 text-primary">{s.tipo}</Badge>
                    {s.intensidade && <span className="text-[10px] uppercase text-muted-foreground">{s.intensidade}</span>}
                    {s.duracao_min && <span className="text-[10px] text-muted-foreground">· {s.duracao_min}min</span>}
                  </div>
                  {s.descricao && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.descricao}</p>}
                </div>
                {s.rpe && (
                  <div className={`rounded-lg px-2.5 py-1.5 text-center min-w-[44px] ${rpeColor(s.rpe)}`}>
                    <p className="text-[8px] uppercase tracking-widest opacity-80">RPE</p>
                    <p className="font-display text-lg leading-none">{s.rpe}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default FightCampView;
