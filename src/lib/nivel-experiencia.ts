// Valores canônicos exibidos nos selects de aluno/coach.
// IMPORTANTE: precisam bater EXATAMENTE com os <SelectItem value="..."> usados em
// Anamnese, Onboarding e AdminMontarTreino — caso contrário o Select fica vazio
// e o usuário enxerga como se o nível tivesse "sumido" ou "voltado para Iniciante".
export const NIVEIS_CANONICOS = [
  "Iniciante",
  "Intermediário",
  "Avançado",
  "Atleta de Alto Nível",
] as const;

export type NivelCanonico = (typeof NIVEIS_CANONICOS)[number];

const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/**
 * Converte qualquer variação salva no banco (ex.: "intermediario", "INTERMEDIÁRIO",
 * "alto_nivel", "Avancado") para o valor canônico aceito pelos Selects.
 * Retorna null quando vazio para que o caller decida o default.
 */
export const toNivelCanonico = (raw: string | null | undefined): NivelCanonico | null => {
  if (!raw) return null;
  const t = stripAccents(String(raw));
  if (!t) return null;
  if (t.includes("alto") || t === "atleta") return "Atleta de Alto Nível";
  if (t.startsWith("avan")) return "Avançado";
  if (t.startsWith("inter")) return "Intermediário";
  if (t.startsWith("inic")) return "Iniciante";
  return null;
};

/**
 * Forma normalizada (lowercase, sem acento) usada pelas edge functions
 * (gerar-dieta, gerar-treino-ia) para casar prompts/templates.
 */
export const toNivelEdgeKey = (raw: string | null | undefined): string => {
  const can = toNivelCanonico(raw);
  if (can === "Atleta de Alto Nível") return "alto_nivel";
  if (can === "Avançado") return "avancado";
  if (can === "Intermediário") return "intermediario";
  if (can === "Iniciante") return "iniciante";
  return "intermediario";
};
