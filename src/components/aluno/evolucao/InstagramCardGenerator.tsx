import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Download } from "lucide-react";
import html2canvas from "html2canvas";
import { useBranding } from "@/contexts/BrandingProvider";
import { toast } from "sonner";

interface InstagramCardGeneratorProps {
  userName: string;
  weightLoss: string;
  beforeImg: string;
  afterImg: string;
}

export const InstagramCardGenerator = ({ userName, weightLoss, beforeImg, afterImg }: InstagramCardGeneratorProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { tenant } = useBranding();

  const handleGenerate = async () => {
    if (!cardRef.current) return;
    
    try {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: "#000000"
      });
      
      const link = document.createElement('a');
      link.download = `resultado-alpha-${userName.toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success("Card gerado com sucesso! Compartilhe agora.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar o card.");
    }
  };

  return (
    <div className="mt-8 space-y-4">
      <Button 
        className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 border-none text-white font-bold tracking-widest"
        onClick={handleGenerate}
      >
        <Camera className="h-5 w-5 mr-2" /> GERAR CARD RESULTADO
      </Button>

      {/* Hidden/Preview Card for Generation */}
      <div className="fixed -left-[2000px] top-0">
        <div 
          ref={cardRef}
          className="w-[1080px] h-[1350px] bg-black relative overflow-hidden flex flex-col items-center p-12 text-white font-sans"
        >
          {/* Netflix style "N" or Logo */}
          <div className="absolute top-12 left-12 flex items-center gap-4">
             <div className="w-16 h-16 bg-primary flex items-center justify-center font-display text-4xl text-white">A</div>
             <div className="text-xl font-bold tracking-[0.3em] uppercase">{tenant?.nome || "ALPHA COACH"}</div>
          </div>

          <div className="mt-32 w-full text-center">
            <h1 className="text-7xl font-display tracking-[0.1em] mb-4">RESULTADO <span className="text-primary italic">OFICIAL</span></h1>
            <div className="inline-block px-8 py-3 border-2 border-primary/50 text-3xl tracking-[0.5em] text-white uppercase bg-black/40">
              {userName}
            </div>
          </div>

          {/* Fotos Lado a Lado */}
          <div className="mt-20 flex w-full h-[650px] gap-2 border-y-4 border-primary">
             <div className="flex-1 relative overflow-hidden">
                <img src={beforeImg} className="w-full h-full object-cover grayscale-[0.5]" alt="Antes" />
                <div className="absolute bottom-6 left-6 bg-black/70 px-6 py-2 border border-white/20 text-2xl tracking-widest uppercase italic">ANTES</div>
             </div>
             <div className="flex-1 relative overflow-hidden">
                <img src={afterImg} className="w-full h-full object-cover" alt="Depois" />
                <div className="absolute bottom-6 right-6 bg-primary px-6 py-2 text-2xl tracking-widest uppercase italic font-bold">DEPOIS</div>
             </div>
          </div>

          <div className="mt-16 w-full flex justify-between items-center px-12">
             <div className="text-left">
                <div className="text-2xl text-muted-foreground tracking-widest uppercase mb-2">Eliminados:</div>
                <div className="text-9xl font-display text-primary tracking-tighter shadow-glow-text">-{weightLoss}KG</div>
             </div>
             
             <div className="text-right">
                <div className="text-2xl text-muted-foreground tracking-widest uppercase mb-2">Time:</div>
                <div className="text-4xl font-bold tracking-[0.2em] text-white underline decoration-primary underline-offset-8">#{tenant?.nome?.replace(/\s+/g, '') || "ALPHACOACH"}</div>
             </div>
          </div>

          {/* Overlay Effects */}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-primary/5 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-full h-2 bg-primary shadow-glow" />
        </div>
      </div>
    </div>
  );
};