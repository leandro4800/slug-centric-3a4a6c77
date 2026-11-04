import { rankResultados, resultadoTexto } from "@/lib/box-wod";
import type { BoxResultado } from "@/hooks/use-box";

export default function RankingDia({ formato, resultados, nomes, destaque }: {
  formato: string; resultados: BoxResultado[]; nomes: Record<string, { nome: string }>; destaque?: string;
}) {
  const lista = rankResultados(formato, resultados);
  return (
    <div className="border border-border bg-card p-4 space-y-2">
      <p className="font-display uppercase tracking-wide">Ranking do dia</p>
      {lista.length === 0 && <p className="text-sm text-muted-foreground">Ninguém lançou resultado ainda.</p>}
      {lista.map((r, i) => (
        <div key={r.id} className={`flex items-center justify-between border-b border-border/50 py-2 text-sm ${r.aluno_id === destaque ? "text-primary" : ""}`}>
          <span className="flex items-center gap-2 min-w-0">
            <span className="w-6 font-bold tabular-nums">{i + 1}º</span>
            <span className="truncate">{nomes[r.aluno_id]?.nome ?? "Aluno"}</span>
            <span className="text-[10px] uppercase border border-border px-1">{r.escala === "rx" ? "Rx" : "Scaled"}</span>
          </span>
          <span className="font-bold tabular-nums">{resultadoTexto(formato, r)}</span>
        </div>
      ))}
    </div>
  );
}
