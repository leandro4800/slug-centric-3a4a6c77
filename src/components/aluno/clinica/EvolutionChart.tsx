import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceArea
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export const EvolutionChart = () => {
  const [selectedMarker, setSelectedMarker] = useState<string>("");

  // Get unique markers for this user
  const { data: markersList, isLoading: isLoadingMarkers } = useQuery({
    queryKey: ["user_biomarkers_list"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("exames_biomarcadores")
        .select("codigo, nome")
        .eq("user_id", user.id);

      if (error) throw error;
      
      // Filter unique
      const unique = data.reduce((acc: any[], curr: any) => {
        if (!acc.find(i => i.codigo === curr.codigo)) {
          acc.push(curr);
        }
        return acc;
      }, []);

      if (unique.length > 0 && !selectedMarker) {
        setSelectedMarker(unique[0].codigo);
      }

      return unique;
    }
  });

  // Get data for selected marker
  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["biomarker_evolution", selectedMarker],
    queryFn: async () => {
      if (!selectedMarker) return [];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("exames_biomarcadores")
        .select("*")
        .eq("user_id", user.id)
        .eq("codigo", selectedMarker)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedMarker
  });

  // Get reference ranges
  const { data: reference } = useQuery({
    queryKey: ["marker_reference", selectedMarker],
    queryFn: async () => {
      if (!selectedMarker) return null;
      const { data, error } = await supabase
        .from("referencias_exames")
        .select("*")
        .eq("codigo", selectedMarker)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!selectedMarker
  });

  const chartData = useMemo(() => {
    if (!history) return [];
    return history.map(h => ({
      date: new Date(h.created_at).toLocaleDateString(),
      value: Number(h.valor),
      unidade: h.unidade
    }));
  }, [history]);

  if (isLoadingMarkers) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  if (markersList?.length === 0) {
    return (
      <div className="bg-card/40 border border-border rounded-2xl p-10 text-center text-muted-foreground">
        <p>Nenhum dado de evolução disponível. Faça sua primeira análise!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Selecionar Biomarcador</label>
        <Select value={selectedMarker} onValueChange={setSelectedMarker}>
          <SelectTrigger className="bg-card border-border h-12 rounded-xl">
            <SelectValue placeholder="Selecione um marcador" />
          </SelectTrigger>
          <SelectContent>
            {markersList?.map((m) => (
              <SelectItem key={m.codigo} value={m.codigo}>
                {m.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card/40 border border-border rounded-2xl p-5 h-[400px]">
        {isLoadingHistory ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-accent animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#737373" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                stroke="#737373" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                domain={['auto', 'auto']}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#171717', 
                  borderColor: '#262626', 
                  borderRadius: '12px',
                  color: '#fff'
                }}
                itemStyle={{ color: '#FACC15' }}
              />
              {reference?.valor_ouro_min && reference?.valor_ouro_max && (
                <ReferenceArea 
                  y1={reference.valor_ouro_min} 
                  y2={reference.valor_ouro_max} 
                  fill="#FACC15" 
                  fillOpacity={0.05} 
                  label={{ 
                    value: 'FAIXA OURO', 
                    position: 'insideRight', 
                    fill: '#FACC15', 
                    fontSize: 10,
                    fontWeight: 'bold',
                    opacity: 0.5
                  }} 
                />
              )}
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#FACC15" 
                strokeWidth={3} 
                dot={{ r: 6, fill: '#FACC15', strokeWidth: 2, stroke: '#171717' }}
                activeDot={{ r: 8 }}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {reference && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card/40 border border-border rounded-2xl p-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Faixa Ouro (Performance)</p>
            <p className="text-xl font-display text-accent mt-1">
              {reference.valor_ouro_min} - {reference.valor_ouro_max} <span className="text-xs font-normal text-muted-foreground uppercase">{reference.unidade}</span>
            </p>
          </div>
          <div className="bg-card/40 border border-border rounded-2xl p-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Faixa Clínica (Normalidade)</p>
            <p className="text-xl font-display text-muted-foreground mt-1">
              {reference.valor_minimo} - {reference.valor_maximo} <span className="text-xs font-normal text-muted-foreground uppercase">{reference.unidade}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
