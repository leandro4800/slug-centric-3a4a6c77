import { useEffect, useMemo, useRef, useState } from "react";
import { Music, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { extractYouTubeId, isDirectVideo } from "@/lib/utils";
import { buildYouTubeEmbedUrl, YOUTUBE_IFRAME_ALLOW, YOUTUBE_IFRAME_REFERRER_POLICY } from "@/lib/youtube-embed";

type Source =
  | { kind: "youtube"; id: string }
  | { kind: "spotify"; embed: string }
  | { kind: "soundcloud"; embed: string }
  | { kind: "audio"; url: string }
  | { kind: "unknown"; url: string };

const detect = (url: string): Source | null => {
  if (!url) return null;
  const u = url.trim();
  const yt = extractYouTubeId(u);
  if (yt) return { kind: "youtube", id: yt };
  if (/spotify\.com\/(track|playlist|album|episode|show)\//i.test(u)) {
    const embed = u.replace("spotify.com/", "spotify.com/embed/");
    return { kind: "spotify", embed };
  }
  if (/soundcloud\.com\//i.test(u)) {
    return { kind: "soundcloud", embed: `https://w.soundcloud.com/player/?url=${encodeURIComponent(u)}&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false` };
  }
  if (/\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i.test(u) || isDirectVideo(u)) {
    return { kind: "audio", url: u };
  }
  return { kind: "unknown", url: u };
};

const ProfileMusicPlayer = ({ url }: { url: string | null | undefined }) => {
  const source = useMemo(() => (url ? detect(url) : null), [url]);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const ytRef = useRef<HTMLIFrameElement>(null);

  // Tenta dar play assim que monta. Se o navegador bloquear o autoplay com som,
  // registra um listener global que dispara o play no primeiro gesto do usuário
  // (toque/clique em qualquer lugar) — sem precisar clicar no ícone do player.
  useEffect(() => {
    if (!source) return;

    const ytPlay = () => {
      ytRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "playVideo", args: [] }),
        "*"
      );
    };

    const tryPlay = async () => {
      if (source.kind === "audio" && audioRef.current) {
        audioRef.current.muted = muted;
        try {
          await audioRef.current.play();
          setPlaying(true);
          return true;
        } catch {
          return false;
        }
      }
      if (source.kind === "youtube") {
        ytPlay();
        return true;
      }
      return true;
    };

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    tryPlay().then((ok) => {
      if (cancelled || ok) return;
      const handler = () => {
        tryPlay();
        cleanup?.();
      };
      const events: (keyof DocumentEventMap)[] = [
        "pointerdown",
        "touchstart",
        "click",
        "keydown",
      ];
      events.forEach((ev) =>
        document.addEventListener(ev, handler, { once: true, capture: true })
      );
      cleanup = () => {
        events.forEach((ev) =>
          document.removeEventListener(ev, handler, true)
        );
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  if (!source) return null;

  const togglePlay = () => {
    setPlaying((p) => {
      const next = !p;
      if (source.kind === "audio" && audioRef.current) {
        if (next) audioRef.current.play().catch(() => {});
        else audioRef.current.pause();
      }
      if (source.kind === "youtube" && ytRef.current) {
        const cmd = next ? "playVideo" : "pauseVideo";
        ytRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: cmd, args: [] }),
          "*"
        );
      }
      return next;
    });
  };

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      if (source.kind === "audio" && audioRef.current) audioRef.current.muted = next;
      if (source.kind === "youtube" && ytRef.current) {
        const cmd = next ? "mute" : "unMute";
        ytRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: cmd, args: [] }),
          "*"
        );
      }
      return next;
    });
  };

  return (
    <>
      {/* Player invisível */}
      <div className="absolute -z-10 opacity-0 pointer-events-none" aria-hidden>
        {source.kind === "youtube" && (
          <iframe
            ref={ytRef}
            src={buildYouTubeEmbedUrl(source.id, {
              autoplay: true,
              loop: true,
              controls: false,
              enablejsapi: true,
              playsinline: true,
            })}
            allow={YOUTUBE_IFRAME_ALLOW}
            referrerPolicy={YOUTUBE_IFRAME_REFERRER_POLICY}
            title="background-music"
          />
        )}
        {source.kind === "spotify" && (
          <iframe
            src={source.embed}
            allow="autoplay; encrypted-media"
            title="background-music"
          />
        )}
        {source.kind === "soundcloud" && (
          <iframe
            src={source.embed}
            allow="autoplay"
            title="background-music"
          />
        )}
        {source.kind === "audio" && (
          <audio ref={audioRef} src={source.url} loop autoPlay />
        )}
      </div>

      {/* Botão flutuante de controle */}
      <div className="fixed bottom-24 right-4 z-40 flex items-center gap-1 rounded-full bg-black/70 backdrop-blur border border-white/15 px-2 py-1.5 shadow-lg">
        <Music className="h-3.5 w-3.5 text-primary" />
        <button
          onClick={togglePlay}
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
          aria-label={playing ? "Pausar música" : "Tocar música"}
        >
          {playing ? <Pause className="h-3.5 w-3.5 text-white" /> : <Play className="h-3.5 w-3.5 text-white" />}
        </button>
        {source.kind !== "spotify" && source.kind !== "soundcloud" && (
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
            aria-label={muted ? "Ativar som" : "Silenciar"}
          >
            {muted ? <VolumeX className="h-3.5 w-3.5 text-white" /> : <Volume2 className="h-3.5 w-3.5 text-white" />}
          </button>
        )}
      </div>
    </>
  );
};

export default ProfileMusicPlayer;
