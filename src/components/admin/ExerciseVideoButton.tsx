import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlayCircle } from "lucide-react";
import ExercisePlayer from "@/components/aluno/ExercisePlayer";

interface ExerciseVideoButtonProps {
  /** Prioridade: vídeo do coach; fallback: vídeo da biblioteca. */
  videoCoachUrl?: string | null;
  videoUrl?: string | null;
  exerciseName: string;
}

/** Botão "Ver Vídeo" com player em modal — usado nos editores de treino do coach. */
export const ExerciseVideoButton = ({
  videoCoachUrl,
  videoUrl,
  exerciseName,
}: ExerciseVideoButtonProps) => {
  const [open, setOpen] = useState(false);
  const url = videoCoachUrl || videoUrl || null;
  if (!url) return null;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="h-6 px-2 gap-1 text-[9px] uppercase tracking-wider font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
        title="Ver vídeo de referência"
      >
        <PlayCircle className="h-3.5 w-3.5" /> Ver vídeo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-wider text-base">
              {exerciseName || "Exercício"}
            </DialogTitle>
          </DialogHeader>
          <div className="relative w-full overflow-hidden rounded-lg bg-black aspect-video">
            {open && <ExercisePlayer videoUrl={url} exerciseName={exerciseName} />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExerciseVideoButton;
