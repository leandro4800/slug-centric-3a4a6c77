import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Ruler, Anchor, Upload, FileDown } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: "navy" | "7dobras" | "import") => void;
}

export const PhysicalEvaluationSelection = ({ open, onOpenChange, onSelect }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase tracking-tight">
            Nova Avaliação Física
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs uppercase tracking-wider">
            Escolha o método de avaliação que deseja utilizar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Button
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2 border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all group"
            onClick={() => onSelect("navy")}
          >
            <Anchor className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-wider">Marinha Americana</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Protocolo Pescoço, Cintura e Quadril</p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2 border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all group"
            onClick={() => onSelect("7dobras")}
          >
            <div className="relative">
              <Ruler className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
              <Sparkles className="h-3 w-3 text-primary absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-wider">7 Dobras + Avaliação Física</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Protocolo Completo (Permite importar PDF)</p>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
