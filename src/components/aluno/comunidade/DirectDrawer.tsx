import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Send, X, Search, Smile } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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
}

const EMOJIS = ["❤️", "💪", "🔥", "👏", "😮", "😂", "🙏", "👊"];

interface Props {
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  tenantId: string;
  membros: DirectPerfil[];
  initialPeerId?: string | null;
  onUnreadChange?: (n: number) => void;
}

export const DirectDrawer = ({
  open,
  onClose,
  currentUserId,
  tenantId,
  membros,
  initialPeerId,
  onUnreadChange,
}: Props) => {
  const [mensagens, setMensagens] = useState<DirectMensagem[]>([]);
  const [peerId, setPeerId] = useState<string | null>(initialPeerId ?? null);
  const [texto, setTexto] = useState("");
  const [busca, setBusca] = useState("");
  const [enviando, setEnviando] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

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

  // marca como lidas ao abrir a conversa
  useEffect(() => {
    if (!open || !peerId) return;
    const ids = thread
      .filter((m) => m.destinatario_id === currentUserId && !m.lida_em)
      .map((m) => m.id);
    if (!ids.length) return;
    setMensagens((prev) =>
      prev.map((m) => (ids.includes(m.id) ? { ...m, lida_em: new Date().toISOString() } : m))
    );
    void supabase
      .from("comunidade_mensagens" as any)
      .update({ lida_em: new Date().toISOString() } as any)
      .in("id", ids);
  }, [open, peerId, thread, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length, peerId]);

  const enviar = async (conteudo: string, emoji?: string) => {
    if (!peerId || (!conteudo.trim() && !emoji)) return;
    setEnviando(true);
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
    setEnviando(false);
    if (!error && data) {
      const m = data as any as DirectMensagem;
      setMensagens((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      setTexto("");
    }
  };

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
                        {ultima.story_id ? "Respondeu seu story · " : ""}
                        {ultima.texto || ultima.emoji || ""}
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
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${
                      mine ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    {m.story_id && (
                      <p className="mb-1 text-[10px] uppercase tracking-wider opacity-70">
                        Resposta ao story
                      </p>
                    )}
                    {m.texto && <p className="text-sm leading-snug">{m.texto}</p>}
                    {m.emoji && <p className="text-2xl leading-tight">{m.emoji}</p>}
                    <p className="mt-1 text-[10px] opacity-60">
                      {formatDistanceToNow(new Date(m.criado_em), { addSuffix: true, locale: ptBR })}
                    </p>
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
              <Button
                size="icon"
                className="h-11 w-11 shrink-0 rounded-full"
                disabled={!texto.trim() || enviando}
                onClick={() => void enviar(texto)}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DirectDrawer;
