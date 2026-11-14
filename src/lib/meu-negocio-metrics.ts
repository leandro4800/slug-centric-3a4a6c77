// Cálculos puros do painel "Meu negócio".
// Regra central: alunos gratuitos NUNCA entram em receita, ticket, permanência,
// inadimplência nem retenção. Todos os valores monetários estão em centavos.

export type PeriodoKey = "mes_atual" | "mes_anterior" | "3m" | "6m" | "12m";

export const PERIODO_OPCOES: { key: PeriodoKey; label: string }[] = [
  { key: "mes_atual", label: "Mês atual" },
  { key: "mes_anterior", label: "Mês anterior" },
  { key: "3m", label: "Últimos 3 meses" },
  { key: "6m", label: "Últimos 6 meses" },
  { key: "12m", label: "Últimos 12 meses" },
];

export type Periodo = { inicio: Date; fim: Date }; // fim exclusivo

export type Pagamento = {
  id: string;
  aluno_id: string | null;
  aluno_nome: string | null;
  produto_tipo: string | null;
  produto_nome: string | null;
  valor_bruto_centavos: number;
  status: "pago" | "pendente" | "vencido" | "estornado" | string;
  data_vencimento: string | null;
  data_pagamento: string | null;
  created_at: string;
};

export type Assinatura = {
  id: string;
  aluno_id: string;
  plano_id: string | null;
  status: string;
  origem: string | null;
  current_period_end: string | null;
  created_at: string;
};

export type Evento = {
  aluno_id: string | null;
  aluno_nome: string | null;
  tipo: "entrou" | "saiu" | "voltou" | string;
  ocorreu_em: string;
};

export type Plano = { id: string; nome: string; preco_centavos: number };

export type Semaforo = "verde" | "amarelo" | "vermelho" | "neutro";

export const DIAS_SUMINDO = 10;

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

export const mesKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export function getPeriodo(key: PeriodoKey, now: Date = new Date()): Periodo {
  const atual = startOfMonth(now);
  switch (key) {
    case "mes_anterior":
      return { inicio: addMonths(atual, -1), fim: atual };
    case "3m":
      return { inicio: addMonths(atual, -2), fim: addMonths(atual, 1) };
    case "6m":
      return { inicio: addMonths(atual, -5), fim: addMonths(atual, 1) };
    case "12m":
      return { inicio: addMonths(atual, -11), fim: addMonths(atual, 1) };
    case "mes_atual":
    default:
      return { inicio: atual, fim: addMonths(atual, 1) };
  }
}

/** Período imediatamente anterior, com o mesmo número de meses. */
export function getPeriodoAnterior(p: Periodo): Periodo {
  const meses =
    (p.fim.getFullYear() - p.inicio.getFullYear()) * 12 + (p.fim.getMonth() - p.inicio.getMonth());
  return { inicio: addMonths(p.inicio, -meses), fim: p.inicio };
}

const inPeriodo = (iso: string | null | undefined, p: Periodo) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= p.inicio.getTime() && t < p.fim.getTime();
};

export const isAtiva = (a: Assinatura) => a.status === "active" || a.status === "trialing";

/** Aluno pagante = tem assinatura não gratuita OU já teve algum pagamento pago. */
export function alunosPagantes(assinaturas: Assinatura[], pagamentos: Pagamento[]): Set<string> {
  const s = new Set<string>();
  for (const a of assinaturas) if (a.origem && a.origem !== "gratuito") s.add(a.aluno_id);
  for (const p of pagamentos) if (p.status === "pago" && p.aluno_id) s.add(p.aluno_id);
  return s;
}

export const dataPagamento = (p: Pagamento) => p.data_pagamento ?? p.created_at;
export const dataCobranca = (p: Pagamento) => p.data_vencimento ?? p.data_pagamento ?? p.created_at;

export function receita(pagamentos: Pagamento[], p: Periodo): number {
  return pagamentos
    .filter((x) => x.status === "pago" && inPeriodo(dataPagamento(x), p))
    .reduce((s, x) => s + (x.valor_bruto_centavos || 0), 0);
}

export function variacao(atual: number, anterior: number): number | null {
  if (!anterior) return null;
  return (atual - anterior) / anterior;
}

export function ticketMedio(pagamentos: Pagamento[], p: Periodo): number | null {
  const pagos = pagamentos.filter((x) => x.status === "pago" && inPeriodo(dataPagamento(x), p));
  const alunos = new Set(pagos.map((x) => x.aluno_id).filter(Boolean));
  if (alunos.size === 0) return null;
  return Math.round(pagos.reduce((s, x) => s + x.valor_bruto_centavos, 0) / alunos.size);
}

export function inadimplencia(pagamentos: Pagamento[], p: Periodo): number | null {
  let vencido = 0;
  let cobrado = 0;
  for (const x of pagamentos) {
    if (x.status === "pago" && inPeriodo(dataPagamento(x), p)) cobrado += x.valor_bruto_centavos;
    if (x.status === "vencido" && inPeriodo(dataCobranca(x), p)) {
      cobrado += x.valor_bruto_centavos;
      vencido += x.valor_bruto_centavos;
    }
  }
  if (cobrado === 0) return null;
  return vencido / cobrado;
}

export function atrasado(pagamentos: Pagamento[]): { valor: number; alunos: number } {
  const v = pagamentos.filter((x) => x.status === "vencido");
  return {
    valor: v.reduce((s, x) => s + x.valor_bruto_centavos, 0),
    alunos: new Set(v.map((x) => x.aluno_id ?? x.id)).size,
  };
}

/** Meses distintos com pagamento pago, por aluno. */
export function mesesPagosPorAluno(pagamentos: Pagamento[]): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  for (const x of pagamentos) {
    if (x.status !== "pago" || !x.aluno_id) continue;
    const k = mesKey(new Date(dataPagamento(x)));
    if (!m.has(x.aluno_id)) m.set(x.aluno_id, new Set());
    m.get(x.aluno_id)!.add(k);
  }
  return m;
}

export function permanenciaMedia(pagamentos: Pagamento[]): number | null {
  const m = mesesPagosPorAluno(pagamentos);
  if (m.size === 0) return null;
  let total = 0;
  m.forEach((s) => (total += s.size));
  return total / m.size;
}

/** Aluno estava ativo no instante t, segundo a linha do tempo de eventos. */
export function ativoEm(eventosAluno: Evento[], t: Date): boolean {
  let ativo = false;
  const ts = t.getTime();
  for (const e of [...eventosAluno].sort((a, b) => a.ocorreu_em.localeCompare(b.ocorreu_em))) {
    if (new Date(e.ocorreu_em).getTime() >= ts) break;
    if (e.tipo === "entrou" || e.tipo === "voltou") ativo = true;
    else if (e.tipo === "saiu") ativo = false;
  }
  return ativo;
}

/** Retenção = (ativos no fim − novos) ÷ ativos no início. Considera só pagantes. */
export function retencao(
  eventos: Evento[],
  pagantes: Set<string>,
  p: Periodo,
  now: Date = new Date(),
): number | null {
  const porAluno = new Map<string, Evento[]>();
  for (const e of eventos) {
    if (!e.aluno_id || !pagantes.has(e.aluno_id)) continue;
    if (!porAluno.has(e.aluno_id)) porAluno.set(e.aluno_id, []);
    porAluno.get(e.aluno_id)!.push(e);
  }
  const fim = new Date(Math.min(p.fim.getTime(), now.getTime() + 1));
  let inicio = 0;
  let final = 0;
  let novos = 0;
  porAluno.forEach((evs) => {
    if (ativoEm(evs, p.inicio)) inicio++;
    if (ativoEm(evs, fim)) final++;
    if (evs.some((e) => e.tipo === "entrou" && inPeriodo(e.ocorreu_em, p))) novos++;
  });
  if (inicio === 0) return null;
  return Math.max(0, Math.min(1, (final - novos) / inicio));
}

export function contarEventos(eventos: Evento[], tipo: string, p: Periodo): number {
  return eventos.filter((e) => e.tipo === tipo && inPeriodo(e.ocorreu_em, p)).length;
}

/** Previsão do próximo mês: assinaturas ativas não gratuitas que renovam no mês seguinte. */
export function previsaoProximoMes(
  assinaturas: Assinatura[],
  planos: Plano[],
  now: Date = new Date(),
): number {
  const prox = { inicio: addMonths(startOfMonth(now), 1), fim: addMonths(startOfMonth(now), 2) };
  const preco = new Map(planos.map((pl) => [pl.id, pl.preco_centavos || 0]));
  return assinaturas
    .filter((a) => isAtiva(a) && a.origem !== "gratuito" && inPeriodo(a.current_period_end, prox))
    .reduce((s, a) => s + (a.plano_id ? preco.get(a.plano_id) ?? 0 : 0), 0);
}

export function receitaMensal(pagamentos: Pagamento[], meses = 12, now: Date = new Date()) {
  const atual = startOfMonth(now);
  return Array.from({ length: meses }, (_, i) => {
    const inicio = addMonths(atual, i - (meses - 1));
    const p = { inicio, fim: addMonths(inicio, 1) };
    return {
      key: mesKey(inicio),
      label: inicio.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      valor: receita(pagamentos, p),
    };
  });
}

/** Últimos N meses (do mais antigo ao atual) para os quadradinhos. */
export function ultimosMeses(n = 12, now: Date = new Date()): string[] {
  const atual = startOfMonth(now);
  return Array.from({ length: n }, (_, i) => mesKey(addMonths(atual, i - (n - 1))));
}

export function diasSemTreino(ultimoTreino: string | null | undefined, now: Date = new Date()): number | null {
  if (!ultimoTreino) return null;
  const [y, m, d] = ultimoTreino.slice(0, 10).split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const hoje = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((hoje.getTime() - dt.getTime()) / 86400000);
}

export function estaSumindo(ultimoTreino: string | null | undefined, now: Date = new Date()): boolean {
  const dias = diasSemTreino(ultimoTreino, now);
  return dias === null || dias >= DIAS_SUMINDO;
}

export function semaforoRetencao(v: number | null): Semaforo {
  if (v === null) return "neutro";
  if (v >= 0.9) return "verde";
  if (v >= 0.8) return "amarelo";
  return "vermelho";
}

export function semaforoInadimplencia(v: number | null): Semaforo {
  if (v === null) return "neutro";
  if (v <= 0.03) return "verde";
  if (v <= 0.1) return "amarelo";
  return "vermelho";
}

export const PRODUTO_LABEL: Record<string, string> = {
  consultoria: "Consultoria",
  treino_distancia: "Treino a distância",
  conteudo: "Conteúdo",
  curso: "Curso",
  comunidade: "Comunidade",
  outro: "Outro",
};

export function receitaPorProduto(pagamentos: Pagamento[], p: Periodo) {
  const m = new Map<string, { receita: number; alunos: Set<string> }>();
  for (const x of pagamentos) {
    if (x.status !== "pago" || !inPeriodo(dataPagamento(x), p)) continue;
    const k = x.produto_tipo || "outro";
    if (!m.has(k)) m.set(k, { receita: 0, alunos: new Set() });
    const g = m.get(k)!;
    g.receita += x.valor_bruto_centavos;
    if (x.aluno_id) g.alunos.add(x.aluno_id);
  }
  return [...m.entries()]
    .map(([tipo, g]) => ({
      tipo,
      nome: PRODUTO_LABEL[tipo] ?? tipo,
      receita: g.receita,
      alunos: g.alunos.size,
      ticket: g.alunos.size ? Math.round(g.receita / g.alunos.size) : 0,
    }))
    .sort((a, b) => b.receita - a.receita);
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatBRL = (centavos: number | null | undefined) =>
  centavos === null || centavos === undefined ? "—" : brl.format(centavos / 100);

export const formatPct = (v: number | null, casas = 0) =>
  v === null ? "—" : `${(v * 100).toFixed(casas).replace(".", ",")}%`;
