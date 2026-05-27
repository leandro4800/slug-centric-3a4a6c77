import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface AdminBackButtonProps {
  to?: string;
  className?: string;
  variant?: "ghost" | "outline" | "default";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
  confirmExit?: boolean;
  exitMessage?: string;
}

export const AdminBackButton = ({
  to,
  className,
  variant = "ghost",
  size = "icon",
  showLabel = false,
  confirmExit = false,
  exitMessage = "Você voltará para a tela anterior. Deseja continuar?",
}: AdminBackButtonProps) => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  const handleBack = () => {
    if (to) {
      navigate(to);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else if (slug) {
      navigate(`/${slug}/app/controle`);
    } else {
      navigate(-1);
    }
  };

  const button = (
    <Button variant={variant} size={size} className={cn("gap-2", className)} onClick={!confirmExit ? handleBack : undefined}>
      <ArrowLeft className="h-4 w-4" />
      {showLabel && <span>Voltar</span>}
    </Button>
  );

  if (confirmExit) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          {button}
        </AlertDialogTrigger>
        <AlertDialogContent className="bg-black border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {exitMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBack}
              className="bg-primary text-white hover:bg-primary/90"
            >
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return button;
};
