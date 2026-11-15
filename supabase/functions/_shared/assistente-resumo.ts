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
  panorama: PanoramaSemanal | null;
};

/**
 * Panorama completo dos alunos, enviado só no resumo de segunda-feira.
 * Os resumos diários trazem apenas novidades, para não repetir os mesmos alunos.
 */
export type PanoramaSemanal = {
  ativos: number;
  treinando: number; // treinou nos últimos 9 dias
  sumidos: Array<{ nome: string; dias: number }>; // 10 a 60 dias sem treinar
  parados: Array<{ nome: string; dias: number }>; // mais de 60 dias sem treinar
  nuncaTreinaram: string[];
};

export const DIAS_SUMIDO = 10;
export const DIAS_PARADO = 60;

const diasEntre = (de: string, ate: string) =>
  Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de.slice(0, 10)}T00:00:00Z`)) / 86400_000);

export function calcularPanorama(
  alunos: Array<{ nome: string | null; ultimoTreino: string | null }>,
  hoje: string,
): PanoramaSemanal {
  const p: PanoramaSemanal = { ativos: alunos.length, treinando: 0, sumidos: [], parados: [], nuncaTreinaram: [] };
  for (const a of alunos) {
    const nome = (a.nome ?? "").trim() || "Aluno";
    if (!a.ultimoTreino) {
      p.nuncaTreinaram.push(nome);
      continue;
    }
    const dias = diasEntre(a.ultimoTreino, hoje);
    if (dias < DIAS_SUMIDO) p.treinando++;
    else if (dias <= DIAS_PARADO) p.sumidos.push({ nome, dias });
    else p.parados.push({ nome, dias });
  }
  p.sumidos.sort((a, b) => b.dias - a.dias);
  p.parados.sort((a, b) => b.dias - a.dias);
  p.nuncaTreinaram.sort((a, b) => a.localeCompare(b, "pt-BR"));
  return p;
}

export function panoramaFrase(p: PanoramaSemanal): string {
  const partes = [
    plural(p.ativos, "aluno ativo", "alunos ativos"),
    `${p.treinando} treinando`,
  ];
  if (p.sumidos.length) partes.push(plural(p.sumidos.length, "sumido (10+ dias)", "sumidos (10+ dias)"));
  if (p.parados.length) partes.push(`${p.parados.length} parados há mais de ${DIAS_PARADO} dias`);
  if (p.nuncaTreinaram.length) partes.push(`${p.nuncaTreinaram.length} nunca treinaram`);
  return `Panorama da semana: ${partes.join(", ")}.`;
}

/**
 * Monta o resumo do dia. Retorna null quando não há novidade (dia sem
 * novidade = sem notificação). Lista no máximo 5 itens em ordem de prioridade;
 * o resto vira "+ N no painel". Às segundas, recebe o panorama completo e
 * envia mesmo sem alertas novos (resumo semanal).
 */
export function montarResumo(params: {
  alertas: AlertaResumo[];
  cfg: ConfigResumo;
  nomeCoach?: string | null;
  receitaMesCentavos?: number | null;
  semana?: { receitaCentavos: number; novos: number; sairam: number } | null;
  panorama?: PanoramaSemanal | null;
}): Resumo | null {
  const validos = ordenarPorPrioridade(params.alertas.filter((a) => tipoLigado(params.cfg, a.tipo)));
  const panorama = params.panorama && params.panorama.ativos > 0 ? params.panorama : null;
  if (validos.length === 0 && !panorama) return null;
  const itens = validos.slice(0, MAX_ITENS_RESUMO);
  const restantes = validos.length - itens.length;
  const primeiroNome = (params.nomeCoach ?? "").trim().split(/\s+/)[0];
  const titulo = (primeiroNome ? `Bom dia, ${primeiroNome}!` : "Bom dia!") + (panorama ? " Resumo da semana" : "");
  const partes: string[] = [];
  if (validos.length) partes.push(`Hoje: ${contagemFrase(validos)}`);
  if (params.receitaMesCentavos !== null && params.receitaMesCentavos !== undefined) {
    partes.push(`receita do mês ${formatBRL(params.receitaMesCentavos)}`);
  }
  let corpo = partes.length ? partes.join(", ") + "." : "";
  if (panorama) corpo = `${corpo} ${panoramaFrase(panorama)}`.trim();
  if (params.semana) {
    corpo += ` Semana passada: ${formatBRL(params.semana.receitaCentavos)} recebidos, ${params.semana.novos} novos, ${params.semana.sairam} saíram.`;
  }
  return { titulo, corpo, itens, restantes, incluidos: validos.map((a) => a.id), panorama };
}
