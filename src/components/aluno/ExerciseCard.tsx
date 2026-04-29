import { useState } from "react";
import { Play, Lightbulb, ChevronUp, Share2, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ExerciseCardData {
  id: string;
  exercicio: string;
  series: string | null;
  repeticoes: string | null;
  observacao: string | null;
  video_url?: string | null;
  is_extra?: boolean;
}

interface CargaAnterior {
  carga_kg: number;
  repeticoes_feitas: number;
  data_treino: string;
}

interface ExerciseCardProps {
  data: ExerciseCardData;
  isOpen: boolean;
  onToggle: () => void;
  cargaAnterior?: CargaAnterior;
  userId: string | null;
  tenantId: string | null;
  onCargaSaved?: (nome: string, carga: number, reps: number) => void;
}

const extractYouTubeId = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
};

export const ExerciseCard = ({
  data,
  isOpen,
  onToggle,
  cargaAnterior,
  userId,
  tenantId,
  onCargaSaved,
}: ExerciseCardProps) => {
  const [carga, setCarga] = useState<string>(cargaAnterior?.carga_kg ? String(cargaAnterior.carga_kg) : "");
  const [reps, setReps] = useState<string>(cargaAnterior?.repeticoes_feitas ? String(cargaAnterior.repeticoes_feitas) : "");
  const [saving, setSaving] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const videoId = extractYouTubeId(data.video_url);

  const handleSave = async () => {
    if (!userId || !tenantId) {
      toast.error("Você precisa estar logado.");
      return;
    }
    const k = parseFloat(carga.replace(",", "."));
    const r = parseInt(reps);
    if (isNaN(k) || isNaN(r)) {
      toast.error("Informe carga e repetições.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("historico_cargas").insert({
      tenant_id: tenantId,
      user_id: userId,
      exercicio_nome: data.exercicio,
      carga_kg: k,
      repeticoes_feitas: r,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Carga registrada!");
    onCargaSaved?.(data.exercicio, k, r);
  };

  return (
    <div className="bg-card/50 border border-accent/30 rounded-xl overflow-hidden">
      <button onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-lg leading-tight">{data.exercicio.toUpperCase()}</p>
          {data.is_extra && (
            <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-accent/20 text-accent shrink-0">
              Extra IA
            </span>
          )}
        </div>
        <div className="flex gap-2 mt-2">
          {data.series && data.repeticoes && (
            <span className="px-3 py-1 rounded-full bg-secondary text-xs">
              {data.series}x {data.repeticoes}
            </span>
          )}
          {cargaAnterior && (
            <span className="px-3 py-1 rounded-full bg-primary/15 text-primary text-xs">
              Última: {cargaAnterior.carga_kg}kg × {cargaAnterior.repeticoes_feitas}
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          <button
            onClick={onToggle}
            className="w-full py-2.5 rounded-lg border border-accent/50 text-accent font-semibold text-sm flex items-center justify-center gap-2"
          >
            FECHAR <ChevronUp className="h-4 w-4" />
          </button>

          {videoId && (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
              {showVideo ? (
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                  title={data.exercicio}
                  className="absolute inset-0 w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              ) : (
                <button onClick={() => setShowVideo(true)} className="absolute inset-0 w-full h-full">
                  <img
                    src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-12 rounded-lg bg-[#FF0000] flex items-center justify-center shadow-lg">
                      <Play className="h-6 w-6 fill-white text-white" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-background/70 px-2 py-1 rounded text-[10px] flex items-center gap-1">
                    Assista no <span className="bg-[#FF0000] px-1.5 rounded text-white font-bold">YouTube</span>
                  </div>
                </button>
              )}
              <button className="absolute bottom-2 left-2 w-9 h-9 rounded-full bg-background/70 flex items-center justify-center z-10">
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          )}

          {data.observacao && (
            <div className="bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <span className="italic text-muted-foreground">{data.observacao}</span>
            </div>
          )}

          {/* Registro de carga */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Carga (kg)</label>
              <input
                type="number"
                inputMode="decimal"
                value={carga}
                onChange={(e) => setCarga(e.target.value)}
                placeholder="0"
                className="w-full mt-1 bg-secondary/70 border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Reps feitas</label>
              <input
                type="number"
                inputMode="numeric"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="0"
                className="w-full mt-1 bg-secondary/70 border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Registrar série
          </button>
        </div>
      )}
    </div>
  );
};
