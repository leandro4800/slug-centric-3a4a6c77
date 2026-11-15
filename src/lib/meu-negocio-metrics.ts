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
  valor_liquido_centavos?: number | null;
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

export type Plano = { id: string; nome: string; preco_centavos: number; intervalo?: string | null };

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

// ============================================================================
// Receita recorrente e LTV (automáticos, só pagantes)
// ============================================================================

export const MESES_INTERVALO: Record<string, number> = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };

/** Receita recorrente mensal: preço mensalizado das assinaturas ativas não gratuitas. */
export function receitaRecorrente(assinaturas: Assinatura[], planos: Plano[]): number {
  const byId = new Map(planos.map((pl) => [pl.id, pl]));
  let total = 0;
  for (const a of assinaturas) {
    if (!isAtiva(a) || a.origem === "gratuito" || !a.plano_id) continue;
    const pl = byId.get(a.plano_id);
    if (!pl) continue;
    total += (pl.preco_centavos || 0) / (MESES_INTERVALO[pl.intervalo ?? "mensal"] ?? 1);
  }
  return Math.round(total);
}

/** LTV: quanto, em média, cada aluno pagante já deixou no total (histórico inteiro). */
export function ltv(pagamentos: Pagamento[]): number | null {
  const pagos = pagamentos.filter((x) => x.status === "pago" && x.aluno_id);
  const alunos = new Set(pagos.map((x) => x.aluno_id));
  if (alunos.size === 0) return null;
  return Math.round(pagos.reduce((s, x) => s + x.valor_bruto_centavos, 0) / alunos.size);
}

/** Dias em que o aluno ficou ativo, somando cada período entrou/voltou → saiu. */
export function diasComoAluno(eventosAluno: Evento[], now: Date = new Date()): number | null {
  const evs = [...eventosAluno].sort((a, b) => a.ocorreu_em.localeCompare(b.ocorreu_em));
  let inicio: number | null = null;
  let total = 0;
  let teve = false;
  for (const e of evs) {
    const t = new Date(e.ocorreu_em).getTime();
    if ((e.tipo === "entrou" || e.tipo === "voltou") && inicio === null) {
      inicio = t;
      teve = true;
    } else if (e.tipo === "saiu" && inicio !== null) {
      total += t - inicio;
      inicio = null;
    }
  }
  if (inicio !== null) total += now.getTime() - inicio;
  return teve ? Math.max(0, Math.round(total / 86400000)) : null;
}

export function formatDuracao(dias: number | null): string {
  if (dias === null) return "—";
  if (dias < 30) return `${dias} ${dias === 1 ? "dia" : "dias"}`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `${meses} ${meses === 1 ? "mês" : "meses"}`;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  return `${anos} ${anos === 1 ? "ano" : "anos"}${resto ? ` e ${resto} ${resto === 1 ? "mês" : "meses"}` : ""}`;
}

// ============================================================================
// Despesas (lançadas pelo coach) e resultado do negócio
// ============================================================================

export const CATEGORIAS_DESPESA = [
  { key: "aluguel_academia", label: "Aluguel / academia" },
  { key: "anuncio", label: "Anúncio" },
  { key: "equipamento", label: "Equipamento" },
  { key: "transporte", label: "Transporte" },
  { key: "contador", label: "Contador" },
  { key: "ferramentas", label: "Ferramentas" },
  { key: "outros", label: "Outros" },
] as const;

export type CategoriaDespesa = (typeof CATEGORIAS_DESPESA)[number]["key"];

export const CATEGORIA_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIAS_DESPESA.map((c) => [c.key, c.label]),
);

export type Despesa = {
  id: string;
  categoria: string;
  valor_centavos: number;
  data: string; // yyyy-mm-dd
  descricao: string | null;
  fixa: boolean;
  gasto_captacao: boolean;
  origem?: string;
};

export type DespesaOcorrencia = Despesa & { mes: string };

const parseDia = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

/**
 * Despesas que caem no período. Despesa fixa repete todo mês a partir do mês da
 * data, até o mês atual (nunca projeta meses futuros).
 */
export function despesasNoPeriodo(despesas: Despesa[], p: Periodo, now: Date = new Date()): DespesaOcorrencia[] {
  const out: DespesaOcorrencia[] = [];
  const limite = Math.min(p.fim.getTime(), addMonths(startOfMonth(now), 1).getTime());
  for (const d of despesas) {
    const dia = parseDia(d.data);
    if (!d.fixa) {
      if (dia.getTime() >= p.inicio.getTime() && dia.getTime() < p.fim.getTime()) out.push({ ...d, mes: mesKey(dia) });
      continue;
    }
    for (let m = startOfMonth(dia); m.getTime() < limite; m = addMonths(m, 1)) {
      if (m.getTime() >= startOfMonth(p.inicio).getTime()) out.push({ ...d, mes: mesKey(m) });
    }
  }
  return out;
}

export const somaDespesas = (oc: DespesaOcorrencia[]) => oc.reduce((s, d) => s + d.valor_centavos, 0);
export const somaCaptacao = (oc: DespesaOcorrencia[]) =>
  oc.filter((d) => d.gasto_captacao).reduce((s, d) => s + d.valor_centavos, 0);

export function despesasPorCategoria(oc: DespesaOcorrencia[]) {
  const m = new Map<string, number>();
  for (const d of oc) m.set(d.categoria, (m.get(d.categoria) ?? 0) + d.valor_centavos);
  return [...m.entries()]
    .map(([categoria, valor]) => ({ categoria, nome: CATEGORIA_LABEL[categoria] ?? categoria, valor }))
    .sort((a, b) => b.valor - a.valor);
}

/** Valor que realmente fica com o coach (descontadas taxas). Sem líquido gravado, usa o bruto. */
export function receitaLiquida(pagamentos: Pagamento[], p: Periodo): number {
  return pagamentos
    .filter((x) => x.status === "pago" && inPeriodo(dataPagamento(x), p))
    .reduce((s, x) => s + (x.valor_liquido_centavos ?? x.valor_bruto_centavos ?? 0), 0);
}

/** Meses do período que já começaram (o mês atual conta). */
export function mesesDecorridos(p: Periodo, now: Date = new Date()): number {
  const fim = new Date(Math.min(p.fim.getTime(), addMonths(startOfMonth(now), 1).getTime()));
  const n = (fim.getFullYear() - p.inicio.getFullYear()) * 12 + (fim.getMonth() - p.inicio.getMonth());
  return Math.max(1, n);
}

/** Alunos pagantes cujo primeiro "entrou" caiu no período. */
export function novosPagantes(eventos: Evento[], pagantes: Set<string>, p: Periodo): Set<string> {
  const s = new Set<string>();
  for (const e of eventos) {
    if (e.tipo === "entrou" && e.aluno_id && pagantes.has(e.aluno_id) && inPeriodo(e.ocorreu_em, p)) s.add(e.aluno_id);
  }
  return s;
}

export type ResultadoNegocio = {
  despesas: number;
  captacao: number;
  lucro: number;
  margem: number | null;
  cac: number | null;
  ltvCac: number | null;
  retornoCaptacao: number | null;
  pontoEquilibrioAlunos: number | null;
  despesaMensal: number;
};

export function resultadoNegocio(args: {
  pagamentos: Pagamento[];
  eventos: Evento[];
  pagantes: Set<string>;
  despesas: Despesa[];
  periodo: Periodo;
  now?: Date;
}): ResultadoNegocio {
  const { pagamentos, eventos, pagantes, despesas, periodo } = args;
  const now = args.now ?? new Date();
  const oc = despesasNoPeriodo(despesas, periodo, now);
  const totalDesp = somaDespesas(oc);
  const captacao = somaCaptacao(oc);
  const bruta = receita(pagamentos, periodo);
  const liquida = receitaLiquida(pagamentos, periodo);
  const lucro = liquida - totalDesp;
  const novos = novosPagantes(eventos, pagantes, periodo);
  const cac = captacao > 0 && novos.size > 0 ? Math.round(captacao / novos.size) : null;
  const vida = ltv(pagamentos);
  const receitaNovos = pagamentos
    .filter((x) => x.status === "pago" && x.aluno_id && novos.has(x.aluno_id) && inPeriodo(dataPagamento(x), periodo))
    .reduce((s, x) => s + x.valor_bruto_centavos, 0);

  // Ponto de equilíbrio: despesa mensal ÷ quanto cada aluno pagante deixa por mês (líquido).
  const meses = mesesDecorridos(periodo, now);
  const despesaMensal = Math.round(totalDesp / meses);
  const alunoMeses = new Set<string>();
  for (const x of pagamentos) {
    if (x.status === "pago" && x.aluno_id && inPeriodo(dataPagamento(x), periodo)) {
      alunoMeses.add(`${x.aluno_id}|${mesKey(new Date(dataPagamento(x)))}`);
    }
  }
  const porAlunoMes = alunoMeses.size ? liquida / alunoMeses.size : 0;
  const pontoEquilibrioAlunos = totalDesp > 0 && porAlunoMes > 0 ? Math.ceil(despesaMensal / porAlunoMes) : null;

  return {
    despesas: totalDesp,
    captacao,
    lucro,
    margem: bruta > 0 ? lucro / bruta : null,
    cac,
    ltvCac: cac && vida ? vida / cac : null,
    retornoCaptacao: captacao > 0 ? receitaNovos / captacao : null,
    pontoEquilibrioAlunos,
    despesaMensal,
  };
}

/** LTV ÷ CAC: verde ≥ 3, amarelo de 1 a 3, vermelho < 1. */
export function semaforoLtvCac(v: number | null): Semaforo {
  if (v === null) return "neutro";
  if (v >= 3) return "verde";
  if (v >= 1) return "amarelo";
  return "vermelho";
}

/** Margem: verde ≥ 20%, amarelo de 0 a 20%, vermelho < 0 (prejuízo). */
export function semaforoMargem(v: number | null): Semaforo {
  if (v === null) return "neutro";
  if (v >= 0.2) return "verde";
  if (v >= 0) return "amarelo";
  return "vermelho";
}
