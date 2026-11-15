import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/meu-negocio-metrics";
import { useMetaMensal } from "@/hooks/use-meta-mensal";

export const MetaMensalDialog = ({
  tenantId,
  open,
  onOpenChange,
  vendidoMes,
}: {
  tenantId: string | undefined;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vendidoMes?: number;
}) => {
  const { meta, salvar } = useMetaMensal(tenantId);
  const [valor, setValor] = useState("");

  useEffect(() => {
    if (open) setValor(meta ? String(Math.round(meta / 100)) : "");
  }, [open, meta]);

  const confirmar = async () => {
    const reais = Number(valor.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(reais) || reais <= 0) {
      toast.error("Digite um valor maior que zero.");
      return;
    }
    try {
      await salvar.mutateAsync(reais * 100);
      toast.success("Meta mensal salva!");
      onOpenChange(false);
    } catch (e) {
      console.error("[meta-mensal] salvar", e);
      toast.error("Não foi possível salvar a meta.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Meta mensal de vendas</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <label htmlFor="meta-mensal" className="text-xs text-muted-foreground">Quanto você quer vender por mês (R$)</label>
          <Input
            id="meta-mensal"
            inputMode="decimal"
            placeholder="Ex.: 10000"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") confirmar(); }}
          />
          {vendidoMes !== undefined && <p className="text-xs text-muted-foreground">Vendido neste mês: {formatBRL(vendidoMes)}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirmar} disabled={salvar.isPending}>
            {salvar.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar meta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
