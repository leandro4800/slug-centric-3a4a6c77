import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { useAuth } from "@/hooks/use-auth";
import {
  Users, Wallet, Calendar, UserPlus, ArrowRight, Loader2, CheckCircle2,
  Dumbbell, Apple, Ruler, MessageSquare, TrendingUp, AlertCircle, Target,
  ShoppingBag, Sparkles
} from "lucide-react";

const Dashboard = () => {
  const { tenant } = useSiteTenant();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [alunos, setAlunos] = useState(0);
  const [ativos, setAtivos] = useState(0);
  const [cancelados, setCancelados] = useState(0);
  const [proximos, setProximos] = useState<{ id: string; nome: string; vence: string }[]>([]);
  const [steps, setSteps] = useState({ aluno: false, treino: false, dieta: false, avaliacao: false });
  const [nome, setNome] = useState<string>("");

  useEffect(() => {
    if (!tenant?.id) return;
    (async () => {
      setLoading(true);
      const sinceISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [
        { count: totalAlunos },
        { count: totalAtivos },
        { count: totalCancelados },
        { data: pp },
        { count: treinos },
        { count: dietas },
        { count: avaliacoes },
        { data: ownerPerfil },
      ] = await Promise.all([
        supabase.from("perfis").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("assinaturas").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).in("status", ["active", "trialing"]),
        supabase.from("assinaturas").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("status", "canceled").gte("updated_at", sinceISO),
        supabase.from("assinaturas").select("id, current_period_end, aluno_id").eq("tenant_id", tenant.id).in("status", ["active", "trialing"]).gt("current_period_end", new Date().toISOString()).order("current_period_end", { ascending: true }).limit(5),
        supabase.from("treinos_prescritos").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("dietas").select("id", { count: "exact", head: true }),
        supabase.from("avaliacoes_fisicas").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        user?.id ? supabase.from("perfis").select("nome_completo").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);

      setAlunos(totalAlunos || 0);
      setAtivos(totalAtivos || 0);
      setCancelados(totalCancelados || 0);
      setNome(((ownerPerfil as any)?.data?.nome_completo) || (ownerPerfil as any)?.nome_completo || "");
      setSteps({
        aluno: (totalAlunos || 0) > 0,
        treino: (treinos || 0) > 0,
        dieta: (dietas || 0) > 0,
        avaliacao: (avaliacoes || 0) > 0,
      });

      const alunoIds = (pp || []).map((p: any) => p.aluno_id).filter(Boolean);
      let nameMap = new Map<string, string>();
      if (alunoIds.length) {
        const { data: perfis } = await supabase.from("perfis").select("id, nome_completo").in("id", alunoIds);
        nameMap = new Map((perfis || []).map((p: any) => [p.id, p.nome_completo || "Aluno"]));
      }
      setProximos((pp || []).map((p: any) => ({ id: p.id, nome: nameMap.get(p.aluno_id) || "Aluno", vence: p.current_period_end })));
      setLoading(false);
    })();
  }, [tenant?.id, user?.id]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const fmt = (s: string) => new Date(s).toLocaleDateString("pt-BR");
  const hour = new Date().getHours();
  const saudacao = hour < 5 ? "Boa madrugada" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const stepDone = Object.values(steps).filter(Boolean).length;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Painel do coach</p>
        <h1 className="font-display text-3xl md:text-4xl uppercase italic tracking-tighter">
          {saudacao}{nome ? `, ${nome.split(" ")[0]}` : ""}! 👋
        </h1>
        <p className="text-sm text-muted-foreground">Acompanhe o desempenho do seu negócio</p>
      </div>

      {/* Primeiros passos */}
      <div className="rounded-2xl border border-border/50 bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-display text-sm uppercase tracking-wider">Primeiros passos</h2>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {stepDone}/4 concluídos
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Step done={steps.aluno} label="Cadastrar 1º aluno" to="/site/admin/alunos/novo" icon={UserPlus} />
          <Step done={steps.treino} label="Montar treino" to="/site/admin/treinos" icon={Dumbbell} />
          <Step done={steps.dieta} label="Montar dieta" to="/site/admin/dieta" icon={Apple} />
          <Step done={steps.avaliacao} label="Avaliação física" to="/site/admin/avaliacao-fisica" icon={Ruler} />
        </div>
      </div>

      {/* KPIs principais */}
      <div className="space-y-2">
        <h2 className="font-display text-sm uppercase tracking-wider text-muted-foreground">Dashboard</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Kpi icon={<Users className="h-4 w-4" />} label="Alunos" value={String(alunos)} />
          <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label="Assinaturas ativas" value={String(ativos)} />
          <Kpi icon={<MessageSquare className="h-4 w-4" />} label="Feedbacks pendentes" value="0" />
          <Kpi icon={<MessageSquare className="h-4 w-4" />} label="Conversas não lidas" value="0" />
          <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Taxa renovação" value="0,00%" sub="Todo o período" />
          <Kpi icon={<AlertCircle className="h-4 w-4" />} label="Desistências (30d)" value={String(cancelados)} />
        </div>
      </div>

      {/* Métricas Financeiras */}
      <div className="space-y-2">
        <h2 className="font-display text-sm uppercase tracking-wider text-muted-foreground">Métricas financeiras</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FinanceCard label="Resumo diário" value="R$ 0,00" sub="Igual ao dia anterior" />
          <FinanceCard label="Vendas por período" value="R$ 0,00" sub="Igual à semana passada" />
          <FinanceCard label="Vendas mensais" value="R$ 0,00" sub="Mês atual" />
          <FinanceCard label="Ticket médio" value="R$ 0,00" sub="Por transação" />
          <FinanceCard label="Expectativa de renovação" value="R$ 0,00" sub="Próximos 30 dias" />
          <FinanceCard label="Meta mensal" value="R$ 0,00" sub="0% de R$ 10.000,00" />
        </div>
      </div>

      {/* Atalhos + vencimentos */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/50 bg-card p-5 lg:col-span-2">
          <h2 className="font-display text-sm uppercase tracking-wider mb-4">Ações rápidas</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Quick to="/site/admin/alunos/novo" icon={<UserPlus className="h-4 w-4" />} label="Cadastrar novo aluno" />
            <Quick to="/site/admin/treinos" icon={<Dumbbell className="h-4 w-4" />} label="Montar treino" />
            <Quick to="/site/admin/avaliacao-fisica" icon={<Ruler className="h-4 w-4" />} label="Avaliação física" />
            <Quick to="/site/admin/ferramentas" icon={<ShoppingBag className="h-4 w-4" />} label="Ferramentas / Links" />
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <h2 className="font-display text-sm uppercase tracking-wider mb-3">Próximos vencimentos</h2>
          {proximos.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem pagamentos próximos.</p>
          ) : (
            <ul className="space-y-3">
              {proximos.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-xs">
                  <span className="font-bold truncate pr-2">{p.nome}</span>
                  <span className="font-mono text-primary shrink-0">{fmt(p.vence)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

const Kpi = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) => (
  <div className="rounded-2xl border border-border/50 bg-card p-4">
    <div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-[10px] font-bold uppercase tracking-widest">{label}</span></div>
    <p className="mt-2 text-xl md:text-2xl font-black">{value}</p>
    {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
  </div>
);

const FinanceCard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="rounded-2xl border border-border/50 bg-card p-5">
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
    <p className="mt-2 text-2xl font-black text-primary">{value}</p>
    {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
  </div>
);

const Quick = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
  <Link to={to} className="group flex items-center justify-between rounded-xl border border-border/50 bg-background/40 p-4 hover:border-primary transition-colors">
    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">{icon}{label}</div>
    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition" />
  </Link>
);

const Step = ({ done, label, to, icon: Icon }: { done: boolean; label: string; to: string; icon: any }) => (
  <Link
    to={to}
    className={`group rounded-xl border p-4 text-center transition-colors ${
      done ? "border-primary/40 bg-primary/5" : "border-border/50 bg-background/40 hover:border-primary"
    }`}
  >
    <div className="flex items-center justify-center mb-2">
      {done ? (
        <CheckCircle2 className="h-6 w-6 text-primary" />
      ) : (
        <Icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition" />
      )}
    </div>
    <p className="text-[11px] font-bold uppercase tracking-wider">{label}</p>
    <p className="text-[9px] text-muted-foreground mt-1">{done ? "Concluído" : "Começar"}</p>
  </Link>
);

export default Dashboard;
