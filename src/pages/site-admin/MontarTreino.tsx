import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import AdminMontarTreino from "@/pages/admin/AdminMontarTreino";
import { Dumbbell, Loader2, ChevronRight, User } from "lucide-react";

interface Aluno { id: string; nome_completo: string | null; email: string | null; }

const MontarTreino = () => {
  const { tenant, loading: tenantLoading } = useSiteTenant();
  const [params, setParams] = useSearchParams();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);

  const alunoId = params.get("aluno");

  useEffect(() => {
    if (!tenant?.id || alunoId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("perfis")
        .select("id, nome_completo, email")
        .eq("tenant_id", tenant.id)
        .order("nome_completo");
      setAlunos((data as Aluno[]) || []);
      setLoading(false);
    })();
  }, [tenant?.id, alunoId]);

  if (tenantLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Quando há aluno selecionado, delega para o builder original
  if (alunoId) {
    return (
      <div className="p-2 md:p-4">
        <div className="mb-3">
          <button
            onClick={() => setParams({})}
            className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary"
          >
            ← Trocar aluno
          </button>
        </div>
        <AdminMontarTreino />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Programação</p>
        <h1 className="font-display text-3xl md:text-4xl uppercase italic tracking-tighter flex items-center gap-3">
          <Dumbbell className="h-7 w-7 text-primary" /> Montar treino
        </h1>
        <p className="text-sm text-muted-foreground mt-2">Selecione um aluno para começar a montar o treino.</p>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : alunos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground mb-3">Nenhum aluno cadastrado ainda.</p>
          <Link to="/site/admin/alunos/novo" className="text-primary text-sm font-bold uppercase tracking-wider">
            Cadastrar primeiro aluno →
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {alunos.map((a) => (
            <button
              key={a.id}
              onClick={() => setParams({ aluno: a.id })}
              className="group flex items-center justify-between rounded-xl border border-border/50 bg-card p-4 hover:border-primary transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{a.nome_completo || "Sem nome"}</p>
                  {a.email && <p className="text-[11px] text-muted-foreground truncate">{a.email}</p>}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MontarTreino;
