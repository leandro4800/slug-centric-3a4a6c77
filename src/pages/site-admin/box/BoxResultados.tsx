import { useState } from "react";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { hojeISO, useBoxResultados, useBoxTurmas, useBoxWods, useTenantMembros } from "@/hooks/use-box";
import { formatoLabel } from "@/lib/box-wod";
import { Input } from "@/components/ui/input";
import RankingDia from "@/pages/aluno/box/RankingDia";

export default function BoxResultados() {
  const { tenant } = useSiteTenant();
  const tenantId = tenant?.id;
  const [data, setData] = useState(hojeISO());
  const { data: turmas = [] } = useBoxTurmas(tenantId);
  const { data: wods = [] } = useBoxWods(tenantId, data, data);
  const { data: resultados = [] } = useBoxResultados(wods.map((w) => w.id));
  const { data: nomes = {} } = useTenantMembros(tenantId);

  return (
    <div className="p-4 md:p-8 space-y-5 max-w-4xl">
      <h1 className="font-display text-3xl uppercase">Resultados</h1>
      <Input type="date" className="rounded-none max-w-[200px]" value={data} onChange={(e) => setData(e.target.value)} />
      {wods.length === 0 && <p className="text-sm text-muted-foreground">Nenhum WOD nesta data.</p>}
      {wods.map((w) => (
        <div key={w.id} className="space-y-2">
          <p className="font-display uppercase">{turmas.find((t) => t.id === w.turma_id)?.nome} · {formatoLabel(w.formato)} {w.titulo && `· ${w.titulo}`}</p>
          <RankingDia formato={w.formato} resultados={resultados.filter((r) => r.wod_id === w.id)} nomes={nomes} />
        </div>
      ))}
    </div>
  );
}
