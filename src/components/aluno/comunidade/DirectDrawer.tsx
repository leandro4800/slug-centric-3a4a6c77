import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Send, X, Search, Smile, Mic, Trash2, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import AudioMessagePlayer from "./AudioMessagePlayer";
import { useAudioRecorder, type GravacaoAudio } from "./useAudioRecorder";
import { isStoryMessage, isStoryRefActive, storyMessageLabel } from "./story-types";
import {
  AUDIO_BUCKET,
  AUDIO_MIN_SEG,
  baseMime,
  buildAudioPath,
  formatAudioTime,
} from "@/lib/comunidade-audio";

export interface DirectPerfil {
  id: string;
  nome_completo: string;
  avatar_url: string | null;
}

export interface DirectMensagem {
  id: string;
  tenant_id: string;
  remetente_id: string;
  destinatario_id: string;
  texto: string | null;
  emoji: string | null;
  story_id: string | null;
  lida_em: string | null;
  criado_em: string;
  tipo?: "texto" | "audio" | null;
  audio_path?: string | null;
  audio_duracao_seg?: number | null;
  story_autor_id: string | null;
  story_origem: "post" | "conquista" | null;
  story_tipo: string | null;
  story_media_url: string | null;
  story_thumb_url: string | null;
  story_texto: string | null;
  story_expira_em: string | null;
}

const novoId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const previewMensagem = (m: DirectMensagem, currentUserId: string) => {
  if (m.tipo === "audio") return "🎤 Áudio";
  const label = storyMessageLabel(m, currentUserId);
  const corpo = m.texto || m.emoji || "";
  return label ? `${label}${corpo ? " · " + corpo : ""}` : corpo;
};

/** Miniatura do story citado na mensagem (foto, vídeo ou conquista). */
const StoryThumb = ({ m, onOpen }: { m: DirectMensagem; onOpen: () => void }) => {
  const ativo = isStoryRefActive(m);
  if (!ativo) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="flex aspect-[9/16] w-24 items-center justify-center rounded-xl border border-border bg-muted p-2 text-center text-[11px] text-muted-foreground"
      >
        Story indisponível
      </button>
    );
  }
  const isVideo = m.story_tipo === "video";
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Abrir story"
      className="relative aspect-[9/16] w-24 overflow-hidden rounded-xl border border-border bg-muted"
    >
      {m.story_media_url ? (
        isVideo ? (
          m.story_thumb_url ? (
            <img src={m.story_thumb_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <video src={`${m.story_media_url}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
          )
        ) : (
          <img src={m.story_media_url} alt="" className="h-full w-full object-cover" />
        )
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/50 via-background to-background p-2">
          <p className="line-clamp-5 text-center text-[10px] font-bold leading-tight">{m.story_texto || "Story"}</p>
        </div>
      )}
      {isVideo && (
        <span className="absolute right-1 top-1 rounded bg-background/70 px-1 text-[9px] font-bold">▶</span>
      )}
    </button>
  );
};

const EMOJIS = ["❤️", "💪", "🔥", "👏", "😮", "😂", "🙏", "👊"];

interface Props {
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  tenantId: string;
  membros: DirectPerfil[];
  initialPeerId?: string | null;
  onUnreadChange?: (n: number) => void;
  /** Abre o story citado; devolve false se ele não estiver mais disponível. */
  onOpenStory?: (m: DirectMensagem) => boolean;
}

export const DirectDrawer = ({
  open,
  onClose,
  currentUserId,
  tenantId,
  membros,
  initialPeerId,
  onUnreadChange,
  onOpenStory,
}: Props) => {
  const [mensagens, setMensagens] = useState<DirectMensagem[]>([]);
  const [peerId, setPeerId] = useState<string | null>(initialPeerId ?? null);
  const [texto, setTexto] = useState("");
  const [busca, setBusca] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { toast } = useToast();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [enviandoAudio, setEnviandoAudio] = useState(false);
  const enviarAudioRef = useRef<() => void>(() => {});
  const recorder = useAudioRecorder(() => enviarAudioRef.current());

  const perfilDe = useCallback(
    (id: string) => membros.find((m) => m.id === id),
    [membros]
  );

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("comunidade_mensagens" as any)
      .select("*")
      .or(`remetente_id.eq.${currentUserId},destinatario_id.eq.${currentUserId}`)
      .order("criado_em", { ascending: true })
      .limit(500);
    setMensagens(((data as any) || []) as DirectMensagem[]);
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    void load();
    const channel = supabase
      .channel("direct-mensagens")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comunidade_mensagens" },
        (payload) => {
          const m = payload.new as DirectMensagem;
          if (m.remetente_id !== currentUserId && m.destinatario_id !== currentUserId) return;
          setMensagens((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, load]);

  useEffect(() => {
    if (open && initialPeerId) setPeerId(initialPeerId);
  }, [open, initialPeerId]);

  const naoLidas = useMemo(
    () => mensagens.filter((m) => m.destinatario_id === currentUserId && !m.lida_em),
    [mensagens, currentUserId]
  );

  useEffect(() => {
    onUnreadChange?.(naoLidas.length);
  }, [naoLidas.length, onUnreadChange]);

  const conversas = useMemo(() => {
    const map = new Map<string, { peer: string; ultima: DirectMensagem; naoLidas: number }>();
    mensagens.forEach((m) => {
      const peer = m.remetente_id === currentUserId ? m.destinatario_id : m.remetente_id;
      const atual = map.get(peer);
      const inc = m.destinatario_id === currentUserId && !m.lida_em ? 1 : 0;
      if (!atual || +new Date(m.criado_em) >= +new Date(atual.ultima.criado_em)) {
        map.set(peer, { peer, ultima: m, naoLidas: (atual?.naoLidas || 0) + inc });
      } else {
        atual.naoLidas += inc;
      }
    });
    return [...map.values()].sort(
      (a, b) => +new Date(b.ultima.criado_em) - +new Date(a.ultima.criado_em)
    );
  }, [mensagens, currentUserId]);

  const thread = useMemo(
    () =>
      peerId
        ? mensagens.filter(
            (m) =>
              (m.remetente_id === peerId && m.destinatario_id === currentUserId) ||
              (m.destinatario_id === peerId && m.remetente_id === currentUserId)
          )
        : [],
    [mensagens, peerId, currentUserId]
  );

  // marca como lidas: ao abrir o Direct (todas) e ao abrir uma conversa
  useEffect(() => {
    if (!open) return;
    const ids = mensagens
      .filter(
        (m) =>
          m.destinatario_id === currentUserId &&
          !m.lida_em &&
          (!peerId || m.remetente_id === peerId)
      )
      .map((m) => m.id);
    if (!ids.length) return;
    const agora = new Date().toISOString();
    setMensagens((prev) =>
      prev.map((m) => (ids.includes(m.id) ? { ...m, lida_em: agora } : m))
    );
    void supabase
      .from("comunidade_mensagens" as any)
      .update({ lida_em: agora } as any)
      .in("id", ids)
      .then(({ error }) => {
        if (error) void load();
      });
  }, [open, peerId, mensagens, currentUserId, load]);


  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length, peerId]);

  const enviar = async (conteudo: string, emoji?: string) => {
    if (!peerId || (!conteudo.trim() && !emoji)) return;
    setEnviando(true);
    try {
      const { data, error } = await supabase
        .from("comunidade_mensagens" as any)
        .insert({
          tenant_id: tenantId,
          remetente_id: currentUserId,
          destinatario_id: peerId,
          texto: conteudo.trim() || null,
          emoji: emoji || null,
        } as any)
        .select()
        .maybeSingle();
      if (error) {
        toast({
          title: "Não foi possível enviar a mensagem",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      if (data) {
        const m = data as unknown as DirectMensagem;
        setMensagens((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        setTexto("");
      }
    } catch (e) {
      toast({
        title: "Não foi possível enviar a mensagem",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
    }
  };

  const enviarAudio = async (grav: GravacaoAudio) => {
    if (!peerId) return;
    if (grav.duracaoSeg < AUDIO_MIN_SEG) {
      toast({ title: "Áudio muito curto", description: "Grave pelo menos 1 segundo." });
      return;
    }
    setEnviandoAudio(true);
    const mime = baseMime(grav.mime);
    const path = buildAudioPath(tenantId, currentUserId, novoId(), mime);
    try {
      const up = await supabase.storage
        .from(AUDIO_BUCKET)
        .upload(path, grav.blob, { contentType: mime, upsert: false });
      if (up.error) throw up.error;
      const { data, error } = await supabase
        .from("comunidade_mensagens" as any)
        .insert({
          tenant_id: tenantId,
          remetente_id: currentUserId,
          destinatario_id: peerId,
          tipo: "audio",
          audio_path: path,
          audio_duracao_seg: grav.duracaoSeg,
        } as any)
        .select()
        .maybeSingle();
      if (error) {
        void supabase.storage.from(AUDIO_BUCKET).remove([path]);
        throw error;
      }
      if (data) {
        const m = data as unknown as DirectMensagem;
        setMensagens((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      }
    } catch (e) {
      toast({
        title: "Não foi possível enviar o áudio",
        description: e instanceof Error ? e.message : String((e as any)?.message || e),
        variant: "destructive",
      });
    } finally {
      setEnviandoAudio(false);
    }
  };

  const pararEEnviar = async () => {
    const grav = await recorder.parar();
    if (grav) await enviarAudio(grav);
  };
  enviarAudioRef.current = () => void pararEEnviar();

  const iniciarGravacao = async () => {
    try {
      await recorder.iniciar();
    } catch (e) {
      toast({
        title: "Microfone indisponível",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const abrirStory = (m: DirectMensagem) => {
    if (!isStoryRefActive(m) || !onOpenStory?.(m)) {
      toast({ title: "Story indisponível", description: "Esse story expirou ou foi apagado." });
    }
  };

  // ao sair da conversa/fechar, descarta gravação em andamento
  useEffect(() => {
    if (!open || !peerId) recorder.cancelar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, peerId]);

  if (!open) return null;

  const peer = peerId ? perfilDe(peerId) : null;
  const listaMembros = membros
    .filter((m) => m.id !== currentUserId)
    .filter((m) => (m.nome_completo || "").toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[320] flex flex-col bg-background">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        {peerId ? (
          <button onClick={() => setPeerId(null)} aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : null}
        {peer ? (
          <>
            <Avatar className="h-9 w-9">
              <AvatarImage src={peer.avatar_url || ""} className="object-cover" />
              <AvatarFallback className="bg-muted text-xs">
                {peer.nome_completo?.substring(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <p className="flex-1 truncate text-sm font-semibold">{peer.nome_completo}</p>
          </>
        ) : (
          <h2 className="flex-1 font-display text-xl tracking-tight">DIRECT</h2>
        )}
        <button onClick={onClose} aria-label="Fechar">
          <X className="h-5 w-5" />
        </button>
      </div>

      {!peerId ? (
        <div className="flex-1 overflow-y-auto">
          <div className="sticky top-0 bg-background px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar pessoa…"
                className="pl-9"
              />
            </div>
          </div>

          {conversas.length > 0 && !busca && (
            <div className="px-4 pb-2">
              <p className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                Conversas
              </p>
              {conversas.map(({ peer: pid, ultima, naoLidas: n }) => {
                const p = perfilDe(pid);
                return (
                  <button
                    key={pid}
                    onClick={() => setPeerId(pid)}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-muted/50"
                  >
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={p?.avatar_url || ""} className="object-cover" />
                      <AvatarFallback className="bg-muted text-xs">
                        {p?.nome_completo?.substring(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {p?.nome_completo || "Usuário"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {previewMensagem(ultima, currentUserId)}
                      </p>
                    </div>
                    {n > 0 && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                        {n}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="px-4 pb-24">
            <p className="mb-2 mt-3 text-[11px] uppercase tracking-widest text-muted-foreground">
              Comunidade
            </p>
            {listaMembros.map((m) => (
              <button
                key={m.id}
                onClick={() => setPeerId(m.id)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-muted/50"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={m.avatar_url || ""} className="object-cover" />
                  <AvatarFallback className="bg-muted text-xs">
                    {m.nome_completo?.substring(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <p className="truncate text-sm">{m.nome_completo}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
            {thread.length === 0 && (
              <p className="pt-10 text-center text-sm text-muted-foreground">
                Comece a conversa 👋
              </p>
            )}
            {thread.map((m) => {
              const mine = m.remetente_id === currentUserId;
              const storyLabel = isStoryMessage(m) ? storyMessageLabel(m, currentUserId) : null;
              const hora = formatDistanceToNow(new Date(m.criado_em), { addSuffix: true, locale: ptBR });
              const bolha = mine ? "bg-primary text-primary-foreground" : "bg-muted";
              if (storyLabel) {
                return (
                  <div key={m.id} className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
                    <p className="text-[11px] text-muted-foreground">{storyLabel}</p>
                    <StoryThumb m={m} onOpen={() => abrirStory(m)} />
                    {m.texto && (
                      <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${bolha}`}>
                        <p className="text-sm leading-snug">{m.texto}</p>
                      </div>
                    )}
                    {m.emoji && <p className="text-3xl leading-tight">{m.emoji}</p>}
                    <p className="text-[10px] text-muted-foreground">{hora}</p>
                  </div>
                );
              }
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${bolha}`}>
                    {m.tipo === "audio" && m.audio_path ? (
                      <AudioMessagePlayer path={m.audio_path} duracaoSeg={m.audio_duracao_seg ?? null} mine={mine} />
                    ) : (
                      <>
                        {m.texto && <p className="text-sm leading-snug">{m.texto}</p>}
                        {m.emoji && <p className="text-2xl leading-tight">{m.emoji}</p>}
                      </>
                    )}
                    <p className="mt-1 text-[10px] opacity-60">{hora}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border px-4 pb-6 pt-3">
            <div className="mb-2 flex gap-2 overflow-x-auto scrollbar-hide">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => enviar("", e)}
                  className="text-2xl transition-transform active:scale-125"
                >
                  {e}
                </button>
              ))}
            </div>
            {recorder.gravando ? (
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-11 w-11 shrink-0 rounded-full text-destructive"
                  onClick={() => recorder.cancelar()}
                  aria-label="Cancelar gravação"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
                <div className="flex h-11 flex-1 items-center gap-2 rounded-full bg-muted px-4">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
                  <span className="text-sm font-semibold tabular-nums">{formatAudioTime(recorder.segundos)}</span>
                  <span className="truncate text-xs text-muted-foreground">Gravando…</span>
                </div>
                <Button
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-full"
                  onClick={() => void pararEEnviar()}
                  aria-label="Enviar áudio"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Smile className="h-5 w-5 shrink-0 text-muted-foreground" />
                <Input
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void enviar(texto);
                    }
                  }}
                  placeholder="Mensagem…"
                  className="h-11 rounded-full"
                />
                {texto.trim() ? (
                  <Button
                    size="icon"
                    className="h-11 w-11 shrink-0 rounded-full"
                    disabled={enviando}
                    onClick={() => void enviar(texto)}
                    aria-label="Enviar mensagem"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-11 w-11 shrink-0 rounded-full"
                    disabled={enviandoAudio}
                    onClick={() => void iniciarGravacao()}
                    aria-label="Gravar áudio"
                  >
                    {enviandoAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-5 w-5" />}
                  </Button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DirectDrawer;
