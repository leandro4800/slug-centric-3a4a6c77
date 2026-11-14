import { SemaforoDot } from "./Semaforo";
import type { Semaforo } from "@/lib/meu-negocio-metrics";

export type Indicador = { titulo: string; valor: string; cor: Semaforo; frase: string };

export const Indicadores = ({ itens }: { itens: Indicador[] }) => (
  <section>
    <h2 className="mb-3 font-display text-lg uppercase italic tracking-tight">Indicadores</h2>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {itens.map((i) => (
        <div key={i.titulo} className="border border-border bg-card p-4">
          <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <SemaforoDot cor={i.cor} /> {i.titulo}
          </p>
          <p className="font-display text-2xl tracking-tight">{i.valor}</p>
          <p className="mt-1 text-xs text-muted-foreground">{i.frase}</p>
        </div>
      ))}
    </div>
  </section>
);
