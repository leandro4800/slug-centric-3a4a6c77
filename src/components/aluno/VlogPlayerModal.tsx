import { useRef } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isIOSNativeApp } from "@/lib/native-platform";
import { openVideoExternally, resolveVideoPlayback } from "@/lib/video-embed";
import {
  INSTAGRAM_IFRAME_ALLOW,
  INSTAGRAM_IFRAME_REFERRER_POLICY,
} from "@/lib/instagram-embed";
import { YOUTUBE_IFRAME_ALLOW, YOUTUBE_IFRAME_REFERRER_POLICY } from "@/lib/youtube-embed";
import { buildYouTubeThumbnailUrl } from "@/lib/vlog-url";

type VlogPlayerModalProps = {
  url: string;
  title?: string | null;
  thumbnailUrl?: string | null;
  onClose: () => void;
};

export const VlogPlayerModal = ({ url, title, thumbnailUrl, onClose }: VlogPlayerModalProps) => {
  const playback = resolveVideoPlayback(url, { userInitiated: true, muted: isIOSNativeApp() });
  const iframeAllow = playback.isInstagram ? INSTAGRAM_IFRAME_ALLOW : YOUTUBE_IFRAME_ALLOW;
  const iframeReferrerPolicy = playback.isInstagram
    ? INSTAGRAM_IFRAME_REFERRER_POLICY
    : YOUTUBE_IFRAME_REFERRER_POLICY;
  const externalLabel = playback.isInstagram
    ? "Abrir no Instagram"
    : playback.isYouTube
      ? "Abrir no YouTube"
      : "Abrir vídeo";
  const showExternalFallback = Boolean(playback.ytId) && isIOSNativeApp();
  const posterUrl =
    thumbnailUrl || (playback.ytId ? buildYouTubeThumbnailUrl(playback.ytId) : null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleIframeLoad = () => {
    if (!playback.isYouTube) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
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
          {playback.preferExternalPlayer ? (
            <div className="relative w-full h-full">
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt={title || "Vlog"}
                  className="absolute inset-0 w-full h-full object-cover opacity-50"
                />
              ) : null}
              <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
                <p className="text-sm text-white/85 max-w-sm">
                  Reels e posts do Instagram abrem no app oficial para reproduzir corretamente.
                </p>
                <Button
                  type="button"
                  className="bg-[#E1306C] hover:bg-[#c13584] text-white"
                  onClick={() => openVideoExternally(playback.watchUrl)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {externalLabel}
                </Button>
              </div>
            </div>
          ) : playback.embedUrl ? (
            <>
              {playback.ytId && (
                <img
                  src={buildYouTubeThumbnailUrl(playback.ytId)}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-40"
                />
              )}
              <iframe
                ref={iframeRef}
                key={playback.embedUrl}
                src={playback.embedUrl}
                title={title || "Vlog"}
                allow={iframeAllow}
                referrerPolicy={iframeReferrerPolicy}
                allowFullScreen
                onLoad={handleIframeLoad}
                className="relative h-full w-full"
              />
            </>
          ) : playback.isDirect ? (
            <video src={playback.url} controls autoPlay playsInline className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                {playback.ytId
                  ? "Não foi possível carregar o player embutido."
                  : "Não foi possível embutir esse vídeo no app."}
              </p>
              <Button type="button" variant="secondary" onClick={() => openVideoExternally(playback.watchUrl)}>
                <ExternalLink className="h-4 w-4 mr-2" />
                {externalLabel}
              </Button>
            </div>
          )}
        </div>

        {showExternalFallback && !playback.preferExternalPlayer && (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => openVideoExternally(playback.watchUrl)}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {externalLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
