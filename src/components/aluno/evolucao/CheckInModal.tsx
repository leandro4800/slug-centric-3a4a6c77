import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Plus, Calculator } from "lucide-react";
import { toast } from "sonner";

export const CheckInModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [show7Dobras, setShow7Dobras] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Progresso registrado com sucesso!");
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="fixed bottom-24 right-5 w-14 h-14 rounded-full p-0 shadow-glow animate-pulse" variant="default">
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-black/95 border-primary/30 text-white rounded-none max-h-[90vh] overflow-y-auto w-[95vw] sm:max-w-md p-0">
        <div className="p-6 border-b border-primary/20 bg-gradient-to-b from-primary/10 to-transparent">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-[0.2em] text-center text-white">
              CHECK-IN <span className="text-primary">EVOLUÇÃO</span>
            </DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Fotos Section */}
          <div className="space-y-3">
            <Label className="text-[10px] tracking-widest uppercase text-muted-foreground">Fotos de Progresso</Label>
            <div className="grid grid-cols-3 gap-2">
              {['Frente', 'Costas', 'Lado'].map((pos) => (
                <div key={pos} className="aspect-square border border-border bg-card/20 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 transition-colors">
                  <Camera className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[8px] uppercase tracking-tighter">{pos}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Métricas Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] tracking-widest uppercase text-muted-foreground">Peso (kg)</Label>
              <Input type="number" step="0.1" className="bg-card/40 border-border rounded-none h-12 text-center text-lg font-bold" placeholder="0.0" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] tracking-widest uppercase text-muted-foreground">BF% (Opcional)</Label>
              <Input type="number" step="0.1" className="bg-card/40 border-border rounded-none h-12 text-center text-lg font-bold" placeholder="0.0" />
            </div>
          </div>

          {/* 7 Dobras Toggle */}
          <Button 
            type="button" 
            variant="outline" 
            className="w-full border-primary/20 bg-primary/5 hover:bg-primary/10 text-xs tracking-widest py-6"
            onClick={() => setShow7Dobras(!show7Dobras)}
          >
            <Calculator className="mr-2 h-4 w-4" /> 
            {show7Dobras ? "FECHAR CALCULADORA" : "CALCULADORA 7 DOBRAS"}
          </Button>

          {show7Dobras && (
            <div className="bg-card/40 border border-primary/20 p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
              <p className="text-[10px] text-primary/80 tracking-widest text-center uppercase mb-2">Jackson & Pollock Protocol</p>
              <div className="grid grid-cols-2 gap-3">
                {['Peitoral', 'Axilar', 'Tríceps', 'Subescapular', 'Abdominal', 'Suprailíaca', 'Coxa'].map((dobra) => (
                  <div key={dobra} className="space-y-1">
                    <Label className="text-[8px] uppercase text-muted-foreground">{dobra}</Label>
                    <Input type="number" className="h-8 bg-black/40 border-border rounded-none text-xs" placeholder="mm" />
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-primary/10 mt-2">
                <div className="flex justify-between items-center text-[10px] tracking-widest text-white">
                  <span>RESULTADO ESTIMADO:</span>
                  <span className="text-primary font-bold">-- %</span>
                </div>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full h-12 text-sm tracking-widest font-bold shadow-glow">
            SALVAR EVOLUÇÃO
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};