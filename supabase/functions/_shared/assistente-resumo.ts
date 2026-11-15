// Regras puras do resumo da manhã do Assistente (sem dependências: usadas pela
// função assistente-resumo e pelos testes do app).

export type AlertaResumo = {
  id: string;
  tipo: string;
  prioridade: number;
  titulo: string;
  aluno_id: string | null;
  created_at: string;
};

export type ConfigResumo = {
  resumo_ativo: boolean;
  resumo_hora: number;
  canal_email: boolean;
  canal_push: boolean;
  tipos: Record<string, boolean>;
  ultimo_resumo_data: string | null;
};

export const CONFIG_PADRAO: ConfigResumo = {
  resumo_ativo: true,
  resumo_hora: 8,
  canal_email: true,
  canal_push: true,
  tipos: { sumindo: true, queda_frequencia: true, pagamento: true, renovacao: true, negocio: true },
  ultimo_resumo_data: null,
};

/** Nenhuma notificação entre 21h e 7h (horário de Brasília). */
export const HORA_MIN = 7;
export const HORA_MAX = 20;
export const MAX_ITENS_RESUMO = 5;

/** Tipo de alerta → chave liga/desliga da configuração. */
export const TIPO_CONFIG: Record<string, string> = {
  sumindo: "sumindo",
  queda_frequencia: "queda_frequencia",
  pagamento_vencido: "pagamento",
  renovacao_proxima: "renovacao",
  lucro_queda: "negocio",
  retencao_queda: "negocio",
  cac_alto: "negocio",
};

export function dentroDoHorario(hora: number): boolean {
  return hora >= HORA_MIN && hora <= HORA_MAX;
}

/** Data e hora de Brasília (sem horário de verão desde 2019). */
export function agoraBrasilia(now: Date = new Date()): { hora: number; data: string; diaSemana: number } {
  const sp = new Date(now.getTime() - 3 * 3600_000);
  return { hora: sp.getUTCHours(), data: sp.toISOString().slice(0, 10), diaSemana: sp.getUTCDay() };
}

export function deveEnviarAgora(cfg: ConfigResumo, hora: number, hoje: string): boolean {
  if (!cfg.resumo_ativo) return false;
  if (!dentroDoHorario(hora)) return false;
  if (cfg.resumo_hora !== hora) return false;
  if (cfg.ultimo_resumo_data && cfg.ultimo_resumo_data >= hoje) return false; // no máximo um por dia
  if (!cfg.canal_email && !cfg.canal_push) return false;
  return true;
}

const tipoLigado = (cfg: ConfigResumo, tipo: string) => {
  const chave = TIPO_CONFIG[tipo];
  if (!chave) return false;
  return cfg.tipos?.[chave] !== false;
};

export function ordenarPorPrioridade<T extends AlertaResumo>(alertas: T[]): T[] {
  return [...alertas].sort((a, b) => a.prioridade - b.prioridade || a.created_at.localeCompare(b.created_at));
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export function contagemFrase(alertas: AlertaResumo[]): string {
  const c = (tipos: string[]) => alertas.filter((a) => tipos.includes(a.tipo)).length;
  const partes: string[] = [];
  const pag = c(["pagamento_vencido"]);
  const ren = c(["renovacao_proxima"]);
  const sum = c(["sumindo"]);
  const que = c(["queda_frequencia"]);
  const neg = c(["lucro_queda", "retencao_queda", "cac_alto"]);
  if (pag) partes.push(plural(pag, "pagamento atrasado", "pagamentos atrasados"));
  if (ren) partes.push(plural(ren, "renovação", "renovações"));
  if (sum) partes.push(plural(sum, "aluno sumido", "alunos sumidos"));
  if (que) partes.push(plural(que, "aluno treinando menos", "alunos treinando menos"));
  if (neg) partes.push(plural(neg, "aviso do negócio", "avisos do negócio"));
  return partes.join(", ");
}

export const formatBRL = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type Resumo = {
  titulo: string;
  corpo: string;
  itens: AlertaResumo[];
  restantes: number;
  incluidos: string[]; // todos os alertas cobertos (itens + restantes)
};

/**
 * Monta o resumo do dia. Retorna null quando não há novidade (dia sem
 * novidade = sem notificação). Lista no máximo 5 itens em ordem de prioridade;
 * o resto vira "+ N no painel".
 */
export function montarResumo(params: {
  alertas: AlertaResumo[];
  cfg: ConfigResumo;
  nomeCoach?: string | null;
  receitaMesCentavos?: number | null;
  semana?: { receitaCentavos: number; novos: number; sairam: number } | null;
}): Resumo | null {
  const validos = ordenarPorPrioridade(params.alertas.filter((a) => tipoLigado(params.cfg, a.tipo)));
  if (validos.length === 0) return null;
  const itens = validos.slice(0, MAX_ITENS_RESUMO);
  const restantes = validos.length - itens.length;
  const primeiroNome = (params.nomeCoach ?? "").trim().split(/\s+/)[0];
  const titulo = primeiroNome ? `Bom dia, ${primeiroNome}!` : "Bom dia!";
  const partes = [`Hoje: ${contagemFrase(validos)}`];
  if (params.receitaMesCentavos !== null && params.receitaMesCentavos !== undefined) {
    partes.push(`receita do mês ${formatBRL(params.receitaMesCentavos)}`);
  }
  let corpo = partes.join(", ") + ".";
  if (params.semana) {
    corpo += ` Semana passada: ${formatBRL(params.semana.receitaCentavos)} recebidos, ${params.semana.novos} novos, ${params.semana.sairam} saíram.`;
  }
  return { titulo, corpo, itens, restantes, incluidos: validos.map((a) => a.id) };
}
