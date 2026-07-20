import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import AdminMontarTreino from "@/pages/admin/AdminMontarTreino";
import { Dumbbell, Loader2, User, Play } from "lucide-react";

interface Aluno {
  id: string;
  nome_completo: string | null;
  email: string | null;
  avatar_url: string | null;
  avulso?: boolean;
}

const MontarTreino = () => {
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
        <AdminMontarTreino />
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
          <Dumbbell className="h-7 w-7 text-primary" /> Montar treino
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Selecione um atleta para começar a montar o treino.
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
              onSelect={() =>
                setParams(a.avulso ? { aluno: a.id, avulso: "1" } : { aluno: a.id })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const AtletaCard = ({
  aluno,
  onSelect,
}: {
  aluno: Aluno;
  onSelect: () => void;
}) => {
  const nome = aluno.nome_completo || "Sem nome";
  const primeiroNome = nome.split(" ")[0];
  return (
    <button
      onClick={onSelect}
      className="group relative overflow-hidden rounded-lg bg-zinc-900 border border-white/5 hover:border-primary/60 transition-all hover:scale-[1.03] hover:shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)] text-left"
      style={{ aspectRatio: "2/3" }}
    >
      {aluno.avatar_url ? (
        <img
          src={aluno.avatar_url}
          alt={nome}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
          <User className="h-16 w-16 text-zinc-700" />
        </div>
      )}

      {/* Gradiente cinematográfico */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

      {/* Play button on hover */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
          <Play className="h-5 w-5 text-white fill-white ml-0.5" />
        </div>
      </div>

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-primary mb-1">
          Atleta
        </p>
        <h3 className="font-display text-sm md:text-base uppercase italic tracking-tight text-white leading-tight line-clamp-2">
          {primeiroNome}
        </h3>
        {aluno.email && (
          <p className="text-[10px] text-white/50 truncate mt-0.5">
            {aluno.email}
          </p>
        )}
      </div>
    </button>
  );
};

export default MontarTreino;
