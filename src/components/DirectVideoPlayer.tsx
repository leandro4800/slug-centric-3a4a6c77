import { Maximize2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { enterNativeFullscreen } from "@/lib/video-orientation";
import { cn } from "@/lib/utils";

type DirectVideoPlayerProps = React.VideoHTMLAttributes<HTMLVideoElement> & {
  wrapperClassName?: string;
  /** Quando true, toca o vídeo automaticamente (mudo) ao entrar na viewport e pausa ao sair. */
  autoPlayWhenVisible?: boolean;
};

/** Vídeo direto (MP4): respeita o formato original, sem rotação forçada. */
export function DirectVideoPlayer({
  className,
  wrapperClassName,
  controls = true,
  playsInline = true,
  autoPlayWhenVisible = false,
  ...props
}: DirectVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Autoplay mudo baseado em visibilidade: toca quando o vídeo entra na tela
  // e pausa quando sai, evitando vários vídeos tocando ao mesmo tempo.
  useEffect(() => {
    if (!autoPlayWhenVisible) return;
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            void el.play().catch(() => {});
          } else {
            el.pause();
          }
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [autoPlayWhenVisible]);

  const expand = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = videoRef.current;
    if (!el) return;
    enterNativeFullscreen(el);
    if (el.paused) void el.play().catch(() => {});
  };

  return (
    <div className={cn("relative", wrapperClassName)}>
      <video
        ref={videoRef}
        {...props}
        controls={controls}
        playsInline={playsInline}
        className={className}
      />
      <button
        type="button"
        onPointerUp={expand}
        aria-label="Tela cheia"
        className="absolute bottom-2 right-2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-sm active:scale-95"
      >
        <Maximize2 className="h-5 w-5" />
      </button>
    </div>
  );
}
