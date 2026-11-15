// Leitura de planilha de despesas (CSV ou linhas já extraídas de um .xlsx).
// Funções puras: recebem linhas e devolvem despesas válidas + erros por linha.
import type { CategoriaDespesa } from "@/lib/meu-negocio-metrics";

export type DespesaImportada = {
  data: string; // yyyy-mm-dd
  categoria: CategoriaDespesa;
  valor_centavos: number;
  descricao: string | null;
  fixa: boolean;
  gasto_captacao: boolean;
};

export type ResultadoImportacao = {
  validas: (DespesaImportada & { linha: number })[];
  erros: { linha: number; motivo: string }[];
};

type Celula = string | number | boolean | Date | null | undefined;

const norm = (v: unknown) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** Aceita nomes livres ("Aluguel", "academia", "Anúncios", "Facebook Ads"...). */
export function categoriaDe(v: unknown): CategoriaDespesa {
  const t = norm(v);
  if (!t) return "outros";
  if (/(aluguel|academia|sala|espaco|box)/.test(t)) return "aluguel_academia";
  if (/(anuncio|ads|trafego|marketing|propaganda|impulsion|instagram|facebook|google|meta)/.test(t)) return "anuncio";
  if (/(equipamento|material|halter|anilha|maquina|aparelho)/.test(t)) return "equipamento";
  if (/(transporte|combustivel|gasolina|uber|estacionamento|onibus|pedagio)/.test(t)) return "transporte";
  if (/(contador|contabil|contabilidade)/.test(t)) return "contador";
  if (/(ferramenta|software|aplicativo|app|sistema|assinatura|internet|celular)/.test(t)) return "ferramentas";
  return "outros";
}

/** "R$ 1.234,56", "1234,56", "1234.56", 1234.56 → centavos. */
export function valorEmCentavos(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? Math.round(v * 100) : null;
  let t = String(v ?? "").replace(/[R$\s]/g, "").trim();
  if (!t) return null;
  const temVirgula = t.includes(",");
  const temPonto = t.includes(".");
  if (temVirgula && temPonto) {
    // O último separador é o decimal.
    t = t.lastIndexOf(",") > t.lastIndexOf(".") ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  } else if (temVirgula) {
    t = t.replace(",", ".");
  } else if (temPonto && /^\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, ""); // 1.500 = mil e quinhentos
  }
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => {
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
};

/** dd/mm/aaaa, dd/mm/aa, aaaa-mm-dd, mm/aaaa, Date ou número de série do Excel. */
export function dataIso(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    // Datas do .xlsx chegam em UTC.
    return iso(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate());
  }
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const dt = new Date(Math.round((v - 25569) * 86400000));
    return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  const t = String(v ?? "").trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return iso(y, +m[2], +m[1]);
  }
  m = t.match(/^(\d{1,2})[/.-](\d{4})$/);
  if (m) return iso(+m[2], +m[1], 1);
  return null;
}

export function simNao(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const t = norm(v);
  return ["sim", "s", "x", "yes", "y", "1", "true", "verdadeiro", "fixa", "mensal"].includes(t);
}

type Coluna = "data" | "categoria" | "valor" | "descricao" | "fixa" | "captacao";
const ORDEM_PADRAO: Coluna[] = ["data", "categoria", "valor", "descricao", "fixa", "captacao"];

function colunaDoTitulo(t: string): Coluna | null {
  const n = norm(t);
  if (/^(data|dia|vencimento|mes)/.test(n)) return "data";
  if (/^(categoria|tipo|grupo)/.test(n)) return "categoria";
  if (/^(valor|preco|custo|total|quantia)/.test(n)) return "valor";
  if (/^(descricao|descr|obs|detalhe|nome|item|historico)/.test(n)) return "descricao";
  if (/^(fixa|fixo|recorrente|repete|mensal)/.test(n)) return "fixa";
  if (/^(captacao|capta|gasto de captacao|marketing)/.test(n)) return "captacao";
  return null;
}

/** Converte as linhas da planilha (com ou sem cabeçalho) em despesas. */
export function lerLinhasDespesas(linhas: Celula[][]): ResultadoImportacao {
  const res: ResultadoImportacao = { validas: [], erros: [] };
  const naoVazias = linhas.map((l, i) => ({ l, n: i + 1 })).filter(({ l }) => l.some((c) => norm(c instanceof Date ? "x" : c) !== ""));
  if (naoVazias.length === 0) return res;

  let mapa: Partial<Record<Coluna, number>> = {};
  let inicio = 0;
  const cab = naoVazias[0].l.map((c) => (typeof c === "string" ? colunaDoTitulo(c) : null));
  if (cab.filter(Boolean).length >= 2) {
    cab.forEach((c, i) => c && mapa[c] === undefined && (mapa[c] = i));
    inicio = 1;
  } else {
    ORDEM_PADRAO.forEach((c, i) => (mapa[c] = i));
  }
  if (mapa.valor === undefined) {
    res.erros.push({ linha: naoVazias[0].n, motivo: "Não achamos a coluna de valor." });
    return res;
  }

  const get = (l: Celula[], c: Coluna) => (mapa[c] === undefined ? undefined : l[mapa[c]!]);
  for (const { l, n } of naoVazias.slice(inicio)) {
    const valor = valorEmCentavos(get(l, "valor"));
    if (valor === null) {
      res.erros.push({ linha: n, motivo: "Valor vazio ou inválido." });
      continue;
    }
    const brutaData = get(l, "data");
    const data = brutaData === undefined || norm(brutaData) === "" ? null : dataIso(brutaData);
    if (data === null) {
      res.erros.push({ linha: n, motivo: "Data vazia ou inválida (use dd/mm/aaaa)." });
      continue;
    }
    const categoria = categoriaDe(get(l, "categoria") ?? get(l, "descricao"));
    const descricao = String(get(l, "descricao") ?? "").trim() || null;
    const captacaoCel = get(l, "captacao");
    res.validas.push({
      linha: n,
      data,
      categoria,
      valor_centavos: valor,
      descricao: descricao ? descricao.slice(0, 200) : null,
      fixa: simNao(get(l, "fixa")),
      gasto_captacao: captacaoCel === undefined || norm(captacaoCel) === "" ? categoria === "anuncio" : simNao(captacaoCel),
    });
  }
  return res;
}

/** CSV simples com ; ou , como separador e aspas. */
export function lerCsv(texto: string): string[][] {
  const t = texto.replace(/^\uFEFF/, "");
  const primeira = t.split(/\r?\n/, 1)[0] ?? "";
  const sep = (primeira.match(/;/g)?.length ?? 0) >= (primeira.match(/,/g)?.length ?? 0) ? ";" : ",";
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let aspas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"' && t[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = "";
    } else campo += c;
  }
  if (campo !== "" || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}

export const MODELO_CSV =
  "\uFEFFData;Categoria;Valor;Descrição;Fixa;Captação\n" +
  "05/11/2026;Aluguel / academia;800,00;Sala do estúdio;Sim;Não\n" +
  "10/11/2026;Anúncio;150,00;Instagram;Não;Sim\n" +
  "12/11/2026;Equipamento;320,50;Kettlebells;Não;Não\n" +
  "15/11/2026;Contador;250,00;Honorários;Sim;Não\n";
