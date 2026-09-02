import { useEffect } from "react";
import { lockLandscapeForVideo, unlockLandscapeVideo } from "@/lib/video-orientation";

type DirectVideoPlayerProps = React.VideoHTMLAttributes<HTMLVideoElement>;

/** Vídeo direto (upload) — entra em paisagem ao dar play. */
export function DirectVideoPlayer({
  onPlay,
  onPause,
  onEnded,
  ...props
}: DirectVideoPlayerProps) {
  useEffect(() => {
    return () => {
      void unlockLandscapeVideo();
    };
  }, []);

  return (
    <video
      {...props}
      onPlay={(e) => {
        void lockLandscapeForVideo(e.currentTarget);
        onPlay?.(e);
      }}
      onPause={(e) => {
        void unlockLandscapeVideo();
        onPause?.(e);
      }}
      onEnded={(e) => {
        void unlockLandscapeVideo();
        onEnded?.(e);
      }}
    />
  );
}
