import { useState } from "react";
import { toast } from "sonner";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { boxDb, useBoxMutation, useBoxTurmaAlunos, useBoxTurmas, useTenantMembros } from "@/hooks/use-box";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, X } from "lucide-react";

export default function BoxTurmas() {
  const { tenant } = useSiteTenant();
  const tenantId = tenant?.id;
  const { data: turmas = [] } = useBoxTurmas(tenantId);
  const { data: matriculas = [] } = useBoxTurmaAlunos(tenantId);
  const { data: membros = {} } = useTenantMembros(tenantId);
  const [nome, setNome] = useState(""); const [horario, setHorario] = useState("");
  const keys = ["box-turmas", "box-turma-alunos"];
  const onErr = (e: any) => toast.error(e.message);

  const criar = useBoxMutation(async () => {
    const { error } = await boxDb.from("box_turmas").insert({ tenant_id: tenantId, nome: nome.trim(), horario: horario.trim() || null });
    if (error) throw error;
  }, keys);
  const apagar = useBoxMutation(async (id: string) => { const { error } = await boxDb.from("box_turmas").delete().eq("id", id); if (error) throw error; }, keys);
  const addAluno = useBoxMutation(async (v: { turma_id: string; aluno_id: string }) => {
    const { error } = await boxDb.from("box_turma_alunos").insert({ tenant_id: tenantId, ...v }); if (error) throw error;
  }, keys);
  const remAluno = useBoxMutation(async (id: string) => { const { error } = await boxDb.from("box_turma_alunos").delete().eq("id", id); if (error) throw error; }, keys);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl">
      <h1 className="font-display text-3xl uppercase">Turmas</h1>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (!nome.trim()) return; criar.mutate(undefined as any, { onSuccess: () => { setNome(""); setHorario(""); toast.success("Turma criada"); }, onError: onErr }); }}>
        <Input className="rounded-none max-w-xs" placeholder="Nome (ex: Turma 6h)" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Input className="rounded-none max-w-[140px]" placeholder="Horário" value={horario} onChange={(e) => setHorario(e.target.value)} />
        <Button className="rounded-none" type="submit">Criar turma</Button>
      </form>
      {turmas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma turma ainda.</p>}
      {turmas.map((t) => {
        const daTurma = matriculas.filter((m) => m.turma_id === t.id);
        const disponiveis = Object.entries(membros).filter(([id]) => !daTurma.some((m) => m.aluno_id === id));
        return (
          <div key={t.id} className="border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-display uppercase text-lg">{t.nome} {t.horario && <span className="text-sm text-muted-foreground">· {t.horario}</span>}</p>
              <Button size="icon" variant="ghost" className="rounded-none" onClick={() => confirm("Apagar turma e seus WODs?") && apagar.mutate(t.id, { onError: onErr })}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {daTurma.map((m) => (
                <span key={m.id} className="border border-border px-2 py-1 text-xs flex items-center gap-1">
                  {membros[m.aluno_id]?.nome ?? "Aluno"}
                  <button onClick={() => remAluno.mutate(m.id, { onError: onErr })}><X className="h-3 w-3" /></button>
                </span>
              ))}
              {daTurma.length === 0 && <span className="text-xs text-muted-foreground">Sem alunos.</span>}
            </div>
            <select className="bg-background border border-border px-2 py-1 text-sm" value="" onChange={(e) => e.target.value && addAluno.mutate({ turma_id: t.id, aluno_id: e.target.value }, { onError: onErr })}>
              <option value="">+ Adicionar aluno</option>
              {disponiveis.map(([id, m]) => <option key={id} value={id}>{m.nome}</option>)}
            </select>
          </div>
        );
      })}
    </div>
  );
}
