// Presets de divisão de treino (espelha os usados no AdminMontarTreino)
// Usado nos cards de "Escolha sua divisão de treino" da tela do aluno.

export type Nivel = "Iniciante" | "Intermediário" | "Avançado" | "Atleta de Alto Nível";

export type DivisaoPreset = {
  id: string;
  label: string;
  freq: number;
  publico: "unisex" | "feminino";
  nivel: Nivel[];
  dias: string[];
};

export const DIVISOES_PRESETS: DivisaoPreset[] = [
  // 2x semana
  { id: "ini-2x-fb", label: "Iniciante 2x — Full Body AB", freq: 2, publico: "unisex", nivel: ["Iniciante"], dias: ["A — Full Body (Quad/Peito/Costas)", "B — Full Body (Post/Ombro/Braços)"] },
  { id: "ul-2x", label: "Upper/Lower 2x", freq: 2, publico: "unisex", nivel: ["Intermediário", "Avançado", "Atleta de Alto Nível"], dias: ["Upper — Peito/Costas/Ombro/Braços", "Lower — Pernas Completas"] },
  { id: "fem-2x-ini", label: "Mulher 2x Iniciante — Inferior Glúteo / Superior Leve", freq: 2, publico: "feminino", nivel: ["Iniciante"], dias: ["A — Glúteo/Posterior/Quadríceps (técnica)", "B — Superior Leve + Glúteo Acessório"] },
  { id: "fem-2x-ab", label: "Mulher 2x Intermediária — Inferior/Superior", freq: 2, publico: "feminino", nivel: ["Intermediário"], dias: ["A — Glúteo/Posterior/Quadríceps", "B — Superior + Glúteo Acessório"] },
  { id: "fem-2x-av", label: "Mulher 2x Avançada — Glúteo Foco / Full Superior", freq: 2, publico: "feminino", nivel: ["Avançado", "Atleta de Alto Nível"], dias: ["A — Glúteo/Posterior (alta intensidade)", "B — Superior Completo + Quadríceps"] },

  // 3x semana
  { id: "ini-3x-fb", label: "Iniciante 3x — Full Body ABC", freq: 3, publico: "unisex", nivel: ["Iniciante"], dias: ["A — Full Body (ênfase Pernas)", "B — Full Body (ênfase Peito/Costas)", "C — Full Body (ênfase Ombro/Braços)"] },
  { id: "ppl-3x", label: "PPL 3x — Push / Pull / Legs", freq: 3, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["Push — Peito/Ombro/Tríceps", "Pull — Costas/Bíceps", "Legs — Pernas Completas"] },
  { id: "abc-peitotri", label: "ABC 3x — Peito+Tríceps / Costas+Bíceps / Pernas", freq: 3, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["A — Peito + Tríceps + Ombro Anterior", "B — Costas + Bíceps + Ombro Posterior", "C — Pernas Completas"] },
  { id: "abc-peitobi", label: "ABC 3x — Peito+Bíceps / Costas+Tríceps / Pernas", freq: 3, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["A — Peito + Bíceps", "B — Costas + Tríceps", "C — Pernas + Ombro"] },
  { id: "fem-3x-ini", label: "Mulher 3x Iniciante — Inferior/Superior/Glúteo", freq: 3, publico: "feminino", nivel: ["Iniciante"], dias: ["A — Inferior (Quadríceps/Posterior técnica)", "B — Superior Leve + Core", "C — Glúteo + Panturrilha"] },
  { id: "fem-3x-int", label: "Mulher 3x Intermediária — Glúteo 2x", freq: 3, publico: "feminino", nivel: ["Intermediário"], dias: ["A — Glúteo/Posterior", "B — Superior (Costas/Ombro/Peito leve)", "C — Quadríceps/Panturrilha + Glúteo Acessório"] },
  { id: "fem-3x-av", label: "Mulher 3x Avançada — Glúteo 2x + Quadríceps", freq: 3, publico: "feminino", nivel: ["Avançado", "Atleta de Alto Nível"], dias: ["A — Glúteo/Posterior (pesado)", "B — Quadríceps + Panturrilha", "C — Superior + Glúteo Acessório"] },

  // 4x semana
  { id: "ini-4x-fb", label: "Iniciante 4x — Full Body ABCD", freq: 4, publico: "unisex", nivel: ["Iniciante"], dias: ["A — Full Body (Pernas)", "B — Full Body (Peito/Costas)", "C — Full Body (Ombro/Braços)", "D — Full Body (Posterior/Core)"] },
  { id: "abcd-peitotri", label: "ABCD 4x — Peito+Tri / Costas+Bi / Pernas / Ombro", freq: 4, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["A — Peito + Tríceps", "B — Costas + Bíceps", "C — Pernas Completas", "D — Ombro + Trapézio + Braços"] },
  { id: "abcd-peitobi", label: "ABCD 4x — Peito+Bi / Costas+Tri / Pernas / Ombro", freq: 4, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["A — Peito + Bíceps", "B — Costas + Tríceps", "C — Pernas Completas", "D — Ombro + Trapézio + Antebraço"] },
  { id: "ppl-ul-4x", label: "Upper/Lower 4x — 2x Superior + 2x Inferior", freq: 4, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["Upper A — Peito/Costas/Ombro", "Lower A — Quadríceps/Glúteo", "Upper B — Braços/Ombro Lateral", "Lower B — Posterior/Panturrilha"] },
  { id: "fem-4x-ini", label: "Mulher 4x Iniciante — Inferior/Superior alternado", freq: 4, publico: "feminino", nivel: ["Iniciante"], dias: ["A — Glúteo/Posterior (técnica)", "B — Superior Leve (Costas/Ombro)", "C — Quadríceps/Panturrilha", "D — Glúteo Acessório + Core"] },
  { id: "fem-4x-ab", label: "Mulher 4x Intermediária — Glúteo/Quad alternado", freq: 4, publico: "feminino", nivel: ["Intermediário"], dias: ["A — Glúteo/Posterior", "B — Peito/Ombro", "C — Glúteo/Quadríceps", "D — Costas/Braços"] },
  { id: "fem-4x-ul", label: "Mulher 4x Avançada — Upper/Lower com foco Glúteo", freq: 4, publico: "feminino", nivel: ["Avançado", "Atleta de Alto Nível"], dias: ["Lower A — Glúteo/Posterior", "Upper A — Costas/Ombro", "Lower B — Quadríceps/Glúteo", "Upper B — Peito/Braços"] },

  // 5x semana
  { id: "abcde-inf", label: "ABCDE 5x — Ênfase Inferiores", freq: 5, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["A — Quadríceps", "B — Peito + Tríceps", "C — Costas + Bíceps", "D — Posterior + Glúteo", "E — Ombro + Trapézio"] },
  { id: "abcde-sup", label: "ABCDE 5x — Ênfase Superiores", freq: 5, publico: "unisex", nivel: ["Intermediário", "Avançado"], dias: ["A — Peito (Foco)", "B — Costas (Largura)", "C — Pernas Completas", "D — Ombro Completo", "E — Braços (Bi+Tri)"] },
  { id: "abcde-classic", label: "ABCDE 5x — Clássica (Peito+Tri / Costas+Bi / Quad / Ombro / Posterior)", freq: 5, publico: "unisex", nivel: ["Intermediário", "Avançado", "Atleta de Alto Nível"], dias: ["Seg — Peito + Tríceps + Estímulo Anterior de Ombro", "Ter — Costas + Bíceps + Estímulo Posterior de Ombro", "Qua — Perna Completa (ênfase Quadríceps)", "Sex — Ombro Completo (Anterior/Lateral/Posterior + Trapézio)", "Sáb — Perna Completa (ênfase Posterior + Glúteo)"] },
  { id: "fem-5x-int", label: "Mulher 5x Intermediária — Glúteo 2x + Quad", freq: 5, publico: "feminino", nivel: ["Intermediário"], dias: ["A — Glúteo/Posterior", "B — Peito/Ombro", "C — Quadríceps + Panturrilha", "D — Glúteo Acessório", "E — Costas/Braços"] },
  { id: "fem-5x-quad", label: "Mulher 5x Avançada — Ênfase Quadríceps", freq: 5, publico: "feminino", nivel: ["Avançado", "Atleta de Alto Nível"], dias: ["A — Quadríceps", "B — Glúteo/Posterior", "C — Peito/Ombro", "D — Quadríceps + Panturrilha", "E — Costas/Braços"] },

  // 6x semana
  { id: "abcdef-av", label: "ABCDEF 6x — Super Avançado (1 músculo/dia)", freq: 6, publico: "unisex", nivel: ["Avançado", "Atleta de Alto Nível"], dias: ["A — Peito", "B — Costas", "C — Pernas (Quad)", "D — Ombro", "E — Braços (Bi+Tri)", "F — Posterior + Glúteo + Trapézio"] },
  { id: "ppl-2x", label: "PPL 6x — Push/Pull/Legs 2x semana", freq: 6, publico: "unisex", nivel: ["Avançado", "Atleta de Alto Nível"], dias: ["Push A", "Pull A", "Legs A (Quad + Glúteo)", "Push B", "Pull B", "Legs B (Posterior + Glúteo)"] },
  { id: "fem-6x-av", label: "Mulher 6x Avançada — Glúteo 3x + Quad 2x", freq: 6, publico: "feminino", nivel: ["Avançado", "Atleta de Alto Nível"], dias: ["A — Glúteo (pesado)", "B — Quadríceps", "C — Costas/Ombro", "D — Glúteo/Posterior", "E — Peito/Braços", "F — Quadríceps + Panturrilha"] },

  // 6x — Super Avançado com técnicas de intensificação
  { id: "abcdef-av-restpause", label: "ABCDEF 6x — Alto Nível com Rest-Pause", freq: 6, publico: "unisex", nivel: ["Atleta de Alto Nível"], dias: ["A — Peito (Rest-Pause nas séries finais)", "B — Costas (Drop-set no fechamento)", "C — Quadríceps + Panturrilha (Cluster sets)", "D — Ombro Completo (Rest-Pause lateral)", "E — Braços Bi+Tri (Bi-set antagonistas)", "F — Posterior + Glúteo + Trapézio (Tensão contínua)"] },
  { id: "abcdef-av-dropset", label: "ABCDEF 6x — Alto Nível com Drop-set & Bi-set", freq: 6, publico: "unisex", nivel: ["Atleta de Alto Nível"], dias: ["A — Peito (Drop-set triplo no isolador)", "B — Costas (Bi-set largura+espessura)", "C — Quadríceps (Pré-exaustão + Drop-set)", "D — Ombro (Tri-set 3 cabeças)", "E — Braços (Bi-set agonista/antagonista)", "F — Glúteo + Posterior + Panturrilha (Drop-set)"] },
  { id: "abcdef-av-fst7", label: "ABCDEF 6x — Alto Nível FST-7 (7x fechamento)", freq: 6, publico: "unisex", nivel: ["Atleta de Alto Nível"], dias: ["A — Peito (FST-7 no crossover)", "B — Costas (FST-7 na pulldown)", "C — Quadríceps (FST-7 na cadeira extensora)", "D — Ombro (FST-7 na elevação lateral)", "E — Braços (FST-7 rosca + tríceps corda)", "F — Glúteo + Posterior (FST-7 no glúteo)"] },
  { id: "abcdef-av-heavyduty", label: "ABCDEF 6x — Alto Nível Heavy Duty (falha absoluta)", freq: 6, publico: "unisex", nivel: ["Atleta de Alto Nível"], dias: ["A — Peito (1 série até falha + forçadas)", "B — Costas (Falha + negativas assistidas)", "C — Quadríceps (Falha total + parciais)", "D — Ombro (Falha + isometria)", "E — Braços (Falha + rest-pause 15s)", "F — Glúteo + Posterior (Falha + drop)"] },
  { id: "abcdef-av-pre-exaust", label: "ABCDEF 6x — Alto Nível Pré-Exaustão", freq: 6, publico: "unisex", nivel: ["Atleta de Alto Nível"], dias: ["A — Peito (Crucifixo antes do supino)", "B — Costas (Pullover antes da remada)", "C — Quadríceps (Cadeira antes do agachamento)", "D — Ombro (Elevação lateral antes do desenvolvimento)", "E — Braços (Isolador antes do composto)", "F — Glúteo (Coice antes do hip thrust) + Posterior"] },
];

export const filtrarPresetsParaAluno = (sexo: string | null, nivel: Nivel): DivisaoPreset[] => {
  const fem = !!sexo?.toLowerCase().startsWith("f");
  return DIVISOES_PRESETS.filter((p) => {
    if (!p.nivel.includes(nivel)) return false;
    if (fem) return p.publico === "feminino" || p.publico === "unisex";
    return p.publico === "unisex";
  });
};
