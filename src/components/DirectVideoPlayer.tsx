import { Maximize2, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { enterNativeFullscreen } from "@/lib/video-orientation";
import { isIOSNativeApp } from "@/lib/native-platform";

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

/**
 * Player MP4.
 * No Android WebView, `controls` desde o início mostra o botão nativo
 * (play + seta de reload) por cima do nosso UI. Só ligamos controls
 * depois do primeiro play; até lá um overlay nosso cobre o native.
 */
export function DirectVideoPlayer({
  className,
  wrapperClassName,
  controls = true,
  playsInline = true,
  autoPlayWhenVisible = false,
  poster,
  onPosterCaptured,
  autoPlay,
  onPlay,
  onPlaying,
  onPause,
  onEnded,
  ...props
}: DirectVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const capturedRef = useRef(false);
  const captureCbRef = useRef(onPosterCaptured);
  captureCbRef.current = onPosterCaptured;

  const isAndroid = Capacitor.getPlatform() === "android";
  const [started, setStarted] = useState(() => !isAndroid || Boolean(autoPlay));
  const [playing, setPlaying] = useState(false);

  // No iOS o crossOrigin="anonymous" faz o vídeo falhar quando o servidor não
  // devolve CORS — melhor não capturar capa lá (Android segue igual).
  const needsCapture = !poster && !!onPosterCaptured && !isIOSNativeApp();

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

  useEffect(() => {
    setStarted(!isAndroid || Boolean(autoPlay));
    setPlaying(false);
  }, [props.src, isAndroid, autoPlay]);

  useEffect(() => {
    if (!autoPlay || !isAndroid) return;
    const el = videoRef.current;
    if (!el) return;
    const tryPlay = () => {
      void el.play().then(() => {
        setStarted(true);
        setPlaying(true);
      }).catch(() => {
        // Precisa gesto — mantém overlay nosso, sem controls nativos.
        setStarted(false);
        setPlaying(false);
      });
    };
    tryPlay();
    el.addEventListener("canplay", tryPlay);
    return () => el.removeEventListener("canplay", tryPlay);
  }, [autoPlay, isAndroid, props.src]);

  const startPlayback = () => {
    const el = videoRef.current;
    if (!el) return;
    setStarted(true);
    void el.play().catch(() => setStarted(false));
  };

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
            void el.play().then(() => {
              setStarted(true);
              setPlaying(true);
            }).catch(() => {});
          } else {
            el.pause();
            setPlaying(false);
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

  const showNativeControls = controls && (!isAndroid || started);
  const showPlayOverlay = isAndroid && controls && !playing;

  return (
    <div className={cn("relative", wrapperClassName)}>
      <video
        ref={videoRef}
        {...props}
        poster={poster || undefined}
        crossOrigin={needsCapture ? "anonymous" : props.crossOrigin}
        preload={props.preload ?? "metadata"}
        autoPlay={autoPlay}
        controls={showNativeControls}
        playsInline={playsInline}
        controlsList="nodownload"
        disablePictureInPicture
        className={cn("ac-direct-video", className)}
        onPlay={(e) => {
          setStarted(true);
          setPlaying(true);
          onPlay?.(e);
        }}
        onPlaying={(e) => {
          setStarted(true);
          setPlaying(true);
          onPlaying?.(e);
        }}
        onPause={(e) => {
          setPlaying(false);
          onPause?.(e);
        }}
        onEnded={(e) => {
          setPlaying(false);
          onEnded?.(e);
        }}
      />

      {showPlayOverlay && (
        <button
          type="button"
          onClick={startPlayback}
          aria-label="Reproduzir"
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/35"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-lg">
            <Play className="h-7 w-7 fill-current ml-0.5" />
          </span>
        </button>
      )}

      <button
        type="button"
        onPointerUp={expand}
        aria-label="Tela cheia"
        className="absolute bottom-2 right-2 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-sm active:scale-95"
      >
        <Maximize2 className="h-5 w-5" />
      </button>
    </div>
  );
}
