import { Maximize2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { enterNativeFullscreen } from "@/lib/video-orientation";
import { frameToJpeg } from "@/lib/video-poster";
import { cn } from "@/lib/utils";

type DirectVideoPlayerProps = Omit<React.VideoHTMLAttributes<HTMLVideoElement>, "poster"> & {
  wrapperClassName?: string;
  /** Imagem de capa exibida antes do vídeo carregar (evita o placeholder cinza do Android). */
  poster?: string | null;
  /** Chamado quando não há capa e o primeiro frame foi capturado (correção retroativa). */
  onPosterCaptured?: (blob: Blob) => void;
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
  poster,
  onPosterCaptured,
  ...props
}: DirectVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const capturedRef = useRef(false);
  const captureCbRef = useRef(onPosterCaptured);
  captureCbRef.current = onPosterCaptured;

  const needsCapture = !poster && !!onPosterCaptured;

  // Correção retroativa: sem capa salva, captura o primeiro frame assim que o vídeo carrega.
  useEffect(() => {
    if (!needsCapture) return;
    const el = videoRef.current;
    if (!el) return;
    const onLoaded = async () => {
      if (capturedRef.current) return;
      capturedRef.current = true;
      const blob = await frameToJpeg(el);
      if (blob) captureCbRef.current?.(blob);
    };
    el.addEventListener("loadeddata", onLoaded);
    if (el.readyState >= 2) void onLoaded();
    return () => el.removeEventListener("loadeddata", onLoaded);
  }, [needsCapture, props.src]);

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
        poster={poster || undefined}
        crossOrigin={needsCapture ? "anonymous" : props.crossOrigin}
        preload={props.preload ?? "metadata"}
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
