import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, Loader2, Plus, Receipt, Trash2 } from "lucide-react";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { useDespesas, useDespesasMutations, type NovaDespesa } from "@/hooks/use-despesas";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { CATEGORIA_LABEL, custoFixoMensal, despesasMensais, formatBRL, type Despesa } from "@/lib/meu-negocio-metrics";
import { DespesasGraficoMensal } from "@/components/site-admin/meu-negocio/DespesasGraficoMensal";
import { CustosFixosSecao } from "@/components/site-admin/meu-negocio/CustosFixosSecao";
import { DespesaFormDialog } from "@/components/site-admin/meu-negocio/DespesaFormDialog";
import { ImportarPlanilhaDialog } from "@/components/site-admin/meu-negocio/ImportarPlanilhaDialog";

const fmtData = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};
const nomeMes = (k: string) => {
  const [y, m] = k.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};

const Despesas = () => {
  const { tenant, loading } = useSiteTenant();
  const { data: despesas, isLoading, error, refetch } = useDespesas(tenant?.id);
  const { inserir, excluir } = useDespesasMutations(tenant?.id);
  const [form, setForm] = useState(false);
  const [importar, setImportar] = useState(false);
  const [apagar, setApagar] = useState<Despesa | null>(null);

  const lista = despesas ?? [];
  const mensal = useMemo(() => despesasMensais(lista, 12), [lista]);
  const [mesSel, setMesSel] = useState<string | null>(null);
  const mesAtual = mensal[mensal.length - 1];
  const mesEscolhido = mesSel ?? mesAtual?.key;
  const fixas = useMemo(() => lista.filter((d) => d.fixa), [lista]);
  const fixoMes = custoFixoMensal(lista);
  const media = mensal.length ? Math.round(mensal.reduce((s, m) => s + m.total, 0) / mensal.length) : 0;
  const avulsasMes = useMemo(
    () => lista.filter((d) => !d.fixa && d.data.slice(0, 7) === mesEscolhido).sort((a, b) => b.data.localeCompare(a.data)),
    [lista, mesEscolhido],
  );

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

  if (loading || (isLoading && !despesas)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <AdminBackButton to="/site/admin/meu-negocio" />
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Gestão</p>
          <h1 className="flex items-center gap-3 font-display text-3xl uppercase italic tracking-tighter md:text-4xl">
            <Receipt className="h-7 w-7 text-primary" /> Despesas
          </h1>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button onClick={() => setForm(true)}><Plus className="h-4 w-4" /> Lançar despesa</Button>
          <Button variant="outline" onClick={() => setImportar(true)}><FileSpreadsheet className="h-4 w-4" /> Importar planilha</Button>
        </div>
      </div>

      {error ? (
        <div className="space-y-3 border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Não conseguimos carregar as despesas agora.</p>
          <Button variant="outline" onClick={() => refetch()}>Tentar novamente</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="border border-border bg-card p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Este mês</p>
              <p className="font-display text-3xl tracking-tight">{formatBRL(mesAtual?.total ?? 0)}</p>
            </div>
            <div className="border border-border bg-card p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Custos fixos por mês</p>
              <p className="font-display text-3xl tracking-tight">{formatBRL(fixoMes)}</p>
            </div>
            <div className="border border-border bg-card p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Média mensal (12 meses)</p>
              <p className="font-display text-3xl tracking-tight">{formatBRL(media)}</p>
            </div>
          </div>

          <DespesasGraficoMensal dados={mensal} />

          <CustosFixosSecao tenantId={tenant!.id} fixas={fixas} total={fixoMes} onApagar={setApagar} />

          <section className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-lg uppercase italic tracking-tight">Lançamentos avulsos</h2>
                <p className="text-xs text-muted-foreground">Gastos que não se repetem todo mês.</p>
              </div>
              <Select value={mesEscolhido} onValueChange={setMesSel}>
                <SelectTrigger className="w-full sm:w-56" aria-label="Mês"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[...mensal].reverse().map((m) => (
                    <SelectItem key={m.key} value={m.key}>{nomeMes(m.key)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {avulsasMes.length === 0 ? (
              <p className="border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">Nenhum lançamento avulso neste mês.</p>
            ) : (
              <ul className="divide-y divide-border border border-border bg-card">
                {avulsasMes.map((d) => (
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
          </section>
        </>
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
    </div>
  );
};

export default Despesas;
