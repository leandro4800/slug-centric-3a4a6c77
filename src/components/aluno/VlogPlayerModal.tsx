import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isIOSNativeApp } from "@/lib/native-platform";
import { openVideoExternally, resolveVideoPlayback } from "@/lib/video-embed";
import { YOUTUBE_IFRAME_ALLOW, YOUTUBE_IFRAME_REFERRER_POLICY } from "@/lib/youtube-embed";

type VlogPlayerModalProps = {
  url: string;
  title?: string | null;
  onClose: () => void;
};

export const VlogPlayerModal = ({ url, title, onClose }: VlogPlayerModalProps) => {
  const playback = resolveVideoPlayback(url);
  const showExternalFallback = Boolean(playback.ytId) && isIOSNativeApp();

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 px-4 h-9 rounded-full bg-background/80 border border-border text-xs font-semibold backdrop-blur z-10"
      >
        Fechar
      </button>

      <div
        className="relative w-full max-w-4xl space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
          {playback.embedUrl ? (
            <iframe
              src={playback.embedUrl}
              title={title || "Vlog"}
              allow={YOUTUBE_IFRAME_ALLOW}
              referrerPolicy={YOUTUBE_IFRAME_REFERRER_POLICY}
              allowFullScreen
              className="w-full h-full"
            />
          ) : playback.isDirect ? (
            <video src={url} controls autoPlay playsInline className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-muted-foreground">Não foi possível embutir esse vídeo no app.</p>
              <Button type="button" variant="secondary" onClick={() => openVideoExternally(playback.watchUrl)}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir vídeo
              </Button>
            </div>
          )}
        </div>

        {showExternalFallback && (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => openVideoExternally(playback.watchUrl!)}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir no YouTube
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
