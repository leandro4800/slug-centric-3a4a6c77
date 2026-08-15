import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { useAuth } from "@/hooks/use-auth";
import {
  Users, Calendar, UserPlus, ArrowRight, Loader2, CheckCircle2,
  Dumbbell, Apple, Ruler, TrendingUp, AlertCircle, Play,
  ShoppingBag, Crown, Flame
} from "lucide-react";
import imgAluno from "@/assets/dash-aluno.jpg";
import imgTreino from "@/assets/dash-treino.jpg";
import imgDieta from "@/assets/dash-dieta.jpg";
import imgAvaliacao from "@/assets/dash-avaliacao.jpg";
import imgMoney from "@/assets/dash-money.jpg";
import imgChart from "@/assets/dash-chart.jpg";
import imgTarget from "@/assets/dash-target.jpg";

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
      {/* HERO */}
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

        <div className="relative px-4 md:px-8 pt-8 pb-20">
          <div className="flex items-center gap-2 text-primary">
            <Crown className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Painel Premium do Coach</span>
          </div>
          <h1 className="mt-3 font-display text-3xl md:text-5xl uppercase italic tracking-tighter leading-[0.9]">
            {saudacao}{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Seu império em tempo real. Alunos, faturamento e performance — em um só palco.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/site/admin/alunos/novo" className="inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 font-bold uppercase tracking-wider text-xs hover:bg-white/90 transition">
              <Play className="h-3.5 w-3.5 fill-current" /> Cadastrar aluno
            </Link>
            <Link to="/site/admin/planos" className="inline-flex items-center gap-2 bg-white/15 border border-white/20 text-white px-5 py-2.5 font-bold uppercase tracking-wider text-xs hover:bg-white/20 transition">
              <Flame className="h-3.5 w-3.5" /> Meus planos
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-2.5 max-w-3xl">
            <HeroStat label="Alunos" value={String(alunos)} icon={<Users className="h-3.5 w-3.5" />} />
            <HeroStat label="Ativos" value={String(ativos)} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
            <HeroStat label="Renovação" value="0%" icon={<TrendingUp className="h-3.5 w-3.5" />} />
            <HeroStat label="Desistências 30d" value={String(cancelados)} icon={<AlertCircle className="h-3.5 w-3.5" />} />
          </div>
        </div>
      </section>

      <div className="px-4 md:px-8 pb-16 space-y-10 -mt-8 relative z-10">
        {/* PRIMEIROS PASSOS */}
        <Row title="Primeiros passos" subtitle={`${stepDone}/4 concluídos`}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <CineCard done={steps.aluno} label="Cadastrar 1º aluno" to="/site/admin/alunos/novo" icon={UserPlus} image={imgAluno} />
            <CineCard done={steps.treino} label="Montar treino" to="/site/admin/treinos" icon={Dumbbell} image={imgTreino} />
            <CineCard done={steps.dieta} label="Montar dieta" to="/site/admin/dieta" icon={Apple} image={imgDieta} />
            <CineCard done={steps.avaliacao} label="Avaliação física" to="/site/admin/avaliacao-fisica" icon={Ruler} image={imgAvaliacao} />
          </div>
        </Row>

        {/* MÉTRICAS FINANCEIRAS */}
        <Row title="Métricas financeiras" subtitle="Em destaque">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <PosterCard label="Resumo diário" value="R$ 0,00" sub="Igual ao dia anterior" image={imgMoney} />
            <PosterCard label="Vendas por período" value="R$ 0,00" sub="Igual à semana passada" image={imgChart} />
            <PosterCard label="Vendas mensais" value="R$ 0,00" sub="Mês atual" image={imgMoney} />
            <PosterCard label="Ticket médio" value="R$ 0,00" sub="Por transação" image={imgChart} />
            <PosterCard label="Renovação esperada" value="R$ 0,00" sub="Próximos 30 dias" image={imgMoney} />
            <PosterCard label="Meta mensal" value="R$ 0,00" sub="0% de R$ 10.000" image={imgTarget} />
          </div>
        </Row>

        {/* AÇÕES + VENCIMENTOS */}
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            <h2 className="font-display text-lg uppercase italic tracking-tight">Ações rápidas</h2>
            <div className="grid sm:grid-cols-2 gap-2.5">
              <Quick to="/site/admin/alunos/novo" icon={<UserPlus className="h-4 w-4" />} label="Cadastrar novo aluno" />
              <Quick to="/site/admin/treinos" icon={<Dumbbell className="h-4 w-4" />} label="Montar treino" />
              <Quick to="/site/admin/avaliacao-fisica" icon={<Ruler className="h-4 w-4" />} label="Avaliação física" />
              <Quick to="/site/admin/ferramentas" icon={<ShoppingBag className="h-4 w-4" />} label="Ferramentas / Links" />
            </div>
          </div>

          <div className="relative overflow-hidden border border-border/60 bg-gradient-to-br from-zinc-950 to-black p-5">
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
  <div className="border border-white/10 bg-white/10 p-3">
    <div className="flex items-center gap-1.5 text-white/60">{icon}<span className="text-[9px] font-bold uppercase tracking-[0.2em]">{label}</span></div>
    <p className="mt-1.5 text-xl md:text-2xl font-black">{value}</p>
  </div>
);

const Row = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <section>
    <div className="flex items-end justify-between mb-3">
      <h2 className="font-display text-lg md:text-xl uppercase italic tracking-tight">{title}</h2>
      {subtitle && <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">{subtitle}</span>}
    </div>
    {children}
  </section>
);

const CineCard = ({ done, label, to, icon: Icon, image }: { done: boolean; label: string; to: string; icon: any; image: string }) => (
  <Link
    to={to}
    className="group relative aspect-[16/10] overflow-hidden border border-white/10 hover:border-primary transition-all hover:scale-[1.03] hover:z-10"
  >
    <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500" />
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />
    <div className="relative h-full flex flex-col justify-between p-3">
      <div className="flex items-center justify-between">
        <div className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center border border-white/20">
          <Icon className="h-4 w-4 text-white" />
        </div>
        {done && <CheckCircle2 className="h-4 w-4 text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" />}
      </div>
      <div>
        <p className="font-display text-sm md:text-base uppercase italic tracking-tight leading-tight">{label}</p>
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/60 mt-1">{done ? "Concluído" : "Começar agora"}</p>
      </div>
    </div>
  </Link>
);

const PosterCard = ({ label, value, sub, image }: { label: string; value: string; sub?: string; image: string }) => (
  <div className="group relative aspect-[3/4] overflow-hidden border border-white/10 hover:border-primary transition-all hover:scale-[1.03]">
    <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500" />
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30" />
    <div className="relative h-full flex flex-col justify-between p-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/80">{label}</p>
      <div>
        <p className="font-display text-xl md:text-2xl font-black italic tracking-tight">{value}</p>
        {sub && <p className="text-[10px] text-white/60 mt-1">{sub}</p>}
      </div>
    </div>
  </div>
);

const Quick = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
  <Link to={to} className="group flex items-center justify-between border border-border/60 bg-gradient-to-r from-zinc-950 to-black p-3 hover:border-primary hover:from-red-950/30 transition-all">
    <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider">{icon}{label}</div>
    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition" />
  </Link>
);

export default Dashboard;
