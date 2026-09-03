import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  enterNativeFullscreen,
  startLandscapePlayback,
  unlockLandscapeVideo,
} from "@/lib/video-orientation";
import { cn } from "@/lib/utils";

type DirectVideoPlayerProps = React.VideoHTMLAttributes<HTMLVideoElement> & {
  wrapperClassName?: string;
};

/** Vídeo direto: paisagem no play. Se o OS não deitar, overlay CSS rotaciona 90°. */
export function DirectVideoPlayer({
  onPlay,
  onPause,
  onEnded,
  className,
  wrapperClassName,
  controls = true,
  playsInline = true,
  ...props
}: DirectVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cssLandscape, setCssLandscape] = useState(false);

  useEffect(() => {
    return () => {
      void unlockLandscapeVideo(videoRef.current);
    };
  }, []);

  const goLandscape = async () => {
    const el = videoRef.current;
    const mode = await startLandscapePlayback(el);
    setCssLandscape(mode === "css");
  };

  const leaveLandscape = () => {
    setCssLandscape(false);
    void unlockLandscapeVideo(videoRef.current);
  };

  const expand = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = videoRef.current;
    if (!el) return;
    enterNativeFullscreen(el);
    void goLandscape();
    if (el.paused) void el.play().catch(() => {});
  };

  return (
    <div
      className={cn(
        cssLandscape
          ? "fixed inset-0 z-[400] bg-black"
          : cn("relative", wrapperClassName),
      )}
    >
      <video
        ref={videoRef}
        {...props}
        controls={controls}
        playsInline={playsInline}
        className={
          cssLandscape
            ? "absolute left-1/2 top-1/2 h-[100vw] w-[100vh] max-w-none -translate-x-1/2 -translate-y-1/2 rotate-90 object-contain bg-black"
            : className
        }
        onPlay={(e) => {
          void goLandscape();
          onPlay?.(e);
        }}
        onPause={(e) => {
          onPause?.(e);
        }}
        onEnded={(e) => {
          leaveLandscape();
          onEnded?.(e);
        }}
      />
      <button
        type="button"
        onPointerUp={cssLandscape ? (e) => { e.preventDefault(); e.stopPropagation(); leaveLandscape(); } : expand}
        aria-label={cssLandscape ? "Sair da tela cheia" : "Tela cheia"}
        className="absolute z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-sm active:scale-95"
        style={
          cssLandscape
            ? { top: 12, right: 12 }
            : { bottom: 8, right: 8 }
        }
      >
        {cssLandscape ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
      </button>
    </div>
  );
}
