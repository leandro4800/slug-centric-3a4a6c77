import { useBoxPrs } from "@/hooks/use-box";
import { Trophy } from "lucide-react";

export default function BenchmarkPrs({ tenantId, alunoId }: { tenantId?: string; alunoId?: string }) {
  const { data = [] } = useBoxPrs(tenantId, alunoId);
  // último resultado lançado por benchmark/escala
  const vistos = new Set<string>();
  const lista = data.filter((p) => { const k = `${p.benchmark}-${p.escala}`; if (vistos.has(k)) return false; vistos.add(k); return true; });
  return (
    <div className="border border-border bg-card p-4 space-y-2">
      <p className="font-display uppercase tracking-wide flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" />Benchmarks</p>
      {lista.length === 0 && <p className="text-sm text-muted-foreground">Seus resultados em benchmarks (Fran, Cindy, Murph...) aparecem aqui.</p>}
      {lista.map((p) => (
        <div key={p.id} className="flex justify-between text-sm border-b border-border/50 py-2">
          <span>{p.benchmark} <span className="text-[10px] uppercase text-muted-foreground">{p.escala}</span></span>
          <span className="font-bold">{p.resultado} <span className="text-[10px] text-muted-foreground">{new Date(p.data + "T12:00").toLocaleDateString("pt-BR")}</span></span>
        </div>
      ))}
    </div>
  );
}
