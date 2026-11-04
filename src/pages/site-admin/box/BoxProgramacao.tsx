import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { boxDb, useBoxMutation, useBoxPresets, useBoxTurmas, useBoxWods, type BoxWod } from "@/hooks/use-box";
import { WOD_FORMATOS, formatoLabel } from "@/lib/box-wod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const segundaDaSemana = (d: Date) => { const x = new Date(d); const dia = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dia); return x; };

type Form = { id?: string; data: string; titulo: string; aquecimento: string; forca: string; acessorio: string; formato: string; cap: string; rounds: string; benchmark: string; movimentos: { rx: string; scaled: string }[]; publicado: boolean };
const vazio = (data: string): Form => ({ data, titulo: "", aquecimento: "", forca: "", acessorio: "", formato: "FOR_TIME", cap: "", rounds: "", benchmark: "", movimentos: [{ rx: "", scaled: "" }], publicado: true });

export default function BoxProgramacao() {
  const { tenant } = useSiteTenant();
  const tenantId = tenant?.id;
  const { data: turmas = [] } = useBoxTurmas(tenantId);
  const [turmaId, setTurmaId] = useState<string>("");
  const turma = turmaId || turmas[0]?.id || "";
  const [ini, setIni] = useState(segundaDaSemana(new Date()));
  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(ini); d.setDate(d.getDate() + i); return d; }), [ini]);
  const { data: wods = [] } = useBoxWods(tenantId, iso(dias[0]), iso(dias[6]), turma || null);
  const { data: presets = [] } = useBoxPresets();
  const [form, setForm] = useState<Form | null>(null);
  const [nivel, setNivel] = useState("intermediario"); const [freq, setFreq] = useState(3);

  const editar = (data: string, w?: BoxWod) => setForm(w ? {
    id: w.id, data, titulo: w.titulo ?? "", aquecimento: w.aquecimento ?? "", acessorio: w.acessorio ?? "", formato: w.formato,
    forca: Array.isArray(w.forca_skill) ? w.forca_skill.map((f: any) => (typeof f === "string" ? f : f.texto)).join("\n") : "",
    cap: w.time_cap_seg ? String(Math.round(w.time_cap_seg / 60)) : "", rounds: w.rounds?.toString() ?? "", benchmark: w.benchmark_nome ?? "",
    movimentos: w.movimentos?.length ? w.movimentos : [{ rx: "", scaled: "" }], publicado: w.publicado,
  } : vazio(data));

  const toRow = (f: Form) => ({
    tenant_id: tenantId, turma_id: turma, data: f.data, titulo: f.titulo || null, aquecimento: f.aquecimento || null,
    forca_skill: f.forca.split("\n").map((s) => s.trim()).filter(Boolean), acessorio: f.acessorio || null, formato: f.formato,
    time_cap_seg: f.cap ? Number(f.cap) * 60 : null, rounds: f.rounds ? Number(f.rounds) : null, benchmark_nome: f.benchmark || null,
    movimentos: f.movimentos.filter((m) => m.rx.trim() || m.scaled.trim()), publicado: f.publicado,
  });

  const salvar = useBoxMutation(async (f: Form) => {
    const { error } = f.id ? await boxDb.from("box_wods").update(toRow(f)).eq("id", f.id) : await boxDb.from("box_wods").insert(toRow(f));
    if (error) throw error;
  }, ["box-wods"]);
  const apagar = useBoxMutation(async (id: string) => { const { error } = await boxDb.from("box_wods").delete().eq("id", id); if (error) throw error; }, ["box-wods"]);
  const aplicarPreset = useBoxMutation(async () => {
    const p = presets.find((x) => x.nivel === nivel && x.frequencia === freq);
    if (!p) throw new Error("Preset não encontrado");
    const diasTreino = [[0, 2, 4], [0, 1, 3, 4], [0, 1, 2, 3, 4]][freq - 3];
    const rows = p.semana.map((d: any, i: number) => ({
      tenant_id: tenantId, turma_id: turma, data: iso(dias[diasTreino[i]]), titulo: d.titulo, aquecimento: d.aquecimento,
      forca_skill: [d.forca_skill], acessorio: d.acessorio, formato: d.formato, time_cap_seg: d.time_cap_min * 60, movimentos: d.movimentos, publicado: true,
    }));
    const { error } = await boxDb.from("box_wods").upsert(rows, { onConflict: "turma_id,data" });
    if (error) throw error;
  }, ["box-wods"]);
  const onErr = (e: any) => toast.error(e.message);

  if (turmas.length === 0) return <div className="p-8 text-sm text-muted-foreground">Crie uma turma primeiro em Box › Turmas.</div>;

  return (
    <div className="p-4 md:p-8 space-y-5 max-w-6xl">
      <h1 className="font-display text-3xl uppercase">Programação semanal</h1>
      <div className="flex flex-wrap items-center gap-2">
        <select className="bg-background border border-border px-2 py-2 text-sm" value={turma} onChange={(e) => setTurmaId(e.target.value)}>
          {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <Button size="icon" variant="outline" className="rounded-none" onClick={() => { const d = new Date(ini); d.setDate(d.getDate() - 7); setIni(d); }}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-sm">{dias[0].toLocaleDateString("pt-BR")} – {dias[6].toLocaleDateString("pt-BR")}</span>
        <Button size="icon" variant="outline" className="rounded-none" onClick={() => { const d = new Date(ini); d.setDate(d.getDate() + 7); setIni(d); }}><ChevronRight className="h-4 w-4" /></Button>
        <span className="ml-auto flex items-center gap-2 text-sm">
          Preset:
          <select className="bg-background border border-border px-2 py-2" value={nivel} onChange={(e) => setNivel(e.target.value)}>
            <option value="iniciante">Iniciante</option><option value="intermediario">Intermediário</option><option value="avancado">Avançado</option>
          </select>
          <select className="bg-background border border-border px-2 py-2" value={freq} onChange={(e) => setFreq(Number(e.target.value))}>
            <option value={3}>3x</option><option value={4}>4x</option><option value={5}>5x</option>
          </select>
          <Button className="rounded-none" variant="secondary" onClick={() => confirm("Aplicar preset nesta semana? WODs dos mesmos dias serão substituídos.") && aplicarPreset.mutate(undefined as any, { onSuccess: () => toast.success("Preset aplicado"), onError: onErr })}>Aplicar</Button>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {dias.map((d) => {
          const w = wods.find((x) => x.data === iso(d));
          return (
            <button key={iso(d)} onClick={() => editar(iso(d), w)} className={`border p-3 text-left min-h-[110px] ${w ? "border-primary/50 bg-card" : "border-border border-dashed"}`}>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" })}</p>
              {w ? (<><p className="font-bold text-sm text-primary">{formatoLabel(w.formato)}</p><p className="text-xs line-clamp-3">{w.titulo || w.movimentos?.[0]?.rx}</p>{!w.publicado && <p className="text-[10px] text-muted-foreground">rascunho</p>}</>)
                : <Plus className="h-4 w-4 text-muted-foreground mt-3" />}
            </button>
          );
        })}
      </div>

      {form && (
        <div className="border border-border bg-card p-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="font-display uppercase">WOD de {new Date(form.data + "T12:00").toLocaleDateString("pt-BR")}</p>
            {form.id && <Button size="sm" variant="ghost" className="rounded-none" onClick={() => apagar.mutate(form.id!, { onSuccess: () => setForm(null), onError: onErr })}><Trash2 className="h-4 w-4 mr-1" />Apagar</Button>}
          </div>
          <div><Label>Aquecimento</Label><Textarea className="rounded-none" value={form.aquecimento} onChange={(e) => setForm({ ...form, aquecimento: e.target.value })} /></div>
          <div><Label>Força / Skill (uma linha por item)</Label><Textarea className="rounded-none" value={form.forca} onChange={(e) => setForm({ ...form, forca: e.target.value })} /></div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div className="md:col-span-2"><Label>Título do WOD</Label><Input className="rounded-none" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
            <div><Label>Formato</Label>
              <select className="w-full bg-background border border-border px-2 py-2 text-sm" value={form.formato} onChange={(e) => setForm({ ...form, formato: e.target.value })}>
                {WOD_FORMATOS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select></div>
            <div><Label>Time cap (min)</Label><Input className="rounded-none" inputMode="numeric" value={form.cap} onChange={(e) => setForm({ ...form, cap: e.target.value.replace(/\D/g, "") })} /></div>
            <div><Label>Rounds</Label><Input className="rounded-none" inputMode="numeric" value={form.rounds} onChange={(e) => setForm({ ...form, rounds: e.target.value.replace(/\D/g, "") })} /></div>
          </div>
          <div><Label>Movimentos (Rx / Scaled)</Label>
            {form.movimentos.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 mt-1">
                <Input className="rounded-none" placeholder="Rx" value={m.rx} onChange={(e) => { const mv = [...form.movimentos]; mv[i] = { ...m, rx: e.target.value }; setForm({ ...form, movimentos: mv }); }} />
                <Input className="rounded-none" placeholder="Scaled" value={m.scaled} onChange={(e) => { const mv = [...form.movimentos]; mv[i] = { ...m, scaled: e.target.value }; setForm({ ...form, movimentos: mv }); }} />
                <Button size="icon" variant="ghost" className="rounded-none" onClick={() => setForm({ ...form, movimentos: form.movimentos.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button size="sm" variant="outline" className="rounded-none mt-2" onClick={() => setForm({ ...form, movimentos: [...form.movimentos, { rx: "", scaled: "" }] })}><Plus className="h-4 w-4 mr-1" />Movimento</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div><Label>Acessório</Label><Textarea className="rounded-none" value={form.acessorio} onChange={(e) => setForm({ ...form, acessorio: e.target.value })} /></div>
            <div><Label>Benchmark (opcional, ex: Fran)</Label><Input className="rounded-none" value={form.benchmark} onChange={(e) => setForm({ ...form, benchmark: e.target.value })} />
              <label className="flex items-center gap-2 text-sm mt-3"><input type="checkbox" checked={form.publicado} onChange={(e) => setForm({ ...form, publicado: e.target.checked })} />Publicado para os alunos</label></div>
          </div>
          <div className="flex gap-2">
            <Button className="rounded-none" disabled={salvar.isPending} onClick={() => salvar.mutate(form, { onSuccess: () => { toast.success("WOD salvo"); setForm(null); }, onError: onErr })}>Salvar WOD</Button>
            <Button className="rounded-none" variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
