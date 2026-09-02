import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type BackgroundVideoProps = {
  src: string;
  className?: string;
  /** Imagem exibida até o primeiro frame — evita o ícone de play do WebView Android */
  posterUrl?: string | null;
};

/**
 * Vídeo de fundo sem controles nativos. No Android WebView o autoplay pode
 * atrasar e o Chromium mostra um botão de play enorme; o poster cobre até onPlaying.
 */
export function BackgroundVideo({ src, className, posterUrl }: BackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    el.muted = true;
    const tryPlay = () => {
      void el.play().catch(() => {});
    };

    tryPlay();
    el.addEventListener("canplay", tryPlay);
    return () => el.removeEventListener("canplay", tryPlay);
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        controls={false}
        tabIndex={-1}
        onPlaying={() => setPlaying(true)}
        className="bg-video absolute inset-0 h-full w-full object-cover"
      />
      {!playing && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-black"
          style={posterUrl ? { backgroundImage: `url(${posterUrl})` } : undefined}
          aria-hidden
        />
      )}
    </div>
  );
}
