import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export const panelNumber = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
export const panelDate = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

export function AtletaMetricChart({ data, label, unit }: { data: { date: string; value: number }[]; label: string; unit: string }) {
  if (!data.length) return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Nenhum registro neste período.</div>;
  return <ChartContainer config={{ value: { label } }} className="h-64 w-full aspect-auto">
    <LineChart data={data} margin={{ left: 0, right: 16, top: 16, bottom: 0 }}>
      <CartesianGrid vertical={false} stroke="var(--panel-chart-grid)" />
      <XAxis dataKey="date" tickFormatter={panelDate} tickLine={false} axisLine={false} minTickGap={25} />
      <YAxis width={55} tickFormatter={panelNumber} tickLine={false} axisLine={false} />
      <ChartTooltip content={<ChartTooltipContent labelFormatter={value => panelDate(String(value))} formatter={value => `${panelNumber(Number(value))} ${unit}`} />} />
      <Line type="monotone" dataKey="value" stroke="var(--panel-chart-line)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
    </LineChart>
  </ChartContainer>;
}