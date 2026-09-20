import { DirectVideoPlayer } from "@/components/DirectVideoPlayer";
import { extractYouTubeId, isDirectVideo } from "@/lib/utils";
import { buildYouTubeEmbedUrl, YOUTUBE_IFRAME_ALLOW, YOUTUBE_IFRAME_REFERRER_POLICY } from "@/lib/youtube-embed";
import { supabase } from "@/integrations/supabase/client";
import { uploadPoster } from "@/lib/video-poster";

interface ExercisePlayerProps {
  videoUrl?: string | null;
  exerciseName: string;
  /** Capa já salva para este vídeo (referencia_exercicios.thumbnail_url). */
  posterUrl?: string | null;
  onPlayClick?: () => void;
  showPlayButton?: boolean;
}

/** Salva a capa capturada de volta na biblioteca (silencioso). */
const savePosterForExercise = async (videoUrl: string, blob: Blob) => {
  try {
    const { data: rows } = await supabase
      .from("referencia_exercicios")
      .select("id, thumbnail_url")
      .eq("url_video", videoUrl)
      .limit(1);
    const row = rows?.[0];
    if (!row || row.thumbnail_url) return;
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;
    const url = await uploadPoster(
      "comunidade_uploads",
      `${uid}/posters/ex-${row.id}.jpg`,
      blob,
    );
    if (!url) return;
    await supabase.from("referencia_exercicios").update({ thumbnail_url: url } as any).eq("id", row.id);
  } catch (e) {
    console.warn("[ExercisePlayer] poster retroativo falhou", e);
  }
};

/**
 * Player padrão do app: mesma lógica da Biblioteca — respeita o formato
 * original do vídeo (vertical ou horizontal), sem rotação/paisagem forçada.
 */
const ExercisePlayer = ({ videoUrl, exerciseName, posterUrl }: ExercisePlayerProps) => {
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
      <div className="absolute inset-0">
        <iframe
          src={buildYouTubeEmbedUrl(ytId, { autoplay: true, mute: false, loop: true, controls: true, playsinline: true })}
          title={exerciseName}
          className="absolute inset-0 h-full w-full border-0"
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
        poster={posterUrl}
        onPosterCaptured={(blob) => void savePosterForExercise(videoUrl, blob)}
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
