import { useEffect, useState } from "react";
import { DirectVideoPlayer } from "@/components/DirectVideoPlayer";
import { extractYouTubeId, isDirectVideo } from "@/lib/utils";
import { startLandscapePlayback, unlockLandscapeVideo } from "@/lib/video-orientation";
import { buildYouTubeEmbedUrl, YOUTUBE_IFRAME_ALLOW, YOUTUBE_IFRAME_REFERRER_POLICY } from "@/lib/youtube-embed";

interface ExercisePlayerProps {
  videoUrl?: string | null;
  exerciseName: string;
  onPlayClick?: () => void;
  showPlayButton?: boolean;
}

const ExercisePlayer = ({ videoUrl, exerciseName }: ExercisePlayerProps) => {
  const ytId = extractYouTubeId(videoUrl);
  const isDirect = isDirectVideo(videoUrl);
  const [cssLandscape, setCssLandscape] = useState(false);

  useEffect(() => {
    if (!ytId && !isDirect) return;
    let cancelled = false;
    void startLandscapePlayback().then((mode) => {
      if (!cancelled && mode === "css" && ytId) setCssLandscape(true);
    });
    return () => {
      cancelled = true;
      setCssLandscape(false);
      void unlockLandscapeVideo();
    };
  }, [ytId, isDirect]);

  if (!videoUrl) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black flex items-center justify-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
          Demonstração técnica não disponível
        </p>
      </div>
    );
  }

  if (ytId) {
    return (
      <div className={cssLandscape ? "fixed inset-0 z-[400] bg-black" : "absolute inset-0"}>
        <iframe
          src={buildYouTubeEmbedUrl(ytId, { autoplay: true, mute: false, loop: true, controls: true, playsinline: false })}
          title={exerciseName}
          className={
            cssLandscape
              ? "absolute left-1/2 top-1/2 h-[100vw] w-[100vh] max-w-none -translate-x-1/2 -translate-y-1/2 rotate-90 border-0"
              : "absolute inset-0 h-full w-full border-0"
          }
          allow={YOUTUBE_IFRAME_ALLOW}
          referrerPolicy={YOUTUBE_IFRAME_REFERRER_POLICY}
          allowFullScreen
        />
      </div>
    );
  }

  if (isDirect) {
    return (
      <DirectVideoPlayer
        src={videoUrl}
        controls
        autoPlay
        muted={false}
        loop
        playsInline
        wrapperClassName="absolute inset-0"
        className="absolute inset-0 w-full h-full object-contain bg-black"
      />
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <a
        href={videoUrl}
        target="_blank"
        rel="noreferrer"
        className="text-sm text-primary underline"
      >
        Assistir vídeo: {exerciseName}
      </a>
    </div>
  );
};

export default ExercisePlayer;
