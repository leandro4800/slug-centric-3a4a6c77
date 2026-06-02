import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/contexts/BrandingProvider";
import { Loader2, Users, UserMinus, Wallet, Calendar, ArrowRight, Dumbbell, MessageSquare, Palette, BarChart3, CreditCard } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

interface KPIs {
  alunos_ativos: number;
  alunos_inativos: number;
  faturamento_mes_liquido: number;
  proximo_pagamento: string | null;
}

interface ProximoPagamento {
  id: string;
  nome: string;
  plano: string;
  vence: string;
}

export default function CoachDashboard() {
  const { slug } = useParams();
  const { tenant } = useBranding();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [proximos, setProximos] = useState<ProximoPagamento[]>([]);
  const [serieAlunos, setSerieAlunos] = useState<{ mes: string; ativos: number }[]>([]);

  useEffect(() => {
    if (!tenant?.id) return;
    (async () => {
      setLoading(true);
      const { data: kpiData } = await supabase
        .from("v_coach_dashboard_kpis" as any)
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      setKpis(kpiData as any);

      const { data: pp } = await supabase
        .from("assinaturas")
        .select("id, current_period_end, aluno_id, plano_id")
        .eq("tenant_id", tenant.id)
        .in("status", ["active", "trialing"])
        .gt("current_period_end", new Date().toISOString())
        .order("current_period_end", { ascending: true })
        .limit(5);
      const alunoIds = Array.from(new Set((pp || []).map((p: any) => p.aluno_id).filter(Boolean)));
      const planoIds = Array.from(new Set((pp || []).map((p: any) => p.plano_id).filter(Boolean)));
      const [{ data: perfisData }, { data: planosData }] = await Promise.all([
        alunoIds.length ? supabase.from("perfis").select("id, nome_completo").in("id", alunoIds) : Promise.resolve({ data: [] as any[] }),
        planoIds.length ? supabase.from("planos").select("id, nome").in("id", planoIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      const perfilMap = new Map((perfisData || []).map((p: any) => [p.id, p.nome_completo]));
      const planoMap = new Map((planosData || []).map((p: any) => [p.id, p.nome]));
      setProximos(
        (pp || []).map((p: any) => ({
          id: p.id,
          nome: perfilMap.get(p.aluno_id) || "Aluno",
          plano: planoMap.get(p.plano_id) || "—",
          vence: p.current_period_end,
        })),
      );

      const meses = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return { key: d.toISOString().slice(0, 7), label: d.toLocaleDateString("pt-BR", { month: "short" }) };
      });
      const { data: histAssin } = await supabase
        .from("assinaturas")
        .select("created_at")
        .eq("tenant_id", tenant.id)
        .in("status", ["active", "trialing"]);
      const serie = meses.map(({ key, label }) => ({
        mes: label,
        ativos: (histAssin || []).filter((a: any) => (a.created_at || "").slice(0, 7) <= key).length,
      }));
      setSerieAlunos(serie);
      setLoading(false);
    })();
  }, [tenant?.id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—");

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Painel</p>
          <h1 className="font-display text-3xl uppercase italic tracking-tighter md:text-4xl">Visão Geral</h1>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard icon={<Users className="h-4 w-4" />} label="Alunos ativos" value={String(kpis?.alunos_ativos ?? 0)} />
          <KpiCard icon={<UserMinus className="h-4 w-4" />} label="Inativos" value={String(kpis?.alunos_inativos ?? 0)} />
          <KpiCard icon={<Wallet className="h-4 w-4" />} label="Faturamento (líq. mês)" value={fmtBRL(Number(kpis?.faturamento_mes_liquido ?? 0))} />
          <KpiCard icon={<Calendar className="h-4 w-4" />} label="Próximo pagamento" value={fmtDate(kpis?.proximo_pagamento ?? null)} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-border/50 bg-card p-5 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm uppercase tracking-wider">Evolução de alunos</h2>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serieAlunos}>
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Line type="monotone" dataKey="ativos" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-5">
            <h2 className="mb-3 font-display text-sm uppercase tracking-wider">Próximos vencimentos</h2>
            {proximos.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem pagamentos próximos.</p>
            ) : (
              <ul className="space-y-3">
                {proximos.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold">{p.nome}</p>
                      <p className="text-muted-foreground">{p.plano}</p>
                    </div>
                    <span className="font-mono text-primary">{fmtDate(p.vence)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <QuickLink to={`/${slug}/admin/atletas`} icon={<Users className="h-4 w-4" />} label="Meus Atletas" />
          <QuickLink to={`/${slug}/admin/montar-treino`} icon={<Dumbbell className="h-4 w-4" />} label="Montar Treino" />
          <QuickLink to={`/${slug}/admin/faturamento`} icon={<Wallet className="h-4 w-4" />} label="Faturamento" />
          <QuickLink to={`/${slug}/admin/aparencia`} icon={<Palette className="h-4 w-4" />} label="Aparência" />
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <p className="mt-2 text-xl font-black md:text-2xl">{value}</p>
    </div>
  );
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-2xl border border-border/50 bg-card p-4 transition-all hover:border-primary"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
    </Link>
  );
}
