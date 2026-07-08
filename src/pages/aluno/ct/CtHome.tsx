import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/aluno/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Swords, CalendarClock, Scale, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type Camp = { id: string; nome: string; data_inicio: string; data_luta: string; peso_meta: number | null; modalidade: string | null };
type Sessao = { id: string; data: string; tipo: string | null; descricao: string | null; duracao_min: number | null; intensidade: string | null };
type Peso = { id: string; data: string; peso: number };

const CtHome = () => {
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
      supabase.from("sessoes_luta").select("*").eq("aluno_id", user.id).order("data", { ascending: false }).limit(20),
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
  const diffMeta = pesoAtual && campAtivo?.peso_meta ? (pesoAtual - campAtivo.peso_meta).toFixed(1) : null;

  const registrarPeso = async () => {
    if (!user) return;
    const v = Number(novoPeso);
    if (!v || v <= 0) { toast.error("Peso inválido"); return; }
    setSaving(true);
    const hoje = format(new Date(), "yyyy-MM-dd");
    const tenantId = campAtivo ? (await supabase.from("camps_luta").select("tenant_id").eq("id", campAtivo.id).single()).data?.tenant_id : null;
    // fallback: pega tenant do perfil
    let tid = tenantId;
    if (!tid) {
      const { data } = await supabase.from("perfis").select("tenant_id").eq("id", user.id).maybeSingle();
      tid = (data as any)?.tenant_id;
    }
    if (!tid) { toast.error("Tenant não encontrado"); setSaving(false); return; }
    const { error } = await supabase.from("peso_diario").upsert({
      aluno_id: user.id, tenant_id: tid, data: hoje, peso: v,
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
      <PageHeader icon={Swords} title="Preparação" subtitle="Camp e corte de peso" />

      {campAtivo ? (
        <Card className="p-5 bg-gradient-to-br from-primary/20 to-transparent border-primary/30">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Camp ativo</p>
              <h2 className="font-display text-2xl uppercase italic tracking-tight">{campAtivo.nome}</h2>
              {campAtivo.modalidade && <p className="text-xs text-muted-foreground">{campAtivo.modalidade}</p>}
            </div>
            <CalendarClock className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div><p className="font-display text-3xl">{dias !== null && dias >= 0 ? dias : "—"}</p><p className="text-[10px] uppercase text-muted-foreground">dias p/ luta</p></div>
            <div><p className="font-display text-3xl">{campAtivo.peso_meta ?? "—"}</p><p className="text-[10px] uppercase text-muted-foreground">meta kg</p></div>
            <div>
              <p className={`font-display text-3xl ${diffMeta && Number(diffMeta) > 0 ? "text-primary" : "text-emerald-400"}`}>
                {diffMeta ? (Number(diffMeta) > 0 ? `+${diffMeta}` : diffMeta) : "—"}
              </p>
              <p className="text-[10px] uppercase text-muted-foreground">diferença</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Luta em {format(parseISO(campAtivo.data_luta), "dd 'de' MMMM", { locale: ptBR })}</p>
        </Card>
      ) : (
        <Card className="p-4"><p className="text-sm text-muted-foreground">Nenhum camp ativo. Seu técnico irá programar sua próxima preparação.</p></Card>
      )}

      <Card className="p-4">
        <h3 className="font-bold uppercase tracking-wider text-sm mb-3 flex items-center gap-2"><Scale className="h-4 w-4 text-primary" />Registrar peso de hoje</h3>
        <div className="flex gap-2">
          <Input type="number" step="0.1" placeholder="Ex: 72.4" value={novoPeso} onChange={(e) => setNovoPeso(e.target.value)} />
          <Button onClick={registrarPeso} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button>
        </div>
        {pesos.length > 0 && (
          <div className="mt-4 grid grid-cols-3 md:grid-cols-6 gap-1.5">
            {pesos.slice(0, 12).map((p) => (
              <div key={p.id} className="p-1.5 rounded bg-muted/40 text-center">
                <p className="text-[9px] uppercase text-muted-foreground">{format(parseISO(p.data), "dd/MM")}</p>
                <p className="font-display text-sm">{p.peso}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="font-bold uppercase tracking-wider text-sm mb-3">Próximas sessões</h3>
        {sessoes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma sessão programada.</p> : (
          <div className="space-y-1.5">
            {sessoes.map((s) => (
              <div key={s.id} className="p-2.5 rounded border border-border/30">
                <p className="text-sm font-medium">
                  {format(parseISO(s.data), "EEE dd/MM", { locale: ptBR })} · <span className="uppercase text-primary text-xs">{s.tipo}</span>
                  {s.intensidade ? ` · ${s.intensidade}` : ""}{s.duracao_min ? ` · ${s.duracao_min}min` : ""}
                </p>
                {s.descricao && <p className="text-xs text-muted-foreground mt-0.5">{s.descricao}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default CtHome;
