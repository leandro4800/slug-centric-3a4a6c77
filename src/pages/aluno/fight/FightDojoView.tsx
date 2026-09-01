import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { GraduationCap, Loader2, Play } from "lucide-react";
import ExercisePlayer from "@/components/aluno/ExercisePlayer";
import { modalidadeLabel } from "@/lib/fightModalidades";

type Conteudo = {
  id: string;
  titulo: string;
  descricao: string | null;
  video_url: string;
  nivel: string | null;
  ordem: number;
};

/** Dojo Virtual do aluno: vídeo-aulas do CT filtradas pela modalidade selecionada. */
const FightDojoView = ({ modalidade }: { modalidade: string }) => {
  const [rows, setRows] = useState<Conteudo[]>([]);
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<{ url: string; nome: string } | null>(null);
  const [nivelFiltro, setNivelFiltro] = useState<string>("todos");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("dojo_conteudos")
        .select("id, titulo, descricao, video_url, nivel, ordem")
        .eq("modalidade", modalidade)
        .order("ordem");
      setRows((data as Conteudo[]) ?? []);
      setLoading(false);
    })();
  }, [modalidade]);

  const niveis = Array.from(new Set(rows.map((r) => r.nivel).filter(Boolean) as string[]));
  const visiveis =
    nivelFiltro === "todos" ? rows : rows.filter((r) => (r.nivel ?? "") === nivelFiltro || !r.nivel);

  return (
    <div className="space-y-3">
      <div className="px-1">
        <h2 className="font-display text-lg uppercase italic tracking-tight flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          Dojo Virtual · {modalidadeLabel(modalidade)}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Técnica e metodologia do seu CT em vídeo, na sua modalidade.
        </p>
      </div>

      {niveis.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {["todos", ...niveis].map((n) => (
            <button
              key={n}
              onClick={() => setNivelFiltro(n)}
              className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                nivelFiltro === n
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-white/10 bg-black/40 text-muted-foreground"
              }`}
            >
              {n === "todos" ? "Todos os níveis" : n}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : visiveis.length === 0 ? (
        <Card className="p-8 text-center bg-card/60 backdrop-blur border-white/5">
          <GraduationCap className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Nenhuma aula publicada para {modalidadeLabel(modalidade)} ainda.
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">Seu técnico logo publicará conteúdo aqui.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {visiveis.map((c) => (

            <button
              key={c.id}
              onClick={() => setVideo({ url: c.video_url, nome: c.titulo })}
              className="w-full text-left rounded-xl border border-white/5 bg-black/40 p-3 flex items-center gap-3 hover:border-primary/40 transition-colors"
            >
              <div className="rounded-lg bg-primary/15 border border-primary/30 p-2 shrink-0">
                <Play className="h-4 w-4 text-primary fill-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold uppercase tracking-wider truncate">{c.titulo}</p>
                {c.nivel && (
                  <span className="text-[9px] uppercase tracking-widest text-primary">{c.nivel}</span>
                )}
                {c.descricao && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{c.descricao}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!video} onOpenChange={(o) => !o && setVideo(null)}>
        <DialogContent className="max-w-2xl p-0 bg-black border-white/10">
          <div className="relative w-full aspect-video">
            {video && <ExercisePlayer videoUrl={video.url} exerciseName={video.nome} showPlayButton={false} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FightDojoView;
