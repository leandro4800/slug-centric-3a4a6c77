import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useBranding } from "@/contexts/BrandingProvider";

interface EvolutionChartProps {
  data: any[];
  type: "PESO" | "BF%";
}

export const EvolutionChart = ({ data, type }: EvolutionChartProps) => {
  const { tenant } = useBranding();
  // No Contexto o primary costuma estar em theme_overrides ou usamos uma cor padrão que respeita o CSS variable
  const strokeColor = "hsl(var(--primary))";
  
  if (!data || data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-none">
        Registre métricas para ver o gráfico
      </div>
    );
  }

  return (
    <div className="h-44 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
          <XAxis 
            dataKey="date" 
            stroke="#666" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
          />
          <YAxis 
            stroke="#666" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            domain={['auto', 'auto']}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#111', 
              border: '1px solid hsl(var(--primary))',
              borderRadius: '0px',
              fontSize: '10px'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={strokeColor} 
            strokeWidth={3}
            dot={{ r: 4, fill: strokeColor, strokeWidth: 0 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};