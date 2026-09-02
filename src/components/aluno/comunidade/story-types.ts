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
