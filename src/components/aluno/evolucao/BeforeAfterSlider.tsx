import { useState } from "react";
import { Slider } from "@/components/ui/slider";

interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
}

export const BeforeAfterSlider = ({ beforeUrl, afterUrl }: BeforeAfterSliderProps) => {
  const [sliderPos, setSliderPos] = useState(50);

  return (
    <div className="relative w-full aspect-[4/5] overflow-hidden border border-border group">
      {/* Imagem Depois (Base) */}
      <img 
        src={afterUrl} 
        alt="Depois" 
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Imagem Antes (Overlay) */}
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden border-r-2 border-primary"
        style={{ width: `${sliderPos}%` }}
      >
        <img 
          src={beforeUrl} 
          alt="Antes" 
          className="absolute inset-0 w-full h-full object-cover max-w-none"
          style={{ width: `${100 * (100 / sliderPos)}%` }}
        />
        <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 text-[8px] tracking-widest text-white uppercase border border-white/20">
          ANTES
        </div>
      </div>

      <div className="absolute top-2 right-2 bg-primary/80 px-2 py-0.5 text-[8px] tracking-widest text-white uppercase border border-primary/20">
        DEPOIS
      </div>

      {/* Slider Control */}
      <div className="absolute inset-x-0 bottom-4 px-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <Slider
          value={[sliderPos]}
          onValueChange={(val) => setSliderPos(val[0])}
          max={100}
          step={1}
          className="cursor-pointer"
        />
      </div>
    </div>
  );
};