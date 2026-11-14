import { formatBRL } from "@/lib/meu-negocio-metrics";

type Linha = { tipo: string; nome: string; receita: number; alunos: number; ticket: number };

export const ReceitaPorProduto = ({ linhas }: { linhas: Linha[] }) => {
  const total = linhas.reduce((s, l) => s + l.receita, 0);
  return (
    <section>
      <h2 className="mb-3 font-display text-lg uppercase italic tracking-tight">Receita por produto</h2>
      {linhas.length === 0 ? (
        <p className="border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
          Nenhuma venda no período.
        </p>
      ) : (
        <div className="divide-y divide-border border border-border bg-card">
          {linhas.map((l) => (
            <div key={l.tipo} className="p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-bold">{l.nome}</p>
                <p className="font-display text-xl">{formatBRL(l.receita)}</p>
              </div>
              <div className="mt-2 h-1.5 w-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${total ? (l.receita / total) * 100 : 0}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {l.alunos} {l.alunos === 1 ? "aluno" : "alunos"} · ticket {formatBRL(l.ticket)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
