import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIAS_DESPESA, type CategoriaDespesa } from "@/lib/meu-negocio-metrics";
import { valorEmCentavos } from "@/lib/despesas-planilha";
import type { NovaDespesa } from "@/hooks/use-despesas";

const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  salvando: boolean;
  onSalvar: (d: NovaDespesa) => Promise<void>;
};

export const DespesaFormDialog = ({ open, onOpenChange, salvando, onSalvar }: Props) => {
  const [categoria, setCategoria] = useState<CategoriaDespesa>("aluguel_academia");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hoje());
  const [descricao, setDescricao] = useState("");
  const [fixa, setFixa] = useState(false);
  const [captacao, setCaptacao] = useState(false);

  useEffect(() => {
    if (open) {
      setCategoria("aluguel_academia");
      setValor("");
      setData(hoje());
      setDescricao("");
      setFixa(false);
      setCaptacao(false);
    }
  }, [open]);

  const trocarCategoria = (c: CategoriaDespesa) => {
    setCategoria(c);
    setCaptacao(c === "anuncio");
  };

  const salvar = async () => {
    const centavos = valorEmCentavos(valor);
    if (!centavos) return toast.error("Informe um valor maior que zero.");
    if (!data) return toast.error("Informe a data.");
    await onSalvar({
      categoria,
      valor_centavos: centavos,
      data,
      descricao: descricao.trim() || null,
      fixa,
      gasto_captacao: captacao,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display uppercase italic tracking-tight">Lançar despesa</DialogTitle>
          <DialogDescription>Quanto você gastou e com o quê.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={categoria} onValueChange={(v) => trocarCategoria(v as CategoriaDespesa)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS_DESPESA.map((c) => (
                  <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="desp-valor">Valor (R$)</Label>
              <Input id="desp-valor" inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desp-data">Data</Label>
              <Input id="desp-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desp-desc">Descrição (opcional)</Label>
            <Input id="desp-desc" maxLength={200} placeholder="Ex.: aluguel da sala" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>

          <label className="flex items-center justify-between gap-3 border border-border p-3">
            <span>
              <span className="block text-sm font-bold">Despesa fixa</span>
              <span className="block text-xs text-muted-foreground">Repete todo mês a partir dessa data.</span>
            </span>
            <Switch checked={fixa} onCheckedChange={setFixa} aria-label="Despesa fixa" />
          </label>

          <label className="flex items-center justify-between gap-3 border border-border p-3">
            <span>
              <span className="block text-sm font-bold">Gasto para atrair alunos</span>
              <span className="block text-xs text-muted-foreground">Entra no CAC e no retorno da captação.</span>
            </span>
            <Switch checked={captacao} onCheckedChange={setCaptacao} aria-label="Gasto para atrair alunos" />
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
