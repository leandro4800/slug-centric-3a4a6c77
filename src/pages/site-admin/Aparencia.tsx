import { Palette } from "lucide-react";
import { IdentidadeVisual } from "@/components/admin/IdentidadeVisual";

const Aparencia = () => {
  return (
    <div className="min-h-screen bg-black px-5 md:px-8 pt-6 pb-32">
      <div className="flex items-center gap-2 text-primary/80">
        <Palette className="h-4 w-4" />
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Branding</span>
      </div>
      <h1 className="font-display text-4xl mt-2 text-white leading-tight">APARÊNCIA</h1>
      <p className="text-sm text-muted-foreground mt-2 mb-6">
        Customize as cores, o tema e a música do app que seus alunos veem.
      </p>
      <div className="h-px bg-primary/20 mb-6" />
      <IdentidadeVisual />
    </div>
  );
};

export default Aparencia;
