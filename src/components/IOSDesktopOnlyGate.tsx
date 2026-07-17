import { Monitor, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { isIOSNativeApp } from "@/lib/native-platform";

type IOSDesktopOnlyGateProps = {
  title: string;
  description: string;
  desktopHint?: string;
  children: React.ReactNode;
};

export const IOSDesktopOnlyGate = ({
  title,
  description,
  desktopHint = "alpha-coach.app",
  children,
}: IOSDesktopOnlyGateProps) => {
  const navigate = useNavigate();

  if (!isIOSNativeApp()) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
          <Monitor className="h-8 w-8" />
        </div>
        <h2 className="font-display text-2xl uppercase tracking-tighter italic">{title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-3 text-left">
          <ShieldAlert className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Acesse <strong>{desktopHint}</strong> no seu computador para concluir esta etapa com segurança.
          </p>
        </div>
        <Button onClick={() => navigate(-1)} className="w-full h-12 uppercase font-black tracking-widest text-xs">
          Voltar
        </Button>
      </div>
    </div>
  );
};
