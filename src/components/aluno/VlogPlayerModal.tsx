import { useRef } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isIOSNativeApp } from "@/lib/native-platform";
import { openVideoExternally, resolveVideoPlayback } from "@/lib/video-embed";
import { YOUTUBE_IFRAME_ALLOW, YOUTUBE_IFRAME_REFERRER_POLICY } from "@/lib/youtube-embed";
import { buildYouTubeThumbnailUrl } from "@/lib/vlog-url";

type VlogPlayerModalProps = {
  url: string;
  title?: string | null;
  onClose: () => void;
};

export const VlogPlayerModal = ({ url, title, onClose }: VlogPlayerModalProps) => {
  const playback = resolveVideoPlayback(url);
  const showExternalFallback = Boolean(playback.ytId) && isIOSNativeApp();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleIframeLoad = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    // Força play com áudio via YouTube iframe postMessage API
    try {
      win.postMessage('{"event":"command","func":"unMute","args":""}', "*");
      win.postMessage('{"event":"command","func":"setVolume","args":[100]}', "*");
      win.postMessage('{"event":"command","func":"playVideo","args":""}', "*");
    } catch {}
  };

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
            <>
              {playback.ytId && (
                <img
                  src={buildYouTubeThumbnailUrl(playback.ytId)}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-40"
                />
              )}
              <iframe
                src={playback.embedUrl}
                title={title || "Vlog"}
                allow={YOUTUBE_IFRAME_ALLOW}
                referrerPolicy={YOUTUBE_IFRAME_REFERRER_POLICY}
                allowFullScreen
                className="relative h-full w-full"
              />
            </>
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
