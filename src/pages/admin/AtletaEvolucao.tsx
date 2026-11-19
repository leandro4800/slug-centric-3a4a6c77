import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/contexts/BrandingProvider";
import { useOwnBackButton } from "@/hooks/use-own-back-button";
import { alunoPertenceAoTime } from "@/lib/coach-athlete-access";
import { DetalheMetricas } from "@/pages/site-admin/Metricas";

interface AlunoTopo {
  id: string;
  nome_completo: string | null;
  avatar_url: string | null;
  tenant_id: string | null;
}

const iniciais = (nome: string | null) => {
  const partes = (nome || "?").trim().split(/\s+/);
  return (partes.length >= 2 ? partes[0][0] + partes[1][0] : (partes[0] || "?").slice(0, 2)).toUpperCase();
};

export const AtletaEvolucaoHeader = ({ aluno, onBack }: { aluno: AlunoTopo | null; onBack: () => void }) => (
  <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur">
    <button
      type="button"
      onClick={onBack}
      aria-label="Voltar para Gerenciar Elenco"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-primary/40 bg-primary/15">
      {aluno?.avatar_url ? (
        <img src={aluno.avatar_url} alt={aluno.nome_completo || "Aluno"} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-display text-base text-primary">
          {iniciais(aluno?.nome_completo ?? null)}
        </span>
      )}
    </div>
    <div className="min-w-0 flex-1">
      <h1 className="truncate font-display text-xl leading-tight">{aluno?.nome_completo || "Aluno"}</h1>
      <p className="mt-0.5 flex items-center gap-1 text-[10px] uppercase tracking-widest text-primary">
        <TrendingUp className="h-3 w-3" /> Evolução
      </p>
    </div>
  </header>
);

/**
 * Evolução de um aluno no app do coach (celular).
 * Reaproveita exatamente a tela de métricas do painel web (DetalheMetricas),
 * sem nenhum cálculo próprio.
 */
const AtletaEvolucao = () => {
  const { slug, atletaId } = useParams<{ slug: string; atletaId: string }>();
  const navigate = useNavigate();
  const { tenant, loading: tenantLoading } = useBranding();
  const [aluno, setAluno] = useState<AlunoTopo | null>(null);
  const [estado, setEstado] = useState<"carregando" | "ok" | "negado">("carregando");

  useOwnBackButton();

  const voltar = () => navigate(`/${slug}/admin/atletas`, { replace: true });

  useEffect(() => {
    if (tenantLoading) return;
    if (!tenant?.id || !atletaId) {
      setEstado("negado");
      return;
    }
    let ativo = true;
    setEstado("carregando");
    (async () => {
      const { data } = await supabase
        .from("perfis")
        .select("id, nome_completo, avatar_url, tenant_id")
        .eq("id", atletaId)
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      if (!ativo) return;
      const perfil = (data as AlunoTopo | null) ?? null;
      if (alunoPertenceAoTime(perfil, tenant.id)) {
        setAluno(perfil);
        setEstado("ok");
      } else {
        setAluno(null);
        setEstado("negado");
      }
    })();
    return () => {
      ativo = false;
    };
  }, [tenant?.id, tenantLoading, atletaId]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <AtletaEvolucaoHeader aluno={aluno} onBack={voltar} />
      {estado === "carregando" ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : estado === "negado" ? (
        <div className="mx-4 mt-10 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Este aluno não faz parte do seu time.
        </div>
      ) : (
        <div className="pb-16">
          <DetalheMetricas alunoId={aluno!.id} onBack={voltar} embedded />
        </div>
      )}
    </div>
  );
};

export default AtletaEvolucao;
