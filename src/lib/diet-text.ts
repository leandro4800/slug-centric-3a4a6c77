/** Utilitários para interpretar o texto da prescrição (descricao_ia) das refeições. */

export type OpcaoCardapio = { titulo: string; linhas: string[] };

const OPCAO_RE = /^\s*(?:•\s*)?(op[çc][ãa]o|alternativa)\s*([0-9]+|[ivx]+)?\s*[:\-–)]?\s*$/i;

/** True quando a refeição contém o marcador "(refeição livre)". */
export const isRefeicaoLivre = (texto?: string | null): boolean =>
  /\(\s*refei[çc][ãa]o\s+livre[^)]*\)/i.test(String(texto || ""));

/**
 * Divide a descrição em opções de cardápio ("OPÇÃO 1:", "OPÇÃO 2:").
 * Retorna [] quando não existir mais de uma opção.
 */
export function parseOpcoesCardapio(texto?: string | null): OpcaoCardapio[] {
  const raw = String(texto || "").trim();
  if (!raw) return [];

  const linhas = raw.split(/\r?\n/);
  const opcoes: OpcaoCardapio[] = [];
  let atual: OpcaoCardapio | null = null;

  for (const linha of linhas) {
    const m = linha.match(OPCAO_RE);
    if (m) {
      atual = { titulo: linha.replace(/^[\s•]*/, "").replace(/[:\-–)]\s*$/, "").trim(), linhas: [] };
      opcoes.push(atual);
      continue;
    }
    if (atual && linha.trim()) atual.linhas.push(linha.trim());
  }

  const validas = opcoes.filter((o) => o.linhas.length > 0);
  return validas.length > 1 ? validas : [];
}

/** Remove o cabeçalho "(refeição livre — 1x por semana)" para exibição limpa. */
export const semMarcadorLivre = (texto: string): string =>
  texto.replace(/\s*\(\s*refei[çc][ãa]o\s+livre[^)]*\)/gi, "").trim();
