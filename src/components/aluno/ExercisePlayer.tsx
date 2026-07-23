import { extractYouTubeId, isDirectVideo } from "@/lib/utils";
import { buildYouTubeEmbedUrl, YOUTUBE_IFRAME_ALLOW, YOUTUBE_IFRAME_REFERRER_POLICY } from "@/lib/youtube-embed";
import { Video, Play, CheckCircle2 } from "lucide-react";

interface ExercisePlayerProps {
  videoUrl?: string | null;
  exerciseName: string;
  onPlayClick?: () => void;
  showPlayButton?: boolean;
}

const ExercisePlayer = ({ videoUrl, exerciseName, onPlayClick, showPlayButton = true }: ExercisePlayerProps) => {
  const ytId = extractYouTubeId(videoUrl);
  const isDirect = isDirectVideo(videoUrl);

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
      <iframe
        src={buildYouTubeEmbedUrl(ytId, { autoplay: true, mute: false, loop: true, controls: true, playsinline: true })}
        title={exerciseName}
        className="absolute inset-0 w-full h-full border-0"
        allow={YOUTUBE_IFRAME_ALLOW}
        referrerPolicy={YOUTUBE_IFRAME_REFERRER_POLICY}
        allowFullScreen
      />
    );
  }

  if (isDirect) {
    return (
      <video
        src={videoUrl}
        controls
        autoPlay
        muted={false}
        loop
        playsInline
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