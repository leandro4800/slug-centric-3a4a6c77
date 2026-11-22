import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Send, Trash2, Eye, Heart, MoreHorizontal, MessageCircle, Check, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { STORY_REACOES, formatStoryAge, type StoryGroup, type StoryRow } from "./story-types";

export interface StoryMembro {
  id: string;
  nome_completo: string | null;
  avatar_url: string | null;
}

interface Props {
  groups: StoryGroup[];
  startGroup: number;
  startItem?: number;
  currentUserId: string;
  membros: StoryMembro[];
  onClose: () => void;
  onViewed: (story: StoryRow) => void;
  onReact: (story: StoryRow, emoji: string | null, resposta: string | null) => void;
  onDelete: (story: StoryRow) => void;
  onShare: (story: StoryRow, destinatarioId: string) => Promise<boolean>;
  onOpenDirect: (userId: string) => void;
}

type Sheet = null | "views" | "share" | "menu";

const DEFAULT_DURATION = 5;
const HOLD_MS = 220;

const iniciais = (nome?: string | null) => nome?.substring(0, 2).toUpperCase() || "U";

export const StoriesViewer = ({
  groups,
  startGroup,
  startItem = 0,
  currentUserId,
  membros,
  onClose,
  onViewed,
  onReact,
  onDelete,
  onShare,
  onOpenDirect,
}: Props) => {
  const [gi, setGi] = useState(startGroup);
  const [ii, setIi] = useState(startItem);
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [composing, setComposing] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [resposta, setResposta] = useState("");
  const [curtidos, setCurtidos] = useState<Set<string>>(new Set());
  const [enviadosPara, setEnviadosPara] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressRef = useRef(0);
  const pointer = useRef<{ x: number; y: number; t: number } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const group = groups[gi];
  const story = group?.items[ii];
  const paused = holding || composing || sheet !== null;

  const ir = useCallback((g: number, i: number) => {
    progressRef.current = 0;
    setProgress(0);
    setResposta("");
    setSheet(null);
    setEnviadosPara(new Set());
    setGi(g);
    setIi(i);
  }, []);

  const next = useCallback(() => {
    if (!group) return onClose();
    if (ii < group.items.length - 1) ir(gi, ii + 1);
    else if (gi < groups.length - 1) ir(gi + 1, 0);
    else onClose();
  }, [gi, ii, group, groups.length, onClose, ir]);

  const prev = useCallback(() => {
    if (ii > 0) ir(gi, ii - 1);
    else if (gi > 0) ir(gi - 1, Math.max(0, groups[gi - 1].items.length - 1));
    else ir(gi, 0);
  }, [gi, ii, groups, ir]);

  // registra visualização (o dono nunca conta)
  useEffect(() => {
    if (story && story.origem === "post" && !story.visto && story.user_id !== currentUserId) onViewed(story);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  // barra de progresso / auto-avanço (vídeo controla pelo timeupdate)
  useEffect(() => {
    if (!story || paused) return;
    if (story.tipo === "video" && story.media_url) return;
    const total = (story.duracao_seg || DEFAULT_DURATION) * 1000;
    const step = 50;
    let elapsed = progressRef.current * total;
    const timer = setInterval(() => {
      elapsed += step;
      const p = Math.min(1, elapsed / total);
      progressRef.current = p;
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
    const v = videoRef.current;
    if (!v) return;
    if (paused) v.pause();
    else void v.play().catch(() => {});
  }, [paused, story?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (composing) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose, composing]);

  const isMine = !!story && story.user_id === currentUserId;
  const isPost = story?.origem === "post";

  // visualizações + reações do próprio story (só o dono consegue ler)
  const { data: atividade } = useQuery({
    queryKey: ["story-atividade", story?.id],
    enabled: !!story && isMine && isPost,
    staleTime: 15_000,
    queryFn: async () => {
      const [views, reacoes] = await Promise.all([
        supabase
          .from("comunidade_story_views" as any)
          .select("user_id, criado_em")
          .eq("story_id", story!.id)
          .neq("user_id", currentUserId)
          .order("criado_em", { ascending: false }),
        supabase.from("comunidade_story_reacoes" as any).select("user_id, emoji").eq("story_id", story!.id),
      ]);
      const emojis = new Map<string, string>();
      ((reacoes.data as any[]) || []).forEach((r) => r.emoji && emojis.set(r.user_id, r.emoji));
      return ((views.data as any[]) || []).map((v) => ({
        user_id: v.user_id as string,
        criado_em: v.criado_em as string,
        emoji: emojis.get(v.user_id) || null,
      }));
    },
  });

  const membroPorId = useMemo(() => new Map(membros.map((m) => [m.id, m])), [membros]);

  if (!group || !story) return null;

  const isVideo = story.tipo === "video" && !!story.media_url;
  const legenda = story.texto || story.detalhe;
  const curtido = curtidos.has(story.id);
  const totalViews = atividade?.length ?? 0;

  const enviarResposta = () => {
    const t = resposta.trim();
    if (!t) return;
    onReact(story, null, t);
    setResposta("");
    setComposing(false);
  };

  const curtir = () => {
    if (curtido) return;
    setCurtidos((s) => new Set(s).add(story.id));
    onReact(story, "❤️", null);
  };

  const listaShare = membros
    .filter((m) => m.id !== currentUserId)
    .filter((m) => (m.nome_completo || "").toLowerCase().includes(busca.toLowerCase()));

  const stop = {
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    onPointerUp: (e: React.PointerEvent) => e.stopPropagation(),
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
  };

  return (
    <div className="fixed inset-0 z-[300] flex justify-center bg-black text-white" role="dialog" aria-label="Stories">
      <div className="relative flex h-full w-full max-w-[min(100vw,56.25dvh)] flex-col">
        {/* mídia 9:16 */}
        <div
          className="relative flex-1 select-none overflow-hidden rounded-b-xl bg-zinc-950 sm:rounded-xl"
          style={{ touchAction: "none" }}
          onPointerDown={(e) => {
            if (composing) {
              (document.activeElement as HTMLElement | null)?.blur();
              return;
            }
            pointer.current = { x: e.clientX, y: e.clientY, t: Date.now() };
            holdTimer.current = setTimeout(() => setHolding(true), HOLD_MS);
          }}
          onPointerUp={(e) => {
            if (holdTimer.current) clearTimeout(holdTimer.current);
            const s = pointer.current;
            pointer.current = null;
            setHolding(false);
            if (!s || sheet) return;
            const dx = e.clientX - s.x;
            const dy = e.clientY - s.y;
            if (dy > 90 && Math.abs(dy) > Math.abs(dx)) return onClose();
            if (dx < -60 && Math.abs(dx) > Math.abs(dy)) return gi < groups.length - 1 ? ir(gi + 1, 0) : onClose();
            if (dx > 60 && Math.abs(dx) > Math.abs(dy)) return gi > 0 ? ir(gi - 1, 0) : undefined;
            if (Date.now() - s.t >= HOLD_MS + 30) return; // segurou: só pausou
            if (Math.abs(dx) > 12 || Math.abs(dy) > 12) return;
            const r = e.currentTarget.getBoundingClientRect();
            if (e.clientX - r.left < r.width / 2) prev();
            else next();
          }}
          onPointerCancel={() => {
            if (holdTimer.current) clearTimeout(holdTimer.current);
            pointer.current = null;
            setHolding(false);
          }}
        >
          {isVideo ? (
            <video
              key={story.id}
              ref={videoRef}
              src={story.media_url!}
              poster={story.thumb_url || undefined}
              autoPlay
              playsInline
              className="absolute inset-0 h-full w-full object-contain"
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (v.duration) setProgress(Math.min(1, v.currentTime / v.duration));
              }}
              onEnded={next}
            />
          ) : story.media_url ? (
            <>
              <img
                src={story.media_url}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl"
              />
              <img
                key={story.id}
                src={story.media_url}
                alt={story.texto || "Story"}
                draggable={false}
                className="absolute inset-0 h-full w-full object-contain"
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/50 via-black to-black p-10">
              <div className="text-center">
                <p className="text-2xl font-black leading-snug">{story.texto}</p>
                {story.detalhe && <p className="mt-2 text-sm text-white/70">{story.detalhe}</p>}
              </div>
            </div>
          )}

          {/* topo: progresso + cabeçalho */}
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/60 to-transparent pb-8 transition-opacity ${
              holding ? "opacity-0" : "opacity-100"
            }`}
          >
            <div className="flex gap-1 px-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
              {group.items.map((it, idx) => (
                <div key={it.id} className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/30">
                  <div
                    className="h-full bg-white"
                    style={{ width: idx < ii ? "100%" : idx === ii ? `${progress * 100}%` : "0%" }}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2.5 px-3 pt-3">
              <Avatar className="h-8 w-8 border border-white/30">
                <AvatarImage src={group.avatar_url || ""} className="object-cover" />
                <AvatarFallback className="bg-zinc-800 text-[10px] text-white">{iniciais(group.nome_completo)}</AvatarFallback>
              </Avatar>
              <p className="truncate text-sm font-semibold">{isMine ? "Seu story" : group.nome_completo || "Atleta"}</p>
              <p className="shrink-0 text-sm text-white/70">{formatStoryAge(story.criado_em)}</p>
              <div className="pointer-events-auto ml-auto flex items-center gap-1" {...stop}>
                <button onClick={() => setSheet("menu")} className="p-2" aria-label="Mais opções">
                  <MoreHorizontal className="h-6 w-6" />
                </button>
                <button onClick={onClose} className="p-2" aria-label="Fechar">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>

          {/* legenda sobre a mídia */}
          {story.media_url && legenda && (
            <div className="pointer-events-none absolute inset-x-4 bottom-5 z-10 rounded-2xl bg-black/50 px-4 py-3 text-center backdrop-blur-sm">
              {story.texto && <p className="text-sm font-semibold">{story.texto}</p>}
              {story.detalhe && <p className="text-xs text-white/70">{story.detalhe}</p>}
            </div>
          )}
        </div>

        {/* rodapé */}
        <div className="z-20 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3" {...stop}>
          {isMine ? (
            isPost ? (
              <button
                onClick={() => setSheet("views")}
                className="flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-semibold"
                aria-label="Ver quem visualizou"
              >
                <Eye className="h-5 w-5" /> {totalViews}
                <span className="font-normal text-white/60">{totalViews === 1 ? "visualização" : "visualizações"}</span>
              </button>
            ) : (
              <p className="px-2 py-1.5 text-xs text-white/60">Conquista automática · visível por 24h</p>
            )
          ) : (
            <>
              {composing && (
                <div className="mb-3 flex justify-around">
                  {STORY_REACOES.map((emoji) => (
                    <button
                      key={emoji}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onReact(story, emoji, null);
                        setComposing(false);
                        (document.activeElement as HTMLElement | null)?.blur();
                      }}
                      className="text-3xl transition-transform active:scale-125"
                      aria-label={`Reagir com ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3">
                <input
                  value={resposta}
                  onFocus={() => setComposing(true)}
                  onBlur={() => setComposing(false)}
                  onChange={(e) => setResposta(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      enviarResposta();
                    }
                  }}
                  placeholder="Enviar mensagem"
                  aria-label="Enviar mensagem"
                  className="h-11 min-w-0 flex-1 rounded-full border border-white/50 bg-transparent px-4 text-sm text-white placeholder:text-white/70 focus:outline-none focus:ring-1 focus:ring-white/70"
                />
                <button onClick={curtir} aria-label="Curtir story" className="p-1 transition-transform active:scale-125">
                  <Heart className={`h-7 w-7 ${curtido ? "fill-primary text-primary" : ""}`} />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => (resposta.trim() ? enviarResposta() : setSheet("share"))}
                  aria-label={resposta.trim() ? "Enviar resposta" : "Compartilhar story"}
                  className="p-1"
                >
                  <Send className="h-7 w-7 -rotate-12" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* bottom sheets */}
        {sheet && (
          <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/60" onClick={() => setSheet(null)}>
            <div
              className="max-h-[70%] overflow-y-auto rounded-t-2xl bg-zinc-900 pb-[max(1rem,env(safe-area-inset-bottom))]"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/30" />

              {sheet === "menu" && (
                <div className="py-2">
                  {isMine && isPost && (
                    <button
                      onClick={() => onDelete(story)}
                      className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-sm font-semibold text-destructive"
                    >
                      <Trash2 className="h-5 w-5" /> Excluir story
                    </button>
                  )}
                  {!isMine && (
                    <button
                      onClick={() => onOpenDirect(story.user_id)}
                      className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-sm"
                    >
                      <MessageCircle className="h-5 w-5" /> Enviar mensagem para {group.nome_completo || "atleta"}
                    </button>
                  )}
                  {isMine && isPost && (
                    <button
                      onClick={() => setSheet("views")}
                      className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-sm"
                    >
                      <Eye className="h-5 w-5" /> Ver visualizações
                    </button>
                  )}
                  <button onClick={() => setSheet(null)} className="w-full px-5 py-3.5 text-left text-sm text-white/70">
                    Cancelar
                  </button>
                </div>
              )}

              {sheet === "views" && (
                <div className="px-4 py-3">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Eye className="h-4 w-4" /> {totalViews} {totalViews === 1 ? "visualização" : "visualizações"}
                  </p>
                  {totalViews === 0 && <p className="py-6 text-center text-sm text-white/60">Ninguém viu ainda.</p>}
                  {atividade?.map((v) => {
                    const p = membroPorId.get(v.user_id);
                    return (
                      <div key={v.user_id} className="flex items-center gap-3 py-2">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={p?.avatar_url || ""} className="object-cover" />
                          <AvatarFallback className="bg-zinc-800 text-xs text-white">{iniciais(p?.nome_completo)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{p?.nome_completo || "Membro"}</p>
                          <p className="text-xs text-white/60">
                            {new Date(v.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            {" · "}
                            {formatStoryAge(v.criado_em)}
                          </p>
                        </div>
                        {v.emoji && <span className="text-xl">{v.emoji}</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {sheet === "share" && (
                <div className="px-4 py-3">
                  <p className="mb-3 text-sm font-semibold">Enviar para</p>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                    <input
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Buscar pessoa…"
                      className="h-10 w-full rounded-full bg-white/10 pl-9 pr-3 text-sm text-white placeholder:text-white/50 focus:outline-none"
                    />
                  </div>
                  {listaShare.map((m) => {
                    const enviado = enviadosPara.has(m.id);
                    return (
                      <div key={m.id} className="flex items-center gap-3 py-2">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={m.avatar_url || ""} className="object-cover" />
                          <AvatarFallback className="bg-zinc-800 text-xs text-white">{iniciais(m.nome_completo)}</AvatarFallback>
                        </Avatar>
                        <p className="min-w-0 flex-1 truncate text-sm">{m.nome_completo}</p>
                        <button
                          disabled={enviado}
                          onClick={async () => {
                            const ok = await onShare(story, m.id);
                            if (ok) setEnviadosPara((s) => new Set(s).add(m.id));
                          }}
                          className={`flex h-8 items-center gap-1 rounded-full px-4 text-xs font-semibold ${
                            enviado ? "bg-white/10 text-white/70" : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {enviado ? (
                            <>
                              <Check className="h-3.5 w-3.5" /> Enviado
                            </>
                          ) : (
                            "Enviar"
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoriesViewer;
