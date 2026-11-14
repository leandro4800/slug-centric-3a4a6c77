import { useState } from "react";
import { Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { DIAS_SUMINDO } from "@/lib/meu-negocio-metrics";

export type AlunoLinha = {
  id: string;
  nome: string;
  avatar_url: string | null;
  ativo: boolean;
  gratuito: boolean;
  sumindo: boolean;
  saiu: boolean;
  voltou: boolean;
  diasSemTreino: number | null;
  mesesPagos: Set<string>;
  desdeFallback: string | null;
};

export type FiltroAluno = "ativos" | "sumindo" | "sairam" | "voltaram" | "gratuitos";

const FILTROS: { key: FiltroAluno; label: string; test: (a: AlunoLinha) => boolean }[] = [
  { key: "ativos", label: "Ativos", test: (a) => a.ativo },
  { key: "sumindo", label: "Sumindo", test: (a) => a.sumindo },
  { key: "sairam", label: "Saíram", test: (a) => a.saiu },
  { key: "voltaram", label: "Voltaram", test: (a) => a.voltou },
  { key: "gratuitos", label: "Gratuitos", test: (a) => a.gratuito },
];

type Props = {
  alunos: AlunoLinha[];
  meses: string[];
  filtro: FiltroAluno;
  onFiltro: (f: FiltroAluno) => void;
  onAbrir: (a: AlunoLinha) => void;
};

const nomeMes = (k: string) => {
  const [y, m] = k.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
};

export const AlunosLista = ({ alunos, meses, filtro, onFiltro, onAbrir }: Props) => {
  const [busca, setBusca] = useState("");
  const atual = FILTROS.find((f) => f.key === filtro)!;
  const termo = busca.trim().toLowerCase();
  const lista = alunos
    .filter(atual.test)
    .filter((a) => !termo || a.nome.toLowerCase().includes(termo))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <section id="meu-negocio-alunos">
      <h2 className="mb-3 font-display text-lg uppercase italic tracking-tight">Alunos</h2>

      <div className="mb-3 flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const n = alunos.filter(f.test).length;
          return (
            <button
              key={f.key}
              onClick={() => onFiltro(f.key)}
              className={cn(
                "border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors",
                filtro === f.key ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label} <span className="opacity-70">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar aluno" className="pl-9" />
      </div>

      {lista.length === 0 ? (
        <div className="flex flex-col items-center gap-2 border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <Users className="h-6 w-6" />
          Nenhum aluno neste filtro.
        </div>
      ) : (
        <ul className="divide-y divide-border border border-border bg-card">
          {lista.map((a) => (
            <li key={a.id}>
              <button onClick={() => onAbrir(a)} className="flex w-full flex-col gap-2 p-3 text-left transition-colors hover:bg-primary/5 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {a.avatar_url ? (
                    <img src={a.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold uppercase">
                      {a.nome.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{a.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.gratuito ? "Gratuito" : a.ativo ? "Pagante" : "Saiu"}
                      {a.ativo && (a.diasSemTreino === null ? " · ainda não treinou" : ` · treinou há ${a.diasSemTreino} d`)}
                      {a.sumindo && a.diasSemTreino !== null && a.diasSemTreino >= DIAS_SUMINDO && <span className="text-primary"> · sumindo</span>}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-1 sm:w-64" aria-label="Pagamentos nos últimos 12 meses">
                  {meses.map((m) => (
                    <span
                      key={m}
                      title={nomeMes(m)}
                      className={cn(
                        "aspect-square w-full",
                        a.gratuito ? "bg-muted-foreground/25" : a.mesesPagos.has(m) ? "bg-primary" : "border border-border bg-background",
                      )}
                    />
                  ))}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
