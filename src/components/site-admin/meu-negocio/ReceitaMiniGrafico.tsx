import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { formatBRL } from "@/lib/meu-negocio-metrics";

type Ponto = { key: string; label: string; valor: number };

export const ReceitaMiniGrafico = ({ dados }: { dados: Ponto[] }) => {
  const vazio = dados.every((d) => d.valor === 0);
  return (
    <div className="border border-border bg-card p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Receita — últimos 12 meses</p>
        {vazio && <p className="text-[11px] text-muted-foreground">Sem vendas ainda</p>}
      </div>
      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
            <Tooltip
              cursor={{ fill: "hsl(var(--primary) / 0.08)" }}
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 0, fontSize: 12 }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(v: number) => [formatBRL(v), "Receita"]}
            />
            <Bar dataKey="valor" fill="hsl(var(--primary))" minPointSize={vazio ? 2 : 0} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
