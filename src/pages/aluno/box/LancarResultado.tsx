import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { scoreIsRounds } from "@/lib/box-wod";
import { boxDb, useBoxMutation, type BoxResultado, type BoxWod } from "@/hooks/use-box";

export default function LancarResultado({ wod, alunoId, existente, tempoSugerido }: {
  wod: BoxWod; alunoId: string; existente?: BoxResultado; tempoSugerido?: number | null;
}) {
  const porRounds = scoreIsRounds(wod.formato);
  const [escala, setEscala] = useState<"rx" | "scaled">(existente?.escala ?? "rx");
  const [min, setMin] = useState(""); const [seg, setSeg] = useState("");
  const [rounds, setRounds] = useState(existente?.rounds?.toString() ?? "");
  const [reps, setReps] = useState(existente?.reps?.toString() ?? "");
  const [carga, setCarga] = useState(existente?.carga_kg?.toString() ?? "");

  useEffect(() => {
    const t = existente?.tempo_seg ?? tempoSugerido;
    if (t != null) { setMin(String(Math.floor(t / 60))); setSeg(String(t % 60)); }
  }, [existente?.tempo_seg, tempoSugerido]);

  const salvar = useBoxMutation(async () => {
    const tempo = !porRounds && (min || seg) ? Number(min || 0) * 60 + Number(seg || 0) : null;
    const row = {
      tenant_id: wod.tenant_id, wod_id: wod.id, aluno_id: alunoId, escala,
      tempo_seg: tempo,
      rounds: rounds ? Number(rounds) : null,
      reps: reps ? Number(reps) : null,
      carga_kg: carga ? Number(carga) : null,
    };
    if (porRounds && row.rounds == null && row.reps == null) throw new Error("Informe rounds e reps");
    if (!porRounds && tempo == null && row.reps == null && row.rounds == null) throw new Error("Informe o tempo (ou reps se estourou o cap)");
    const { error } = await boxDb.from("box_resultados").upsert(row, { onConflict: "wod_id,aluno_id" });
    if (error) throw error;
    if (wod.benchmark_nome) {
      await boxDb.from("box_benchmark_prs").insert({
        tenant_id: wod.tenant_id, aluno_id: alunoId, benchmark: wod.benchmark_nome, escala,
        resultado: porRounds ? `${row.rounds ?? 0} rds + ${row.reps ?? 0}` : tempo != null ? `${Math.floor(tempo / 60)}:${String(tempo % 60).padStart(2, "0")}` : `CAP ${row.reps ?? 0} reps`,
        data: wod.data,
      });
    }
  }, ["box-resultados", "box-prs"]);

  return (
    <div className="border border-border bg-card p-4 space-y-3">
      <p className="font-display uppercase tracking-wide">{existente ? "Editar resultado" : "Lançar resultado"}</p>
      <div className="grid grid-cols-2 gap-2">
        {(["rx", "scaled"] as const).map((e) => (
          <button key={e} type="button" onClick={() => setEscala(e)}
            className={`border py-2 text-sm font-bold uppercase ${escala === e ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>
            {e === "rx" ? "Rx" : "Scaled"}
          </button>
        ))}
      </div>
      {!porRounds && (
        <div>
          <Label className="text-xs">Tempo</Label>
          <div className="flex gap-2 items-center">
            <Input className="rounded-none" inputMode="numeric" placeholder="min" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} />
            <span>:</span>
            <Input className="rounded-none" inputMode="numeric" placeholder="seg" value={seg} onChange={(e) => setSeg(e.target.value.replace(/\D/g, ""))} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Estourou o cap? Deixe o tempo vazio e informe rounds/reps.</p>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        <div><Label className="text-xs">Rounds</Label><Input className="rounded-none" inputMode="numeric" value={rounds} onChange={(e) => setRounds(e.target.value.replace(/\D/g, ""))} /></div>
        <div><Label className="text-xs">Reps</Label><Input className="rounded-none" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value.replace(/\D/g, ""))} /></div>
        <div><Label className="text-xs">Carga (kg)</Label><Input className="rounded-none" inputMode="decimal" value={carga} onChange={(e) => setCarga(e.target.value.replace(/[^\d.,]/g, "").replace(",", "."))} /></div>
      </div>
      <Button className="w-full rounded-none" disabled={salvar.isPending}
        onClick={() => salvar.mutate(undefined as any, { onSuccess: () => toast.success("Resultado salvo"), onError: (e: any) => toast.error(e.message) })}>
        Salvar resultado
      </Button>
    </div>
  );
}
