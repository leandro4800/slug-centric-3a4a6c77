import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Repeat, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIAS_DESPESA, CATEGORIA_LABEL, formatBRL, type CategoriaDespesa, type Despesa } from "@/lib/meu-negocio-metrics";
import { valorEmCentavos } from "@/lib/despesas-planilha";
import { useDespesasMutations } from "@/hooks/use-despesas";

const mesAtual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const fmtMes = (iso: string) => {
  const [y, m] = iso.slice(0, 7).split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "");
};

type Props = { tenantId: string; fixas: Despesa[]; total: number; onApagar: (d: Despesa) => void };

/** Lançamento direto de custos fixos (repetem todo mês), sem planilha. */
export const CustosFixosSecao = ({ tenantId, fixas, total, onApagar }: Props) => {
  const { inserir, pararDeRepetir } = useDespesasMutations(tenantId);
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<CategoriaDespesa>("aluguel_academia");
  const [valor, setValor] = useState("");
  const [desde, setDesde] = useState(mesAtual());
  const [captacao, setCaptacao] = useState(false);

  const adicionar = async (e: React.FormEvent) => {
    e.preventDefault();
    const centavos = valorEmCentavos(valor);
    if (!centavos) return toast.error("Informe um valor maior que zero.");
    if (!/^\d{4}-\d{2}$/.test(desde)) return toast.error("Informe o mês de início.");
    try {
      await inserir.mutateAsync({
        itens: [{ categoria, valor_centavos: centavos, data: `${desde}-01`, descricao: descricao.trim() || null, fixa: true, gasto_captacao: captacao }],
        origem: "manual",
      });
      toast.success("Custo fixo adicionado. Ele entra em todos os meses a partir do início.");
      setDescricao("");
      setValor("");
      setCaptacao(false);
    } catch (err) {
      console.error("[custos-fixos] inserir", err);
      toast.error("Não foi possível salvar.");
    }
  };

  const parar = async (d: Despesa) => {
    try {
      await pararDeRepetir.mutateAsync(d);
      toast.success("Não repete mais. Os meses anteriores continuam lançados.");
    } catch (err) {
      console.error("[custos-fixos] parar", err);
      toast.error("Não foi possível alterar.");
    }
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-lg uppercase italic tracking-tight">Custos fixos</h2>
        <p className="text-xs text-muted-foreground">
          Repetem todo mês. Hoje somam <strong className="text-foreground">{formatBRL(total)}</strong> por mês.
        </p>
      </div>

      <form onSubmit={adicionar} className="grid gap-3 border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
        <div className="space-y-1 lg:col-span-2">
          <Label htmlFor="cf-desc">Descrição</Label>
          <Input id="cf-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Aluguel da sala" maxLength={120} />
        </div>
        <div className="space-y-1">
          <Label>Categoria</Label>
          <Select
            value={categoria}
            onValueChange={(v) => {
              setCategoria(v as CategoriaDespesa);
              setCaptacao(v === "anuncio");
            }}
          >
            <SelectTrigger aria-label="Categoria"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIAS_DESPESA.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cf-valor">Valor por mês (R$)</Label>
          <Input id="cf-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cf-desde">Desde</Label>
          <Input id="cf-desde" type="month" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <Button type="submit" disabled={inserir.isPending}>
          {inserir.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Adicionar
        </Button>
        <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-6">
          <Switch id="cf-captacao" checked={captacao} onCheckedChange={setCaptacao} />
          <Label htmlFor="cf-captacao" className="text-xs font-normal text-muted-foreground">Gasto para atrair alunos (entra no CAC)</Label>
        </div>
      </form>

      {fixas.length === 0 ? (
        <p className="border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">Nenhum custo fixo ainda.</p>
      ) : (
        <ul className="divide-y divide-border border border-border bg-card">
          {fixas.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{d.descricao || CATEGORIA_LABEL[d.categoria]}</p>
                <p className="text-xs text-muted-foreground">
                  {CATEGORIA_LABEL[d.categoria]} · desde {fmtMes(d.data)}
                  {d.gasto_captacao && " · captação"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="mr-1 text-sm">{formatBRL(d.valor_centavos)}/mês</span>
                <Button size="icon" variant="ghost" title="Parar de repetir" aria-label="Parar de repetir" disabled={pararDeRepetir.isPending} onClick={() => parar(d)}>
                  <Repeat className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" title="Apagar" aria-label="Apagar" onClick={() => onApagar(d)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
