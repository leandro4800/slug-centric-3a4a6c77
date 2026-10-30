import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useAthletePanelData } from "@/hooks/use-athlete-panel-data";
import { CheckInModal } from "@/components/aluno/evolucao/CheckInModal";
import { HistoricoCheckins } from "@/components/aluno/evolucao/HistoricoCheckins";
import { Button } from "@/components/ui/button";
import { AtletaMetricChart, panelDate } from "./AtletaMetricChart";

export default function AtletaEvolucao() {
  const { data, isLoading, error, refetch } = useAthletePanelData();
  const [revision, setRevision] = useState(0);
  const refresh = () => { setRevision(r => r + 1); void refetch(); };
  return <div className="space-y-6"><header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="font-display text-3xl tracking-normal">Evolução e fotos</h1><p className="mt-1 text-sm text-muted-foreground">Medidas e registros de acompanhamento</p></div><CheckInModal onSaved={refresh} /></header>
    {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : error ? <div role="alert"><p>Não foi possível carregar sua evolução.</p><Button variant="outline" onClick={() => refetch()}><RefreshCw /> Tentar novamente</Button></div> : <>
      <section className="grid gap-6 xl:grid-cols-2">{([{ field: "peso_kg", title: "Peso corporal", unit: "kg" }, { field: "bf_percentual", title: "Gordura corporal", unit: "%" }] as const).map(metric => <div key={metric.field} className="min-w-0 border-y border-border py-5"><h2 className="font-display text-xl tracking-normal">{metric.title}</h2><AtletaMetricChart data={(data?.checkins || []).filter(c => c[metric.field] != null).map(c => ({ date: c.data_checkin, value: Number(c[metric.field]) }))} label={metric.title} unit={metric.unit} /></div>)}</section>
      <section><h2 className="mb-4 font-display text-xl tracking-normal">Fotos de evolução</h2>{data?.photos.length ? <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{data.photos.map(photo => <figure key={photo.id} className="overflow-hidden rounded-md border border-border bg-card"><img src={photo.url} alt={`Foto de ${photo.side} em ${panelDate(photo.date)}`} loading="lazy" className="aspect-[3/4] w-full object-contain" /><figcaption className="p-3 text-xs text-muted-foreground">{panelDate(photo.date)} · {photo.side}</figcaption></figure>)}</div> : <p className="text-sm text-muted-foreground">Nenhuma foto registrada ainda.</p>}</section>
      <section><h2 className="mb-4 font-display text-xl tracking-normal">Registros de medidas e fotos</h2><HistoricoCheckins refreshKey={revision} onChanged={refresh} /></section>
    </>}
  </div>;
}