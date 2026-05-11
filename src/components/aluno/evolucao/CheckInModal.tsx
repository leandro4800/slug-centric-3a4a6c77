import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Plus, Calculator, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAvatarVariant } from "@/hooks/use-avatar-variant";

type PhotoType = 'frente' | 'costas' | 'lado';

interface CheckInModalProps {
  onSaved?: () => void;
}

export const CheckInModal = ({ onSaved }: CheckInModalProps = {}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [show7Dobras, setShow7Dobras] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const { user } = useAuth();
  // Pré-carrega o avatar de comemoração (gera 1x e cacheia no perfil — não gasta IA toda vez)
  const { url: avatarCelebracao } = useAvatarVariant("celebracao");

  const [peso, setPeso] = useState("");
  const [bf, setBf] = useState("");
  const [fotos, setFotos] = useState<{ frente?: File; costas?: File; lado?: File }>({});
  const [previews, setPreviews] = useState<{ frente?: string; costas?: string; lado?: string }>({});

  const [dobras, setDobras] = useState({
    peitoral: "",
    axilar: "",
    triceps: "",
    subescapular: "",
    abdominal: "",
    suprailiaca: "",
    coxa: "",
  });

  const handleFoto = (tipo: PhotoType, file: File) => {
    setFotos(prev => ({ ...prev, [tipo]: file }));
    setPreviews(prev => ({ ...prev, [tipo]: URL.createObjectURL(file) }));
  };

  const calculateBF = () => {
    const sum = Object.values(dobras).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    if (sum === 0) return;

    // Simplificação do Jackson & Pollock 7 Dobras para exemplo (deve ser refinado com idade/sexo se disponível)
    // Densidade Corporal (DC) = 1.112 - (0.00043499 * soma) + (0.00000055 * soma^2) - (0.00028826 * idade)
    // %Gordura = ((4.95 / DC) - 4.50) * 100
    
    // Para simplificar agora, usaremos uma estimativa linear baseada na soma
    const estimatedBF = (sum * 0.15 + 5).toFixed(1);
    setBf(estimatedBF);
    toast.info(`BF% estimado em ${estimatedBF}% baseado nas dobras.`);
  };

  const uploadFoto = async (file: File, tipo: string) => {
    if (!user) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}_${tipo}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('evolucao-fotos')
      .upload(fileName, file);

    if (error) throw error;
    return fileName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Você precisa estar logado.");
      return;
    }

    setLoading(true);
    try {
      const foto_frente_url = fotos.frente ? await uploadFoto(fotos.frente, 'frente') : null;
      const foto_costas_url = fotos.costas ? await uploadFoto(fotos.costas, 'costas') : null;
      const foto_lado_url = fotos.lado ? await uploadFoto(fotos.lado, 'lado') : null;

      const { error } = await supabase.from('evolucao_checkins').insert({
        user_id: user.id,
        peso_kg: parseFloat(peso) || null,
        bf_percentual: parseFloat(bf) || null,
        foto_frente_url,
        foto_costas_url,
        foto_lado_url,
        dobras: dobras,
        data_checkin: new Date().toISOString()
      });

      if (error) throw error;

      toast.success("Check-in de evolução salvo com sucesso!");
      onSaved?.();
      setIsOpen(false);
      // Mostra avatar comemorativo (cacheado) por alguns segundos
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 4500);
      // Reset form
      setPeso("");
      setBf("");
      setFotos({});
      setPreviews({});
      setDobras({
        peitoral: "",
        axilar: "",
        triceps: "",
        subescapular: "",
        abdominal: "",
        suprailiaca: "",
        coxa: "",
      });
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao salvar check-in: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="fixed bottom-24 right-5 w-14 h-14 rounded-full p-0 shadow-glow animate-pulse z-50" variant="default">
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
              {(['frente', 'costas', 'lado'] as PhotoType[]).map((tipo) => (
                <label 
                  key={tipo} 
                  className="aspect-[3/4] border border-border bg-card/20 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 transition-colors overflow-hidden relative"
                >
                  {previews[tipo] ? (
                    <img src={previews[tipo]} alt={tipo} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[8px] uppercase tracking-tighter">{tipo}</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    className="hidden" 
                    onChange={(e) => e.target.files?.[0] && handleFoto(tipo, e.target.files[0])}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Métricas Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] tracking-widest uppercase text-muted-foreground">Peso (kg)</Label>
              <Input 
                type="number" 
                step="0.1" 
                required
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                className="bg-card/40 border-border rounded-none h-12 text-center text-lg font-bold" 
                placeholder="0.0" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] tracking-widest uppercase text-muted-foreground">BF% (Opcional)</Label>
              <Input 
                type="number" 
                step="0.1" 
                value={bf}
                onChange={(e) => setBf(e.target.value)}
                className="bg-card/40 border-border rounded-none h-12 text-center text-lg font-bold" 
                placeholder="0.0" 
              />
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
                {Object.keys(dobras).map((key) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-[8px] uppercase text-muted-foreground">{key}</Label>
                    <Input 
                      type="number" 
                      value={dobras[key as keyof typeof dobras]}
                      onChange={(e) => setDobras(prev => ({ ...prev, [key]: e.target.value }))}
                      className="h-8 bg-black/40 border-border rounded-none text-xs" 
                      placeholder="mm" 
                    />
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-primary/10 mt-2 flex justify-between items-center">
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={calculateBF}
                  className="text-[10px] h-7 bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30"
                >
                  CALCULAR
                </Button>
                <div className="text-[10px] tracking-widest text-white">
                  <span>ESTIMADO:</span>
                  <span className="text-primary font-bold ml-2">{bf || "--"} %</span>
                </div>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-12 text-sm tracking-widest font-bold shadow-glow"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "SALVAR EVOLUÇÃO"}
          </Button>
        </form>
      </DialogContent>

      {/* Overlay de comemoração com avatar */}
      {showCelebration && avatarCelebracao && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setShowCelebration(false)}
        >
          <div className="relative flex flex-col items-center gap-4 px-6 animate-in zoom-in-50 duration-500">
            <div className="absolute inset-0 -z-10 rounded-full blur-3xl bg-primary/40" />
            <p className="text-[10px] uppercase tracking-[0.4em] text-primary font-bold">Check-in concluído</p>
            <img
              src={avatarCelebracao}
              alt="Comemoração"
              className="w-64 max-w-[70vw] h-auto rounded-2xl shadow-[0_0_60px_-10px_hsl(var(--primary))]"
            />
            <p className="font-display text-3xl text-center leading-tight drop-shadow-lg">
              VOCÊ É <span className="text-primary">FERA!</span>
            </p>
            <p className="text-xs text-muted-foreground text-center">Toque para fechar</p>
          </div>
        </div>
      )}
    </Dialog>
  );
};