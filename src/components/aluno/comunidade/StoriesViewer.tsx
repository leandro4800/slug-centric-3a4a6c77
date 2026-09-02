import { useCallback, useEffect, useRef, useState } from "react";
import { X, Send, Trash2, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { STORY_REACOES, type StoryGroup, type StoryRow } from "./story-types";

interface Props {
  groups: StoryGroup[];
  startGroup: number;
  currentUserId: string;
  onClose: () => void;
  onViewed: (story: StoryRow) => void;
  onReact: (story: StoryRow, emoji: string | null, resposta: string | null) => void;
  onDelete: (story: StoryRow) => void;
}

const DEFAULT_DURATION = 5;

export const StoriesViewer = ({
  groups,
  startGroup,
  currentUserId,
  onClose,
  onViewed,
  onReact,
  onDelete,
}: Props) => {
  const [gi, setGi] = useState(startGroup);
  const [ii, setIi] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resposta, setResposta] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressRef = useRef(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const group = groups[gi];
  const story = group?.items[ii];

  const next = useCallback(() => {
    setProgress(0);
    setResposta("");
    if (!group) return onClose();
    if (ii < group.items.length - 1) {
      setIi(ii + 1);
    } else if (gi < groups.length - 1) {
      setGi(gi + 1);
      setIi(0);
    } else {
      onClose();
    }
  }, [gi, ii, group, groups.length, onClose]);

  const prev = useCallback(() => {
    setProgress(0);
    setResposta("");
    if (ii > 0) {
      setIi(ii - 1);
    } else if (gi > 0) {
      const pg = gi - 1;
      setGi(pg);
      setIi(Math.max(0, groups[pg].items.length - 1));
    }
  }, [gi, ii, groups]);

  // marca como visto
  useEffect(() => {
    if (story && story.origem === "post" && !story.visto) onViewed(story);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  // barra de progresso / auto-avanço
  useEffect(() => {
    if (!story || paused) return;
    const isVideo = story.tipo === "video" && !!story.media_url;
    if (isVideo) return; // vídeo controla pelo timeupdate
    const total = (story.duracao_seg || DEFAULT_DURATION) * 1000;
    const step = 50;
    let elapsed = progressRef.current * total;
    const timer = setInterval(() => {
      elapsed += step;
      const p = Math.min(1, elapsed / total);
      setProgress(p);
      if (p >= 1) {
        clearInterval(timer);
        next();
      }
    }, step);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id, paused]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // pausa/retoma o vídeo junto com o timer
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (paused) v.pause();
    else void v.play().catch(() => {});
  }, [paused, story?.id]);


  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  if (!group || !story) return null;

  const isVideo = story.tipo === "video" && !!story.media_url;
  const isMine = story.user_id === currentUserId;

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col bg-black"
      onTouchStart={(e) => {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        setPaused(false);
        const s = touchStart.current;
        touchStart.current = null;
        if (!s) return;
        const dx = e.changedTouches[0].clientX - s.x;
        const dy = e.changedTouches[0].clientY - s.y;
        if (dy > 90 && Math.abs(dy) > Math.abs(dx)) return onClose();
        if (dx < -60) {
          setGi((g) => Math.min(groups.length - 1, g + 1));
          setIi(0);
          setProgress(0);
          return;
        }
        if (dx > 60) {
          setGi((g) => Math.max(0, g - 1));
          setIi(0);
          setProgress(0);
          return;
        }
      }}
    >
      {/* barras de progresso */}
      <div className="absolute left-0 right-0 top-0 z-20 flex gap-1 px-3 pt-3">
        {group.items.map((_, idx) => (
          <div key={idx} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full bg-white transition-[width] duration-75"
              style={{ width: idx < ii ? "100%" : idx === ii ? `${progress * 100}%` : "0%" }}
            />
          </div>
        ))}
      </div>

      {/* cabeçalho */}
      <div className="absolute left-0 right-0 top-6 z-20 flex items-center gap-3 px-4 py-3">
        <Avatar className="h-9 w-9 border border-white/40">
          <AvatarImage src={group.avatar_url || ""} className="object-cover" />
          <AvatarFallback className="bg-zinc-800 text-xs text-white">
            {group.nome_completo?.substring(0, 2).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 leading-tight">
          <p className="text-sm font-semibold text-white">{group.nome_completo || "Atleta"}</p>
          <p className="text-[11px] text-white/60">
            {formatDistanceToNow(new Date(story.criado_em), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
        {isMine && story.origem === "post" && (
          <button
            onClick={() => onDelete(story)}
            className="rounded-full bg-black/40 p-2 text-white/80"
            aria-label="Excluir story"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <button onClick={onClose} className="rounded-full bg-black/40 p-2 text-white" aria-label="Fechar">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* conteúdo */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {isVideo ? (
          <video
            ref={videoRef}
            src={story.media_url!}
            autoPlay
            playsInline
            className="h-full w-full object-contain"
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v.duration) setProgress(Math.min(1, v.currentTime / v.duration));
            }}
            onEnded={next}
          />
        ) : story.media_url ? (
          <img src={story.media_url} alt={story.texto || "Story"} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/40 via-black to-black p-10">
            <p className="text-center text-2xl font-black leading-snug text-white">
              {story.texto || story.detalhe}
            </p>
          </div>
        )}

        {story.media_url && (story.texto || story.detalhe) && (
          <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-black/50 px-4 py-3 backdrop-blur-sm">
            <p className="text-sm font-semibold text-white">{story.texto}</p>
            {story.detalhe && <p className="text-xs text-white/70">{story.detalhe}</p>}
          </div>
        )}

        {/* zonas de toque */}
        <button className="absolute inset-y-0 left-0 w-1/3" onClick={prev} aria-label="Anterior" />
        <button className="absolute inset-y-0 right-0 w-1/3" onClick={next} aria-label="Próximo" />
      </div>

      {/* rodapé: reações e resposta */}
      <div
        className="z-20 border-t border-white/10 bg-black px-4 pb-6 pt-3"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {isMine ? (
          <div className="flex items-center justify-center gap-2 text-xs text-white/60">
            <Eye className="h-4 w-4" /> Seu story fica visível por 24h
          </div>
        ) : (
          <>
            <div className="mb-3 flex justify-center gap-3">
              {STORY_REACOES.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onReact(story, emoji, null)}
                  className="text-2xl transition-transform active:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={resposta}
                onFocus={() => setComposing(true)}
                onBlur={() => setComposing(false)}
                onChange={(e) => setResposta(e.target.value)}
                placeholder="Responder…"
                className="h-11 rounded-full border-white/20 bg-white/10 text-white placeholder:text-white/40"
              />
              <Button
                size="icon"
                className="h-11 w-11 shrink-0 rounded-full"
                disabled={!resposta.trim()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onReact(story, null, resposta.trim());
                  setResposta("");
                  setComposing(false);
                }}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>

    </div>
  );
};

export default StoriesViewer;
