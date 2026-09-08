import { Maximize2 } from "lucide-react";
import { useRef } from "react";
import { enterNativeFullscreen } from "@/lib/video-orientation";
import { cn } from "@/lib/utils";

type DirectVideoPlayerProps = React.VideoHTMLAttributes<HTMLVideoElement> & {
  wrapperClassName?: string;
};

/** Vídeo direto (MP4): respeita o formato original, sem rotação forçada. */
export function DirectVideoPlayer({
  className,
  wrapperClassName,
  controls = true,
  playsInline = true,
  ...props
}: DirectVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

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
