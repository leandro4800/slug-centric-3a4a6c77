import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatBRL } from "@/lib/meu-negocio-metrics";

type Ponto = { key: string; label: string; valor: number | null };

export const ResumoGrafico = ({
  titulo,
  dados,
  selecionado,
  onSelecionar,
  referencia,
  referenciaLabel,
  vazioTexto = "Nenhuma venda no período",
}: {
  titulo: string;
  dados: Ponto[];
  selecionado?: string;
  onSelecionar?: (key: string) => void;
  referencia?: number | null;
  referenciaLabel?: string;
  vazioTexto?: string;
}) => {
  const vazio = dados.every((d) => !d.valor);
  const muitos = dados.length > 14;
  return (
    <div className="border border-border bg-card p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{titulo}</p>
        {vazio && <p className="text-[11px] text-muted-foreground">{vazioTexto}</p>}
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dados.map((d) => ({ ...d, valor: d.valor ?? 0 }))}
            margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
          >
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval={muitos ? Math.ceil(dados.length / 8) - 1 : 0}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            />
            <YAxis hide domain={[0, (max: number) => Math.max(max, referencia ?? 0) * 1.05 || 1]} />
            <Tooltip
              cursor={{ fill: "hsl(var(--primary) / 0.08)" }}
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 0, fontSize: 12 }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(v: number) => [formatBRL(v), "Valor"]}
            />
            {referencia ? (
              <ReferenceLine
                y={referencia}
                stroke="hsl(var(--foreground))"
                strokeDasharray="4 4"
                label={{ value: referenciaLabel, position: "insideTopRight", fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              />
            ) : null}
            <Bar
              dataKey="valor"
              minPointSize={2}
              cursor={onSelecionar ? "pointer" : undefined}
              onClick={(_: unknown, index: number) => {
                const k = dados[index]?.key;
                if (k && onSelecionar) onSelecionar(k);
              }}
            >
              {dados.map((d) => (
                <Cell
                  key={d.key}
                  fill={!selecionado || d.key === selecionado ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.35)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {onSelecionar && <p className="mt-2 text-[11px] text-muted-foreground">Toque numa barra para ver os pagamentos daquele dia.</p>}
    </div>
  );
};
