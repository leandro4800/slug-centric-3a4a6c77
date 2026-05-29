import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { Users, Wallet, Calendar, UserPlus, ArrowRight, Loader2 } from "lucide-react";

const Dashboard = () => {
  const { tenant } = useSiteTenant();
  const [loading, setLoading] = useState(true);
  const [alunos, setAlunos] = useState(0);
  const [ativos, setAtivos] = useState(0);
  const [proximos, setProximos] = useState<{ id: string; nome: string; vence: string }[]>([]);

  useEffect(() => {
    if (!tenant?.id) return;
    (async () => {
      setLoading(true);
      const [{ count: totalAlunos }, { count: totalAtivos }, { data: pp }] = await Promise.all([
        supabase.from("perfis").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("assinaturas").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).in("status", ["active", "trialing"]),
        supabase.from("assinaturas").select("id, current_period_end, aluno_id").eq("tenant_id", tenant.id).in("status", ["active", "trialing"]).gt("current_period_end", new Date().toISOString()).order("current_period_end", { ascending: true }).limit(5),
      ]);
      setAlunos(totalAlunos || 0);
      setAtivos(totalAtivos || 0);

      const alunoIds = (pp || []).map((p: any) => p.aluno_id).filter(Boolean);
      let nameMap = new Map<string, string>();
      if (alunoIds.length) {
        const { data: perfis } = await supabase.from("perfis").select("id, nome_completo").in("id", alunoIds);
        nameMap = new Map((perfis || []).map((p: any) => [p.id, p.nome_completo || "Aluno"]));
      }
      setProximos((pp || []).map((p: any) => ({ id: p.id, nome: nameMap.get(p.aluno_id) || "Aluno", vence: p.current_period_end })));
      setLoading(false);
    })();
  }, [tenant?.id]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const fmt = (s: string) => new Date(s).toLocaleDateString("pt-BR");

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Painel do coach</p>
        <h1 className="font-display text-3xl md:text-4xl uppercase italic tracking-tighter">Visão geral</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={<Users className="h-4 w-4" />} label="Alunos cadastrados" value={String(alunos)} />
        <Kpi icon={<Users className="h-4 w-4" />} label="Assinaturas ativas" value={String(ativos)} />
        <Kpi icon={<Wallet className="h-4 w-4" />} label="Faturamento" value="—" />
        <Kpi icon={<Calendar className="h-4 w-4" />} label="Próximo vencimento" value={proximos[0] ? fmt(proximos[0].vence) : "—"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/50 bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm uppercase tracking-wider">Ações rápidas</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Quick to="/site/admin/alunos/novo" icon={<UserPlus className="h-4 w-4" />} label="Cadastrar novo aluno" />
            <Quick to="/site/admin/alunos" icon={<Users className="h-4 w-4" />} label="Ver lista de alunos" />
            <Quick to="/site/admin/avaliacao-fisica" icon={<Calendar className="h-4 w-4" />} label="Avaliação física" />
            <Quick to="/site/admin/aparencia" icon={<Wallet className="h-4 w-4" />} label="Aparência" />
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

const Kpi = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-2xl border border-border/50 bg-card p-4">
    <div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-[10px] font-bold uppercase tracking-widest">{label}</span></div>
    <p className="mt-2 text-xl md:text-2xl font-black">{value}</p>
  </div>
);

const Quick = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
  <Link to={to} className="group flex items-center justify-between rounded-xl border border-border/50 bg-background/40 p-4 hover:border-primary transition-colors">
    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">{icon}{label}</div>
    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition" />
  </Link>
);

export default Dashboard;
