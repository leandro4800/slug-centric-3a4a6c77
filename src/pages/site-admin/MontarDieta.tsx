import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import AdminMontarDieta from "@/pages/admin/AdminMontarDieta";
import { Apple, Loader2 } from "lucide-react";
import { AtletaCard } from "./MontarTreino";

interface Aluno {
  id: string;
  nome_completo: string | null;
  email: string | null;
  avatar_url: string | null;
  avulso?: boolean;
}

const MontarDieta = () => {
  const { tenant, loading: tenantLoading } = useSiteTenant();
  const [params, setParams] = useSearchParams();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);

  const alunoId = params.get("aluno");

  useEffect(() => {
    if (!tenant?.id || alunoId) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const [{ data }, { data: avulsoData }] = await Promise.all([
        supabase
          .from("perfis")
          .select("id, nome_completo, email, avatar_url")
          .eq("tenant_id", tenant.id)
          .order("nome_completo"),
        (supabase as any)
          .from("avaliacao_avulsa_alunos")
          .select("id, nome, email")
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: false }),
      ]);
      const avulsos: Aluno[] = ((avulsoData as any[]) || []).map((a) => ({
        id: a.id,
        nome_completo: `${a.nome} (avulso)`,
        email: a.email,
        avatar_url: null,
        avulso: true,
      }));
      setAlunos([...((data as Aluno[]) || []), ...avulsos]);
      setLoading(false);
    })();
  }, [tenant?.id, alunoId]);

  if (tenantLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
        <AdminMontarDieta />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-3 mb-2">
        <AdminBackButton to="/site/admin/dashboard" />
      </div>
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Programação
        </p>
        <h1 className="font-display text-3xl md:text-4xl uppercase italic tracking-tighter flex items-center gap-3">
          <Apple className="h-7 w-7 text-primary" /> Montar dieta
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Selecione um atleta para criar o plano alimentar.
        </p>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : alunos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Nenhum aluno cadastrado ainda.
          </p>
          <Link
            to="/site/admin/alunos/novo"
            className="text-primary text-sm font-bold uppercase tracking-wider"
          >
            Cadastrar primeiro aluno →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {alunos.map((a) => (
            <AtletaCard
              key={a.id}
              aluno={a}
              onSelect={() => setParams({ aluno: a.id })}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MontarDieta;
