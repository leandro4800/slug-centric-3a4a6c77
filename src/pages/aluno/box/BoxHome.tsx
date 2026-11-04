import { useState } from "react";
import { useBranding } from "@/contexts/BrandingProvider";
import { useAuth } from "@/hooks/use-auth";
import { formatoLabel, fmtTempo } from "@/lib/box-wod";
import { hojeISO, useBoxResultados, useBoxTurmas, useBoxWods, useTenantMembros } from "@/hooks/use-box";
import WodTimer from "./WodTimer";
import LancarResultado from "./LancarResultado";
import RankingDia from "./RankingDia";
import BenchmarkPrs from "./BenchmarkPrs";
import { Loader2 } from "lucide-react";

/** Tela do aluno de CrossFit: WOD do dia da turma. */
export default function BoxHome() {
  const { tenant } = useBranding();
  const { user } = useAuth();
  const tenantId = tenant?.id;
  const hoje = hojeISO();
  const { data: turmas = [] } = useBoxTurmas(tenantId);
  const { data: wods = [], isLoading } = useBoxWods(tenantId, hoje, hoje);
  const [turmaSel, setTurmaSel] = useState<string | null>(null);
  const [tempoTimer, setTempoTimer] = useState<number | null>(null);
  const wod = wods.find((w) => w.turma_id === turmaSel) ?? wods[0];
  const { data: resultados = [] } = useBoxResultados(wod ? [wod.id] : []);
  const { data: nomes = {} } = useTenantMembros(tenantId);
  const meu = resultados.find((r) => r.aluno_id === user?.id);

  return (
    <div className="min-h-screen bg-background pb-28 px-4 pt-6 space-y-4 max-w-xl mx-auto">
      <header>
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">Box</p>
        <h1 className="font-display text-3xl uppercase">WOD do dia</h1>
        <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
      </header>

      {wods.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {wods.map((w) => (
            <button key={w.id} onClick={() => setTurmaSel(w.turma_id)}
              className={`border px-3 py-1 text-xs font-bold uppercase whitespace-nowrap ${wod?.id === w.id ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
              {turmas.find((t) => t.id === w.turma_id)?.nome ?? "Turma"}
            </button>
          ))}
        </div>
      )}

      {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /> : !wod ? (
        <div className="border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          {turmas.length === 0 ? "Você ainda não está em nenhuma turma. Fale com seu coach." : "O WOD de hoje ainda não foi publicado."}
        </div>
      ) : (
        <>
          {wod.aquecimento && <Bloco titulo="Aquecimento"><p className="whitespace-pre-line">{wod.aquecimento}</p></Bloco>}
          {Array.isArray(wod.forca_skill) ? wod.forca_skill.length > 0 && (
            <Bloco titulo="Força / Skill">{wod.forca_skill.map((f: any, i: number) => <p key={i}>{typeof f === "string" ? f : f.texto}</p>)}</Bloco>
          ) : wod.forca_skill && <Bloco titulo="Força / Skill"><p>{String(wod.forca_skill)}</p></Bloco>}
          <Bloco titulo={`WOD · ${formatoLabel(wod.formato)}${wod.time_cap_seg ? ` · cap ${fmtTempo(wod.time_cap_seg)}` : ""}${wod.rounds ? ` · ${wod.rounds} rounds` : ""}`}>
            {wod.titulo && <p className="font-bold text-primary uppercase">{wod.titulo}</p>}
            <div className="grid grid-cols-2 gap-x-3 text-[10px] uppercase tracking-widest text-muted-foreground mt-2"><span>Rx</span><span>Scaled</span></div>
            {(wod.movimentos || []).map((m, i) => (
              <div key={i} className="grid grid-cols-2 gap-x-3 border-b border-border/40 py-1.5"><span>{m.rx}</span><span className="text-muted-foreground">{m.scaled}</span></div>
            ))}
          </Bloco>
          {wod.acessorio && <Bloco titulo="Acessório"><p className="whitespace-pre-line">{wod.acessorio}</p></Bloco>}

          <WodTimer wodId={wod.id} formato={wod.formato} timeCapSeg={wod.time_cap_seg} rounds={wod.rounds} onStop={setTempoTimer} />
          {user && <LancarResultado key={wod.id + (meu?.id ?? "")} wod={wod} alunoId={user.id} existente={meu} tempoSugerido={tempoTimer} />}
          <RankingDia formato={wod.formato} resultados={resultados} nomes={nomes} destaque={user?.id} />
        </>
      )}
      <BenchmarkPrs tenantId={tenantId} alunoId={user?.id} />
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="border border-border bg-card p-4 text-sm space-y-1">
      <p className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold mb-1">{titulo}</p>
      {children}
    </section>
  );
}
