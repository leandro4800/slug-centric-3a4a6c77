// Template de referência feminino (Redução de gordura + hipertrofia)
// Usado como base para a IA do Hub e para sugestão padrão da planilha feminina.
// Variantes: Intermediário (volume base) e Avançado (volume aumentado).
// NÃO menciona nomes de aluna — apenas a estrutura técnica.

export interface RefExercicio { nome: string; detalhes: string[]; }
export interface RefTreino { nome: string; exercicios: RefExercicio[]; }
export interface RefPlano {
  id: string;
  title: string;
  categoria: string;
  recomendacoes: string;
  divisao: string[];
  workouts: RefTreino[];
}

// Bloco "pirâmide" intermediário (~4 séries totais com aumento progressivo)
const intDorsais: RefTreino = {
  nome: "Dorsais",
  exercicios: [
    { nome: "Remada Baixa Triângulo", detalhes: ["1x12-14", "1x10-12", "2x8-10", "Intervalo: 60s", "Aumentar carga, diminuir reps"] },
    { nome: "Barra Fixa Gravitron (Pegada Aberta)", detalhes: ["3x12-14", "Intervalo: 60s", "Mesma carga e reps"] },
    { nome: "Pulldown Barra Reta", detalhes: ["1x10-12", "2x8-10", "1x6-8", "Intervalo: 60s", "Aumentar carga, diminuir reps"] },
    { nome: "Pull Around", detalhes: ["1x10-12", "2x8-10", "Intervalo: 60s"] },
    { nome: "Crucifixo Inverso Sentado", detalhes: ["2x10-12", "2x6-8", "Intervalo: 60s", "Aumentar carga, diminuir reps"] },
    { nome: "Remada Alta com Barra W", detalhes: ["1x12-14", "1x10-12", "2x8-10", "Intervalo: 60s"] },
    { nome: "Rosca Direta com Halteres", detalhes: ["2x10-12", "2x8-10", "Intervalo: 60s"] },
    { nome: "Panturrilha Sentado Máquina", detalhes: ["3x12-14", "Intervalo: 45s"] },
    { nome: "Abdominal Supra Banco Declinado", detalhes: ["3x12-14", "Intervalo: 45s"] },
  ],
};

const intQuadGluteo: RefTreino = {
  nome: "Quadríceps e Glúteos",
  exercicios: [
    { nome: "Cadeira Extensora", detalhes: ["2x12-14", "1x10-12", "1x8-10", "Intervalo: 60s"] },
    { nome: "Levantamento Terra", detalhes: ["2x10-12", "2x6-8", "Intervalo: 60s"] },
    { nome: "Agachamento Pêndulo", detalhes: ["1x10-12", "1x8-10", "2x6-8", "Intervalo: 60s"] },
    { nome: "Recuo na Máquina", detalhes: ["3x10-12", "Intervalo: 60s"] },
    { nome: "Agachamento Inclinado (alterna com Agach. Halter Frente)", detalhes: ["1x10-12", "1x8-10", "1x8", "Intervalo: 60s"] },
    { nome: "Agachamento com Halter na Frente", detalhes: ["3x12", "Intervalo: 60s"] },
  ],
};

const intPeitoOmbroTri: RefTreino = {
  nome: "Peitorais / Ombros / Tríceps",
  exercicios: [
    { nome: "Elevação Lateral com Halteres", detalhes: ["1x12", "1x10", "1x8", "Intervalo: 90s", "Aumentar carga, diminuir reps"] },
    { nome: "Desenvolvimento Arnold Sentado", detalhes: ["3x12", "Intervalo: 60s"] },
    { nome: "Elevação Frontal Polia Baixa (Pegada Pronada)", detalhes: ["1x12", "1x10", "1x8", "Intervalo: 90s"] },
    { nome: "Crucifixo Máquina", detalhes: ["3x12", "Intervalo: 60s"] },
    { nome: "Flexão de Braços com Apoio", detalhes: ["3x12", "Intervalo: 60s"] },
    { nome: "Supino Máquina (Pegada Pronada)", detalhes: ["1x12", "1x10", "1x8", "Intervalo: 90s"] },
    { nome: "Tríceps na Polia com Corda", detalhes: ["1x12", "1x10", "1x8", "Intervalo: 90s"] },
    { nome: "Panturrilha no Step", detalhes: ["3x12", "Intervalo: 60s"] },
    { nome: "Abdominal Infra Pernas Estendidas", detalhes: ["3x12", "Intervalo: 60s"] },
  ],
};

const intPostGluteo: RefTreino = {
  nome: "Posteriores de Coxa e Glúteos",
  exercicios: [
    { nome: "Cadeira Flexora (alterna com Alongamento de Pernas)", detalhes: ["1x12-14", "1x10-12", "2x8-10", "Intervalo: 60s"] },
    { nome: "Alongamento para as Pernas", detalhes: ["4x30s", "Intervalo: 60s"] },
    { nome: "RDL (Stiff)", detalhes: ["1x10-12", "1x8-10", "2x6-8", "Intervalo: 60s"] },
    { nome: "Banco Romano Máquina Pés Altos", detalhes: ["2x10-12", "2x6-8", "Intervalo: 60s"] },
    { nome: "Bom Dia no Hack", detalhes: ["1x10-12", "2x8-10", "1x6-8", "Intervalo: 60s"] },
    { nome: "Agachamento Búlgaro no Smith", detalhes: ["3x10-12", "Intervalo: 60s"] },
    { nome: "Flexora Unilateral", detalhes: ["3x12-14", "Intervalo: 60s"] },
  ],
};

const intSuperiores: RefTreino = {
  nome: "Superiores Completo",
  exercicios: [
    { nome: "Crucifixo Inverso Sentado", detalhes: ["2x12-14", "2x8-10", "Intervalo: 60s"] },
    { nome: "Remada Alta com Barra W", detalhes: ["3x10-12", "Intervalo: 60s"] },
    { nome: "Elevação Lateral com Halteres", detalhes: ["2x10-12", "2x6-8", "Intervalo: 60s"] },
    { nome: "Elevação Frontal Polia Baixa (Pegada Pronada)", detalhes: ["3x10-12", "Intervalo: 60s"] },
    { nome: "Remada Baixa Triângulo", detalhes: ["1x10-12", "1x8-10", "1x6-8", "Intervalo: 60s"] },
    { nome: "Barra Fixa Gravitron (Pegada Aberta)", detalhes: ["3x10-12", "Intervalo: 60s"] },
    { nome: "Flexão de Braços com Apoio", detalhes: ["3x12-14", "Intervalo: 60s"] },
    { nome: "Rosca Direta com Halteres", detalhes: ["2x10-12", "2x8-10", "Intervalo: 60s"] },
    { nome: "Tríceps na Polia com Corda", detalhes: ["2x10-12", "2x8-10", "Intervalo: 60s"] },
    { nome: "Abdominal Prancha Isométrica", detalhes: ["3x até a falha", "Intervalo: 45s"] },
  ],
};

export const FEMALE_REF_INTERMEDIARIO: RefPlano = {
  id: "ref_fem_intermediario",
  title: "REFERÊNCIA FEMININA — INTERMEDIÁRIO (5x/semana)",
  categoria: "Feminino",
  recomendacoes:
    "Foco em redução de gordura + hipertrofia. Pirâmides crescentes (aumentar carga e diminuir reps a cada série). Intervalos curtos (45-90s). Treino dividido em 5 dias com ênfase em posterior/glúteo e quadríceps.",
  divisao: [
    "DIA 1: DORSAIS + BÍCEPS + PANTURRILHA + ABDÔMEN",
    "DIA 2: QUADRÍCEPS + GLÚTEOS",
    "DIA 3: PEITORAIS + OMBROS + TRÍCEPS + PANTURRILHA + ABDÔMEN",
    "DIA 4: POSTERIORES DE COXA + GLÚTEOS",
    "DIA 5: SUPERIORES COMPLETO + ABDÔMEN",
  ],
  workouts: [intDorsais, intQuadGluteo, intPeitoOmbroTri, intPostGluteo, intSuperiores],
};

// Avançado = mesma estrutura, volume aumentado:
//  - +1 série em cada bloco piramidal
//  - +1 exercício "finisher" por grupo grande (drop set / rest-pause)
function bumpSeries(detalhes: string[]): string[] {
  const out: string[] = [];
  for (const d of detalhes) {
    const m = d.match(/^(\d+)x([\dA-Za-z\-\s]+)$/);
    if (m) out.push(`${Number(m[1]) + 1}x${m[2].trim()}`);
    else out.push(d);
  }
  return out;
}
function advance(t: RefTreino, finishers: RefExercicio[]): RefTreino {
  return {
    nome: t.nome,
    exercicios: [
      ...t.exercicios.map((e) => ({ nome: e.nome, detalhes: bumpSeries(e.detalhes) })),
      ...finishers,
    ],
  };
}

export const FEMALE_REF_AVANCADO: RefPlano = {
  id: "ref_fem_avancado",
  title: "REFERÊNCIA FEMININA — AVANÇADO (5x/semana)",
  categoria: "Feminino",
  recomendacoes:
    "Volume avançado: pirâmides com 1 série adicional, técnicas avançadas (rest-pause e drop-set) nos finishers. Intervalos 45-90s. Mantém divisão em 5 dias com forte ênfase em posterior/glúteo e quadríceps.",
  divisao: FEMALE_REF_INTERMEDIARIO.divisao,
  workouts: [
    advance(intDorsais, [
      { nome: "Pulldown Unilateral na Polia", detalhes: ["3x10 + drop-set na última", "Intervalo: 45s"] },
    ]),
    advance(intQuadGluteo, [
      { nome: "Leg Press 45° (rest-pause)", detalhes: ["3x8 + rest-pause 4-3-3", "Intervalo: 90s"] },
      { nome: "Glúteo na Polia (Coice)", detalhes: ["3x12 unilateral", "Intervalo: 45s"] },
    ]),
    advance(intPeitoOmbroTri, [
      { nome: "Tríceps Francês com Halter", detalhes: ["3x10 + drop-set", "Intervalo: 60s"] },
    ]),
    advance(intPostGluteo, [
      { nome: "Hip Thrust no Smith", detalhes: ["4x10-12 + 1 série rest-pause", "Intervalo: 90s"] },
      { nome: "Abdução em Pé na Polia", detalhes: ["3x15 unilateral", "Intervalo: 45s"] },
    ]),
    advance(intSuperiores, [
      { nome: "Rosca Martelo Halteres", detalhes: ["3x10 + drop-set na última", "Intervalo: 45s"] },
    ]),
  ],
};

export const FEMALE_REFERENCE_PLANS: RefPlano[] = [
  FEMALE_REF_INTERMEDIARIO,
  FEMALE_REF_AVANCADO,
];
