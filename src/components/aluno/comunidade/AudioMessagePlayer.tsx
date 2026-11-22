import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AUDIO_BUCKET, formatAudioTime } from "@/lib/comunidade-audio";

// URLs assinadas válidas por 1h, reaproveitadas entre renderizações.
const urlCache = new Map<string, { url: string; expira: number }>();

const signedUrl = async (path: string) => {
  const c = urlCache.get(path);
  if (c && c.expira > Date.now()) return c.url;
  const { data, error } = await supabase.storage.from(AUDIO_BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) throw error || new Error("Áudio indisponível");
  urlCache.set(path, { url: data.signedUrl, expira: Date.now() + 55 * 60 * 1000 });
  return data.signedUrl;
};

interface Props {
  path: string;
  duracaoSeg: number | null;
  mine: boolean;
}

export const AudioMessagePlayer = ({ path, duracaoSeg, mine }: Props) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [erro, setErro] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [atual, setAtual] = useState(0);
  const [total, setTotal] = useState(duracaoSeg || 0);

  useEffect(() => {
    let vivo = true;
    signedUrl(path)
      .then((u) => vivo && setSrc(u))
      .catch(() => vivo && setErro(true));
    return () => {
      vivo = false;
    };
  }, [path]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a || !src) return;
    if (a.paused) {
      // pausa outros áudios do chat
      document.querySelectorAll("audio[data-direct-audio]").forEach((el) => {
        if (el !== a) (el as HTMLAudioElement).pause();
      });
      void a.play().catch(() => setErro(true));
    } else a.pause();
  };

  const pct = total > 0 ? Math.min(100, (atual / total) * 100) : 0;

  return (
    <div className="flex w-56 max-w-full items-center gap-3 py-1">
      <button
        type="button"
        onClick={toggle}
        disabled={!src || erro}
        aria-label={tocando ? "Pausar áudio" : "Tocar áudio"}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          mine ? "bg-primary-foreground/20" : "bg-foreground/10"
        } disabled:opacity-50`}
      >
        {!src && !erro ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : tocando ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="ml-0.5 h-4 w-4" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div
          role="slider"
          aria-label="Progresso do áudio"
          aria-valuemin={0}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(atual)}
          tabIndex={0}
          className={`relative h-1.5 w-full cursor-pointer overflow-hidden rounded-full ${
            mine ? "bg-primary-foreground/25" : "bg-foreground/15"
          }`}
          onClick={(e) => {
            const a = audioRef.current;
            if (!a || !total) return;
            const r = e.currentTarget.getBoundingClientRect();
            a.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * total;
          }}
        >
          <div
            className={`absolute inset-y-0 left-0 ${mine ? "bg-primary-foreground" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] opacity-70">
          {erro ? "Áudio indisponível" : `${formatAudioTime(tocando || atual > 0 ? atual : 0)} / ${formatAudioTime(total)}`}
        </p>
      </div>
      {src && (
        <audio
          ref={audioRef}
          data-direct-audio
          src={src}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setTotal(d);
          }}
          onTimeUpdate={(e) => setAtual(e.currentTarget.currentTime)}
          onPlay={() => setTocando(true)}
          onPause={() => setTocando(false)}
          onEnded={() => {
            setTocando(false);
            setAtual(0);
          }}
          onError={() => setErro(true)}
        />
      )}
    </div>
  );
};

export default AudioMessagePlayer;
