import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { FileSpreadsheet, Plus, Repeat, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CATEGORIA_LABEL, formatBRL, type Despesa, type DespesaOcorrencia } from "@/lib/meu-negocio-metrics";
import { useDespesasMutations, type NovaDespesa } from "@/hooks/use-despesas";
import { DespesaFormDialog } from "./DespesaFormDialog";
import { ImportarPlanilhaDialog } from "./ImportarPlanilhaDialog";

type Props = {
  tenantId: string;
  despesas: Despesa[];
  ocorrencias: DespesaOcorrencia[];
  porCategoria: { categoria: string; nome: string; valor: number }[];
  total: number;
};

const fmtData = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

export const DespesasSecao = ({ tenantId, despesas, ocorrencias, porCategoria, total }: Props) => {
  const { inserir, excluir, pararDeRepetir } = useDespesasMutations(tenantId);
  const [form, setForm] = useState(false);
  const [importar, setImportar] = useState(false);
  const [apagar, setApagar] = useState<Despesa | null>(null);

  const fixas = despesas.filter((d) => d.fixa);
  const avulsas = ocorrencias.filter((d) => !d.fixa).sort((a, b) => b.data.localeCompare(a.data));

  const salvar = async (d: NovaDespesa) => {
    try {
      await inserir.mutateAsync({ itens: [d], origem: "manual" });
      toast.success("Despesa lançada.");
      setForm(false);
    } catch (e) {
      console.error("[despesas] inserir", e);
      toast.error("Não foi possível salvar a despesa.");
    }
  };

  const importarItens = async (itens: NovaDespesa[]) => {
    try {
      const n = await inserir.mutateAsync({ itens, origem: "planilha" });
      toast.success(`${n} ${n === 1 ? "despesa importada" : "despesas importadas"}.`);
      setImportar(false);
    } catch (e) {
      console.error("[despesas] importar", e);
      toast.error("Não foi possível importar. Confira a planilha e tente de novo.");
    }
  };

  const confirmarApagar = async () => {
    if (!apagar) return;
    try {
      await excluir.mutateAsync(apagar.id);
      toast.success("Despesa apagada.");
    } catch (e) {
      console.error("[despesas] excluir", e);
      toast.error("Não foi possível apagar.");
    } finally {
      setApagar(null);
    }
  };

  const parar = async (d: Despesa) => {
    try {
      await pararDeRepetir.mutateAsync(d);
      toast.success("Não repete mais. Os meses anteriores continuam lançados.");
    } catch (e) {
      console.error("[despesas] parar", e);
      toast.error("Não foi possível alterar.");
    }
  };

  return (
    <section id="meu-negocio-despesas" className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-lg uppercase italic tracking-tight">Despesas</h2>
          <p className="text-xs text-muted-foreground">Total no período: <strong className="text-foreground">{formatBRL(total)}</strong> · <Link to="/site/admin/despesas" className="underline underline-offset-2 hover:text-foreground">Abrir tela de despesas</Link></p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button onClick={() => setForm(true)}><Plus className="mr-2 h-4 w-4" /> Lançar despesa</Button>
          <Button variant="outline" onClick={() => setImportar(true)}><FileSpreadsheet className="mr-2 h-4 w-4" /> Importar planilha</Button>
        </div>
      </div>

      {despesas.length === 0 ? (
        <p className="border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
          Lance suas despesas (aluguel, anúncio, equipamento, contador…) para ver lucro, margem, CAC e ponto de equilíbrio.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="border border-border bg-card p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Por categoria</p>
            {porCategoria.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma despesa no período.</p>
            ) : (
              <ul className="space-y-3">
                {porCategoria.map((c) => (
                  <li key={c.categoria}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-bold">{c.nome}</span>
                      <span>{formatBRL(c.valor)}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${total ? (c.valor / total) * 100 : 0}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            {fixas.length > 0 && (
              <div className="border border-border bg-card">
                <p className="p-3 pb-0 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Fixas (repetem todo mês)</p>
                <ul className="divide-y divide-border">
                  {fixas.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{d.descricao || CATEGORIA_LABEL[d.categoria]}</p>
                        <p className="text-xs text-muted-foreground">{CATEGORIA_LABEL[d.categoria]} · desde {fmtData(d.data)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="mr-1 text-sm">{formatBRL(d.valor_centavos)}</span>
                        <Button size="icon" variant="ghost" title="Parar de repetir" aria-label="Parar de repetir" disabled={pararDeRepetir.isPending} onClick={() => parar(d)}>
                          <Repeat className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Apagar" aria-label="Apagar" onClick={() => setApagar(d)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border border-border bg-card">
              <p className="p-3 pb-0 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lançamentos do período</p>
              {avulsas.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">Nenhum lançamento avulso no período.</p>
              ) : (
                <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                  {avulsas.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{d.descricao || CATEGORIA_LABEL[d.categoria]}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtData(d.data)} · {CATEGORIA_LABEL[d.categoria]}
                          {d.gasto_captacao && " · captação"}
                          {d.origem === "planilha" && " · planilha"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="mr-1 text-sm">{formatBRL(d.valor_centavos)}</span>
                        <Button size="icon" variant="ghost" title="Apagar" aria-label="Apagar" onClick={() => setApagar(d)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <DespesaFormDialog open={form} onOpenChange={setForm} salvando={inserir.isPending} onSalvar={salvar} />
      <ImportarPlanilhaDialog open={importar} onOpenChange={setImportar} importando={inserir.isPending} onImportar={importarItens} />

      <AlertDialog open={!!apagar} onOpenChange={(o) => !o && setApagar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar despesa?</AlertDialogTitle>
            <AlertDialogDescription>
              {apagar?.fixa
                ? "Ela sai de todos os meses. Se só quer parar de repetir daqui pra frente, use o botão de repetição."
                : "Ela sai das contas do painel."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarApagar}>Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};
