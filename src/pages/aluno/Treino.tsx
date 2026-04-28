import { useState } from "react";
import { Dumbbell, Play, Music, Lightbulb, ChevronUp, Share2 } from "lucide-react";
import { PageHeader } from "@/components/aluno/PageHeader";

const exercicios = [
  { nome: "Supino reto com barra", reps: "4x 12 reps", dica: "Controle a descida em 3 segundos.", videoId: "dQw4w9WgXcQ" },
  { nome: "Crucifixo inclinado", reps: "3x 15 reps", dica: "Mantenha cotovelos levemente flexionados.", videoId: "dQw4w9WgXcQ" },
  { nome: "Desenvolvimento militar", reps: "4x 10 reps", dica: "Não trave os cotovelos no topo.", videoId: "dQw4w9WgXcQ" },
];

const Treino = () => {
  const [tab, setTab] = useState("A");
  const [open, setOpen] = useState<number | null>(0);

  return (
    <>
      <PageHeader icon={Dumbbell} title="MEU TREINO" subtitle="10 exercícios" />

      <div className="px-5">
        <div className="bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 text-center text-xs text-accent mb-4">
          ⚡ Prévia — Seu treino personalizado será montado pelo coach
        </div>

        <button className="w-full bg-[hsl(142_70%_45%)] text-black font-display text-lg py-3 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_30px_-5px_hsl(142_70%_45%/0.6)]">
          <Music className="h-5 w-5" /> PLAYLIST DO TIME
        </button>

        <div className="flex gap-2 mt-5">
          {["A", "B", "C"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-full text-sm font-semibold uppercase tracking-wider transition ${
                tab === t ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              Treino {t}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <h2 className="font-display text-base flex items-center gap-2">
            <span className="text-accent">▶</span> TREINO DE HOJE — {exercicios.length} EXERCÍCIOS
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Toque em um exercício para abrir o modo execução</p>
        </div>

        <div className="space-y-3 mt-4">
          {exercicios.map((ex, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="bg-card/50 border border-accent/30 rounded-xl overflow-hidden">
                <button onClick={() => setOpen(isOpen ? null : i)} className="w-full p-4 text-left">
                  <p className="font-display text-lg leading-tight">{ex.nome.toUpperCase()}</p>
                  <span className="inline-block mt-2 px-3 py-1 rounded-full bg-secondary text-xs">{ex.reps}</span>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-3">
                    <button className="w-full py-2.5 rounded-lg border border-accent/50 text-accent font-semibold text-sm flex items-center justify-center gap-2">
                      ▶ FECHAR <ChevronUp className="h-4 w-4" />
                    </button>

                    <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                      <img
                        src={`https://img.youtube.com/vi/${ex.videoId}/hqdefault.jpg`}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-12 rounded-lg bg-[#FF0000] flex items-center justify-center shadow-lg">
                          <Play className="h-6 w-6 fill-white text-white" />
                        </div>
                      </div>
                      <button className="absolute bottom-2 left-2 w-9 h-9 rounded-full bg-background/70 flex items-center justify-center">
                        <Share2 className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-2 right-2 bg-background/70 px-2 py-1 rounded text-[10px] flex items-center gap-1">
                        Assista no <span className="bg-[#FF0000] px-1.5 rounded text-white font-bold">YouTube</span>
                      </div>
                    </div>

                    <div className="bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <span className="italic text-muted-foreground">{ex.dica}</span>
                    </div>

                    <button className="w-full py-2.5 rounded-lg border border-accent/40 text-foreground font-semibold text-sm">
                      ▶ INICIAR EXERCÍCIO
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default Treino;
