/**
 * Modalidades do segmento de luta (tenants vertical = 'fight').
 * O banco guarda o SLUG (`bjj`, `muay_thai`, `boxe`, `mma`) em
 * `referencia_exercicios.modalidade`, `dojo_conteudos.modalidade` e
 * `perfis.modalidade_luta`. A UI exibe o LABEL.
 */
export const FIGHT_MODALIDADES = [
  { slug: "bjj", label: "BJJ" },
  { slug: "muay_thai", label: "Muay Thai" },
  { slug: "kickboxing", label: "Kickboxing" },
  { slug: "boxe", label: "Boxe" },
  { slug: "mma", label: "MMA" },
] as const;

export type FightModalidadeSlug = (typeof FIGHT_MODALIDADES)[number]["slug"];

export const FIGHT_NIVEIS = ["iniciante", "intermediario", "avancado"] as const;

const norm = (v: string) =>
  (v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

/** Aceita label ("Muay Thai") ou slug ("muay_thai") e devolve sempre o slug. */
export const toModalidadeSlug = (value?: string | null): FightModalidadeSlug | null => {
  if (!value) return null;
  const n = norm(value);
  const found = FIGHT_MODALIDADES.find((m) => norm(m.slug) === n || norm(m.label) === n);
  return found ? found.slug : null;
};

export const modalidadeLabel = (value?: string | null): string => {
  const slug = toModalidadeSlug(value);
  return FIGHT_MODALIDADES.find((m) => m.slug === slug)?.label ?? (value || "");
};
