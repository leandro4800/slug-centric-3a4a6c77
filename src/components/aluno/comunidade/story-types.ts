export interface StoryRow {
  id: string;
  user_id: string;
  nome_completo: string | null;
  avatar_url: string | null;
  origem: "post" | "conquista";
  tipo: string;
  media_url: string | null;
  thumb_url: string | null;
  texto: string | null;
  detalhe: string | null;
  duracao_seg: number | null;
  criado_em: string;
  visto: boolean;
}

export interface StoryGroup {
  user_id: string;
  nome_completo: string | null;
  avatar_url: string | null;
  items: StoryRow[];
  todosVistos: boolean;
}

export const groupStories = (rows: StoryRow[]): StoryGroup[] => {
  const map = new Map<string, StoryGroup>();
  rows.forEach((r) => {
    const g = map.get(r.user_id);
    if (g) {
      g.items.push(r);
    } else {
      map.set(r.user_id, {
        user_id: r.user_id,
        nome_completo: r.nome_completo,
        avatar_url: r.avatar_url,
        items: [r],
        todosVistos: true,
      });
    }
  });
  const groups = [...map.values()];
  groups.forEach((g) => {
    g.items.sort((a, b) => +new Date(a.criado_em) - +new Date(b.criado_em));
    g.todosVistos = g.items.every((i) => i.visto);
  });
  return groups;
};

export const STORY_REACOES = ["❤️", "💪", "🔥", "👏", "😮"];

/** Tempo curto no estilo Instagram: "agora", "39 min", "5 h", "2 d". */
export const formatStoryAge = (criadoEm: string, now: Date = new Date()): string => {
  const diffMin = Math.max(0, Math.floor((now.getTime() - new Date(criadoEm).getTime()) / 60000));
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
};

/** Campos de referência ao story gravados na mensagem do Direct. */
export interface StoryRefMensagem {
  remetente_id: string;
  destinatario_id: string;
  story_id: string | null;
  story_autor_id: string | null;
  story_origem: string | null;
  story_expira_em: string | null;
  texto?: string | null;
  emoji?: string | null;
}

export const isStoryMessage = (m: Pick<StoryRefMensagem, "story_origem" | "story_id">) =>
  !!m.story_origem || !!m.story_id;

/**
 * Rótulo da mensagem que cita um story.
 * Resposta (autor do story = destinatário): "Você respondeu ao story" / "Respondeu ao seu story"
 * (só emoji: "Você reagiu ao story" / "Reagiu ao seu story").
 * Compartilhamento (autor é outra pessoa): "Você enviou um story" / "Enviou um story".
 */
export const storyMessageLabel = (m: StoryRefMensagem, currentUserId: string): string | null => {
  if (!isStoryMessage(m)) return null;
  const mine = m.remetente_id === currentUserId;
  const resposta = m.story_autor_id === m.destinatario_id;
  if (resposta) {
    const soReacao = !!m.emoji && !m.texto;
    if (soReacao) return mine ? "Você reagiu ao story" : "Reagiu ao seu story";
    return mine ? "Você respondeu ao story" : "Respondeu ao seu story";
  }
  return mine ? "Você enviou um story" : "Enviou um story";
};

/** Um story citado no Direct só abre se ainda existir e não tiver expirado. */
export const isStoryRefActive = (
  m: Pick<StoryRefMensagem, "story_id" | "story_origem" | "story_expira_em">,
  now: Date = new Date()
): boolean => {
  if (m.story_origem === "post" && !m.story_id) return false; // story apagado
  if (!m.story_expira_em) return false;
  return new Date(m.story_expira_em).getTime() > now.getTime();
};
