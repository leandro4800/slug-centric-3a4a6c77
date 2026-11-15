import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatBRL } from "@/lib/meu-negocio-metrics";

type Ponto = { key: string; label: string; fixas: number; avulsas: number; total: number };

export const DespesasGraficoMensal = ({ dados }: { dados: Ponto[] }) => {
  const vazio = dados.every((d) => d.total === 0);
  return (
    <div className="border border-border bg-card p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Despesas — últimos 12 meses</p>
        {vazio && <p className="text-[11px] text-muted-foreground">Nenhuma despesa lançada</p>}
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: "hsl(var(--primary) / 0.08)" }}
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 0, fontSize: 12 }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(v: number, nome: string) => [formatBRL(v), nome]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} iconType="square" />
            <Bar dataKey="fixas" name="Fixas" stackId="d" fill="hsl(var(--primary))" />
            <Bar dataKey="avulsas" name="Avulsas" stackId="d" fill="hsl(var(--muted-foreground))" minPointSize={vazio ? 2 : 0} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
