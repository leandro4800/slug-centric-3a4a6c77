import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { useAuth } from "@/hooks/use-auth";
import {
  Users, Wallet, Calendar, UserPlus, ArrowRight, Loader2, CheckCircle2,
  Dumbbell, Apple, Ruler, MessageSquare, TrendingUp, AlertCircle, Play,
  ShoppingBag, Sparkles, Crown, Flame
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
  const firstName = nome ? nome.split(" ")[0] : "";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HERO CINEMATOGRÁFICO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(1200px 500px at 15% 0%, hsl(var(--primary) / 0.35), transparent 60%), radial-gradient(900px 400px at 90% 20%, hsl(var(--primary) / 0.15), transparent 70%), linear-gradient(180deg, #0a0a0a 0%, #000 100%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 3px)" }} />

        <div className="relative px-4 md:px-10 pt-10 pb-24">
          <div className="flex items-center gap-2 text-primary">
            <Crown className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Painel Premium do Coach</span>
          </div>
          <h1 className="mt-3 font-display text-4xl md:text-6xl uppercase italic tracking-tighter leading-[0.9]">
            {saudacao}{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-3 max-w-xl text-sm md:text-base text-muted-foreground">
            Seu império em tempo real. Alunos, faturamento e performance — em um só palco.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/site/admin/alunos/novo"
              className="group inline-flex items-center gap-2 bg-white text-black px-6 py-3 font-bold uppercase tracking-wider text-xs hover:bg-white/90 transition"
            >
              <Play className="h-4 w-4 fill-current" /> Cadastrar aluno
            </Link>
            <Link
              to="/site/admin/planos"
              className="group inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 text-white px-6 py-3 font-bold uppercase tracking-wider text-xs hover:bg-white/20 transition"
            >
              <Flame className="h-4 w-4" /> Meus planos
            </Link>
          </div>

          {/* KPI strip cinematográfica */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl">
            <HeroStat label="Alunos" value={String(alunos)} icon={<Users className="h-4 w-4" />} />
            <HeroStat label="Ativos" value={String(ativos)} icon={<CheckCircle2 className="h-4 w-4" />} />
            <HeroStat label="Renovação" value="0%" icon={<TrendingUp className="h-4 w-4" />} />
            <HeroStat label="Desistências 30d" value={String(cancelados)} icon={<AlertCircle className="h-4 w-4" />} />
          </div>
        </div>
      </section>

      <div className="px-4 md:px-10 pb-16 space-y-12 -mt-10 relative z-10">
        {/* PRIMEIROS PASSOS — carrossel Netflix */}
        <Row title="Primeiros passos" subtitle={`${stepDone}/4 concluídos`}>
          <CineCard done={steps.aluno} label="Cadastrar 1º aluno" to="/site/admin/alunos/novo" icon={UserPlus} accent="from-red-600/80 to-red-900/40" />
          <CineCard done={steps.treino} label="Montar treino" to="/site/admin/treinos" icon={Dumbbell} accent="from-orange-600/80 to-red-900/40" />
          <CineCard done={steps.dieta} label="Montar dieta" to="/site/admin/dieta" icon={Apple} accent="from-emerald-600/70 to-emerald-900/30" />
          <CineCard done={steps.avaliacao} label="Avaliação física" to="/site/admin/avaliacao-fisica" icon={Ruler} accent="from-sky-600/70 to-indigo-900/40" />
        </Row>

        {/* MÉTRICAS FINANCEIRAS — cards cinema */}
        <Row title="Métricas financeiras" subtitle="Em destaque">
          <PosterCard label="Resumo diário" value="R$ 0,00" sub="Igual ao dia anterior" tone="red" />
          <PosterCard label="Vendas por período" value="R$ 0,00" sub="Igual à semana passada" tone="crimson" />
          <PosterCard label="Vendas mensais" value="R$ 0,00" sub="Mês atual" tone="dark" />
          <PosterCard label="Ticket médio" value="R$ 0,00" sub="Por transação" tone="red" />
          <PosterCard label="Renovação esperada" value="R$ 0,00" sub="Próximos 30 dias" tone="crimson" />
          <PosterCard label="Meta mensal" value="R$ 0,00" sub="0% de R$ 10.000" tone="dark" />
        </Row>

        {/* AÇÕES + VENCIMENTOS */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            <h2 className="font-display text-lg md:text-xl uppercase italic tracking-tight">Ações rápidas</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <Quick to="/site/admin/alunos/novo" icon={<UserPlus className="h-4 w-4" />} label="Cadastrar novo aluno" />
              <Quick to="/site/admin/treinos" icon={<Dumbbell className="h-4 w-4" />} label="Montar treino" />
              <Quick to="/site/admin/avaliacao-fisica" icon={<Ruler className="h-4 w-4" />} label="Avaliação física" />
              <Quick to="/site/admin/ferramentas" icon={<ShoppingBag className="h-4 w-4" />} label="Ferramentas / Links" />
            </div>
          </div>

          <div className="relative overflow-hidden border border-border/60 bg-gradient-to-br from-zinc-950 to-black p-6">
            <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-primary" />
                <h2 className="font-display text-sm uppercase tracking-wider">Próximos vencimentos</h2>
              </div>
              {proximos.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem pagamentos próximos.</p>
              ) : (
                <ul className="space-y-3">
                  {proximos.map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-xs border-b border-white/5 pb-2 last:border-0">
                      <span className="font-bold truncate pr-2">{p.nome}</span>
                      <span className="font-mono text-primary shrink-0">{fmt(p.vence)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HeroStat = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => (
  <div className="border border-white/10 bg-white/5 backdrop-blur-md p-4">
    <div className="flex items-center gap-2 text-white/60">{icon}<span className="text-[10px] font-bold uppercase tracking-[0.2em]">{label}</span></div>
    <p className="mt-2 text-2xl md:text-3xl font-black">{value}</p>
  </div>
);

const Row = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <section>
    <div className="flex items-end justify-between mb-4">
      <h2 className="font-display text-xl md:text-2xl uppercase italic tracking-tight">{title}</h2>
      {subtitle && <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">{subtitle}</span>}
    </div>
    <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none">
      {children}
    </div>
  </section>
);

const CineCard = ({ done, label, to, icon: Icon, accent }: { done: boolean; label: string; to: string; icon: any; accent: string }) => (
  <Link
    to={to}
    className="group relative snap-start shrink-0 w-[240px] md:w-[280px] aspect-[16/10] overflow-hidden border border-white/10 hover:border-primary transition-all hover:scale-[1.03] hover:z-10"
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3), transparent 50%)" }} />
    <div className="relative h-full flex flex-col justify-between p-5">
      <div className="flex items-center justify-between">
        <div className="h-11 w-11 rounded-full bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
          <Icon className="h-5 w-5 text-white" />
        </div>
        {done && <CheckCircle2 className="h-5 w-5 text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" />}
      </div>
      <div>
        <p className="font-display text-lg uppercase italic tracking-tight leading-tight">{label}</p>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 mt-1">{done ? "Concluído" : "Começar agora"}</p>
      </div>
    </div>
  </Link>
);

const PosterCard = ({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: "red" | "crimson" | "dark" }) => {
  const bg =
    tone === "red"
      ? "from-[hsl(var(--primary))] via-red-900 to-black"
      : tone === "crimson"
      ? "from-red-950 via-black to-black"
      : "from-zinc-900 via-black to-black";
  return (
    <div className={`group snap-start shrink-0 w-[260px] md:w-[300px] aspect-[3/4] relative overflow-hidden border border-white/10 hover:border-primary transition-all hover:scale-[1.03]`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${bg}`} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black to-transparent" />
      <div className="relative h-full flex flex-col justify-between p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/70">{label}</p>
        <div>
          <p className="font-display text-4xl md:text-5xl font-black italic tracking-tight">{value}</p>
          {sub && <p className="text-[11px] text-white/50 mt-2">{sub}</p>}
        </div>
      </div>
    </div>
  );
};

const Quick = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
  <Link to={to} className="group flex items-center justify-between border border-border/60 bg-gradient-to-r from-zinc-950 to-black p-4 hover:border-primary hover:from-red-950/30 transition-all">
    <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-wider">{icon}{label}</div>
    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition" />
  </Link>
);

export default Dashboard;
