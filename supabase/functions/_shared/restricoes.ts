// ============================================================
// CAMADA DETERMINÍSTICA DE CONTRAINDICAÇÕES (Alpha Coach)
// Não confia na IA: detecta a região lesionada a partir do texto
// livre da anamnese, injeta a trava no prompt E filtra/substitui
// o que a IA devolver.
// ============================================================

export type Gravidade = "leve" | "moderada" | "grave";

export interface RegiaoRestricao {
  chave: string;
  rotulo: string;
  /** termos que identificam a região no texto da anamnese */
  gatilhos: string[];
  /** trechos de nome de exercício PROIBIDOS (comparação por substring normalizada) */
  proibidos: string[];
  /** alternativas seguras sugeridas */
  substitutos: string[];
  /** orientações específicas de execução/protocolo */
  orientacoes: string[];
}

const norm = (s: string) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export const REGIOES: RegiaoRestricao[] = [
  {
    chave: "lombar",
    rotulo: "Coluna lombar / discos",
    gatilhos: [
      "lombar", "lombalgia", "disco", "discal", "discopatia", "degenerativ",
      "hernia", "hérnia", "protrus", "abaulamento", "espondil", "escoliose",
      "coluna", "ciatico", "ciática", "ciatica", "l4", "l5", "s1",
      "incompetencia abdominal", "diastase", "diástase", "core fraco",
    ],
    proibidos: [
      "agachamento livre", "agachamento barra", "agachamento com barra",
      "levantamento terra", "terra convencional", "terra sumo", "deadlift",
      "stiff", "bom dia", "good morning",
      "remada curvada", "remada livre curvada",
      "desenvolvimento militar em pe", "desenvolvimento em pe",
      "hiperextensao", "extensao lombar", "banco romano",
      "agachamento hack livre", "afundo com barra", "avanco com barra",
      "abdominal infra", "elevacao de pernas", "canivete", "abdominal remador",
      "supino em pe", "levantamento olimpico", "arranco", "arremesso", "clean",
      "puxada por tras", "rosca direta com barra em pe com carga alta",
    ],
    substitutos: [
      "Leg press 45 com apoio lombar total",
      "Cadeira extensora",
      "Mesa flexora / Cadeira flexora",
      "Agachamento no Smith com apoio (amplitude parcial controlada)",
      "Remada sentada na máquina com apoio de peito",
      "Puxada frontal na polia alta",
      "Desenvolvimento sentado com encosto",
      "Elevação pélvica (hip thrust) com amplitude controlada",
      "Prancha isométrica, Dead bug, Pallof press (core anti-extensão)",
    ],
    orientacoes: [
      "PROIBIDA qualquer carga axial sobre a coluna (barra nas costas/ombros em pé).",
      "PROIBIDA flexão de tronco com carga e qualquer rotação lombar sob carga.",
      "Todo exercício de membros inferiores deve ter apoio de tronco (encosto, banco ou máquina).",
      "Core OBRIGATÓRIO 3x/semana, exclusivamente ANTI-EXTENSÃO e ANTI-ROTAÇÃO (prancha, dead bug, pallof press, bird dog). PROIBIDO abdominal com flexão de coluna, infra com pernas estendidas e canivete.",
      "Cadência controlada, sem pique/impulso. Nada de repetições explosivas.",
    ],
  },
  {
    chave: "cervical",
    rotulo: "Coluna cervical / pescoço",
    gatilhos: ["cervical", "pescoco", "pescoço", "c5", "c6", "c7", "torcicolo", "nuca"],
    proibidos: [
      "desenvolvimento por tras", "puxada por tras", "encolhimento com barra atras",
      "abdominal com maos na nuca", "ponte de pescoco", "desenvolvimento militar em pe",
    ],
    substitutos: [
      "Desenvolvimento sentado com halteres (pegada neutra)",
      "Puxada frontal na polia alta",
      "Encolhimento com halteres",
    ],
    orientacoes: [
      "PROIBIDO qualquer movimento atrás da nuca.",
      "Priorizar pegada neutra e apoio de cabeça no encosto.",
    ],
  },
  {
    chave: "ombro",
    rotulo: "Ombro / manguito rotador",
    gatilhos: [
      "ombro", "manguito", "supraespinhal", "supraespinal", "impacto",
      "bursite", "luxacao", "luxação", "labrum", "slap", "tendinite do ombro",
    ],
    proibidos: [
      "desenvolvimento por tras", "puxada por tras", "supino declinado com barra",
      "crucifixo com amplitude maxima", "mergulho", "paralelas", "dips",
      "elevacao lateral acima da linha do ombro", "supino reto com barra pegada aberta",
    ],
    substitutos: [
      "Supino com halteres (pegada neutra, amplitude até a linha do tronco)",
      "Desenvolvimento sentado com halteres neutro (Arnold suave)",
      "Crucifixo na máquina com amplitude reduzida",
      "Rotação externa na polia (fortalecimento do manguito)",
    ],
    orientacoes: [
      "Amplitude limitada: nunca descer o cotovelo abaixo da linha do tronco.",
      "Incluir 1 exercício de rotação externa/manguito no aquecimento dos dias de superior.",
      "PROIBIDO qualquer movimento atrás da nuca.",
    ],
  },
  {
    chave: "joelho",
    rotulo: "Joelho",
    gatilhos: [
      "joelho", "menisco", "lca", "lcp", "ligamento cruzado", "condromalacia",
      "condromalácia", "patela", "patelar", "tendinite patelar",
    ],
    proibidos: [
      "agachamento profundo", "agachamento livre", "hack profundo",
      "avanco", "afundo", "bulgaro", "búlgaro", "passada", "salto",
      "pliometria", "box jump", "cadeira extensora unilateral com carga maxima",
    ],
    substitutos: [
      "Leg press com amplitude parcial (até 90°)",
      "Mesa flexora / Cadeira flexora",
      "Cadeira extensora com amplitude parcial e carga moderada",
      "Elevação pélvica (hip thrust)",
      "Panturrilha sentada",
    ],
    orientacoes: [
      "Amplitude máxima de 90° de flexão de joelho.",
      "PROIBIDO impacto, salto e pliometria.",
    ],
  },
  {
    chave: "quadril",
    rotulo: "Quadril",
    gatilhos: ["quadril", "impacto femoroacetabular", "labrum do quadril", "coxofemoral", "bursite trocanterica"],
    proibidos: ["agachamento profundo", "levantamento terra sumo", "abdutora com amplitude maxima", "avanco profundo"],
    substitutos: ["Leg press amplitude parcial", "Elevação pélvica", "Cadeira abdutora com amplitude curta"],
    orientacoes: ["Evitar flexão profunda de quadril e rotação sob carga."],
  },
  {
    chave: "punho_cotovelo",
    rotulo: "Punho / cotovelo",
    gatilhos: ["punho", "cotovelo", "epicondilite", "tunel do carpo", "túnel do carpo", "tendinite do cotovelo"],
    proibidos: ["rosca direta com barra reta", "triceps testa com barra reta", "rosca inversa com barra reta"],
    substitutos: ["Rosca com barra W", "Rosca martelo com halteres", "Tríceps na polia com corda"],
    orientacoes: ["Preferir pegada neutra e barra W. Evitar barra reta e pegadas forçadas."],
  },
  {
    chave: "cardiaco",
    rotulo: "Cardiovascular / pressão arterial",
    gatilhos: ["cardiac", "coracao", "coração", "hipertens", "pressao alta", "pressão alta", "arritmia", "infarto", "avc"],
    proibidos: ["manobra de valsalva", "isometria maxima", "serie ate a falha absoluta"],
    substitutos: ["Séries com 2 repetições na reserva", "Cardio moderado contínuo"],
    orientacoes: [
      "PROIBIDO treinar até a falha absoluta e prender a respiração (Valsalva).",
      "PSE máxima 7-8. Intervalos maiores (90-120s).",
    ],
  },
];

export interface AnaliseRestricoes {
  temRestricao: boolean;
  gravidade: Gravidade;
  regioes: RegiaoRestricao[];
  textoOriginal: string;
  /** bloco pronto para ser prefixado ao system prompt */
  blocoPrompt: string;
  /** lista plana de termos proibidos */
  proibidos: string[];
  substitutos: string[];
}

const GATILHOS_GRAVE = [
  "hernia", "hérnia", "degenerativ", "discopatia", "protrus", "cirurgia", "operad",
  "ruptura", "lca", "luxacao", "luxação", "artrose", "espondilolistese", "infarto", "avc",
  "incompetencia abdominal", "dor cronica", "dor crônica", "fisioterapia",
];
const GATILHOS_MODERADA = ["tendinite", "bursite", "condromalacia", "condromalácia", "dor", "desconforto", "lesao", "lesão", "estiramento"];

const NEGATIVOS = ["nenhuma", "nenhum", "nao", "não", "n/a", "na", "-", "sem lesao", "sem lesão", "nada", "ok", "saudavel", "saudável"];

export function analisarRestricoes(...fontes: (string | string[] | null | undefined)[]): AnaliseRestricoes {
  const partes: string[] = [];
  for (const f of fontes) {
    if (!f) continue;
    if (Array.isArray(f)) partes.push(...f.map((x) => String(x || "")));
    else partes.push(String(f));
  }
  const limpo = partes
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !NEGATIVOS.includes(norm(p)));

  const textoOriginal = limpo.join(" | ");
  const t = norm(textoOriginal);

  if (!t) {
    return {
      temRestricao: false,
      gravidade: "leve",
      regioes: [],
      textoOriginal: "",
      blocoPrompt: "",
      proibidos: [],
      substitutos: [],
    };
  }

  const regioes = REGIOES.filter((r) => r.gatilhos.some((g) => t.includes(norm(g))));

  let gravidade: Gravidade = "leve";
  if (GATILHOS_MODERADA.some((g) => t.includes(norm(g)))) gravidade = "moderada";
  if (GATILHOS_GRAVE.some((g) => t.includes(norm(g)))) gravidade = "grave";

  const proibidos = Array.from(new Set(regioes.flatMap((r) => r.proibidos)));
  const substitutos = Array.from(new Set(regioes.flatMap((r) => r.substitutos)));

  const ajusteProtocolo =
    gravidade === "grave"
      ? [
          "REDUZA o volume total em 25% em relação ao padrão do nível (as regras de volume mínimo NÃO se aplicam aos grupos afetados).",
          "PROIBIDAS técnicas de intensificação (Série Descendente, Pausa-Descanso, Repetições Forçadas) em QUALQUER exercício composto.",
          "PROIBIDO levar exercícios compostos à falha absoluta: PSE máxima 8 (deixar 2 repetições na reserva).",
          "Cadência controlada obrigatória, sem impulso.",
        ]
      : gravidade === "moderada"
        ? [
            "REDUZA o volume dos grupos afetados em 15%.",
            "PROIBIDAS técnicas de intensificação nos exercícios que envolvem a região afetada.",
            "PSE máxima 8-9 nos exercícios que envolvem a região afetada.",
          ]
        : ["Mantenha o volume padrão, mas respeite as substituições e amplitudes indicadas."];

  const blocoPrompt = `

═══════════════════════════════════════════════
REGRA 0 — RESTRIÇÕES CLÍNICAS DO ALUNO (PRIORIDADE ABSOLUTA — SOBREPÕE TODAS AS OUTRAS REGRAS)
═══════════════════════════════════════════════
⚠️ O aluno POSSUI restrições relatadas na anamnese. Esta seção VENCE qualquer outra regra deste prompt.
Em caso de CONFLITO entre "volume mínimo por nível" / "técnicas avançadas obrigatórias" / "estrutura por nível" e uma restrição abaixo, a RESTRIÇÃO SEMPRE VENCE. Prescrever um exercício proibido invalida completamente a resposta.

RELATO DO ALUNO (texto da anamnese): "${textoOriginal}"
GRAVIDADE CLASSIFICADA: ${gravidade.toUpperCase()}
${regioes.length > 0 ? `REGIÕES AFETADAS: ${regioes.map((r) => r.rotulo).join(", ")}` : "REGIÃO NÃO IDENTIFICADA AUTOMATICAMENTE — interprete o relato acima e aplique máxima cautela."}

⛔ EXERCÍCIOS TERMINANTEMENTE PROIBIDOS (não prescreva nenhuma variação destes):
${proibidos.length > 0 ? proibidos.map((p) => `- ${p}`).join("\n") : "- Qualquer exercício que sobrecarregue diretamente a região relatada."}

✅ SUBSTITUTOS SEGUROS OBRIGATÓRIOS (use estes no lugar):
${substitutos.length > 0 ? substitutos.map((s) => `- ${s}`).join("\n") : "- Prefira máquinas guiadas com apoio de tronco no lugar de pesos livres."}

📋 ORIENTAÇÕES DE EXECUÇÃO:
${regioes.flatMap((r) => r.orientacoes).map((o) => `- ${o}`).join("\n") || "- Amplitude controlada, sem dor, sem impacto."}

🔧 AJUSTE DE PROTOCOLO (OBRIGATÓRIO):
${ajusteProtocolo.map((a) => `- ${a}`).join("\n")}

📝 No campo "observacao_clinica" você DEVE: (1) citar a restrição, (2) listar quais exercícios foram evitados e por quê, (3) recomendar acompanhamento e liberação médica/fisioterapêutica antes de progredir cargas.
📝 No campo "observacao" de cada exercício substituído, escreva por que ele foi escolhido (ex: "Substitui agachamento livre — sem carga axial na lombar").
`;

  return { temRestricao: true, gravidade, regioes, textoOriginal, blocoPrompt, proibidos, substitutos };
}

export interface ExercicioBloqueado {
  dia: string;
  nome: string;
  motivo: string;
  substituto: string;
}

/**
 * Segunda camada: remove/substitui o que a IA devolveu mesmo com a trava no prompt.
 */
export function aplicarFiltroRestricoes(
  args: any,
  analise: AnaliseRestricoes,
): { args: any; bloqueados: ExercicioBloqueado[] } {
  const bloqueados: ExercicioBloqueado[] = [];
  if (!analise.temRestricao || !Array.isArray(args?.dias) || analise.proibidos.length === 0) {
    return { args, bloqueados };
  }

  const proibidosNorm = analise.proibidos.map((p) => ({ raw: p, n: norm(p) }));

  for (const dia of args.dias) {
    if (!Array.isArray(dia?.exercicios)) continue;
    const mantidos: any[] = [];
    for (const ex of dia.exercicios) {
      const nomeN = norm(ex?.nome || "");
      const hit = proibidosNorm.find((p) => p.n.length > 3 && nomeN.includes(p.n));
      if (hit) {
        const regiao = analise.regioes.find((r) => r.proibidos.some((p) => norm(p) === hit.n));
        const substituto = regiao?.substitutos[bloqueados.length % (regiao?.substitutos.length || 1)]
          || analise.substitutos[0]
          || "Alternativa em máquina guiada";
        bloqueados.push({
          dia: String(dia?.dia || ""),
          nome: String(ex?.nome || ""),
          motivo: `Contraindicado — ${regiao?.rotulo || "restrição clínica"}`,
          substituto,
        });
        mantidos.push({
          ...ex,
          nome: substituto,
          observacao: `⚠️ Substituição automática de segurança: "${ex?.nome}" é contraindicado (${regiao?.rotulo || "restrição clínica"}). ${ex?.observacao || ""}`.trim(),
        });
      } else {
        mantidos.push(ex);
      }
    }
    dia.exercicios = mantidos;
  }

  if (bloqueados.length > 0) {
    const resumo = `⚠️ ${bloqueados.length} exercício(s) contraindicado(s) foram substituídos automaticamente pela trava de segurança clínica (${analise.regioes.map((r) => r.rotulo).join(", ") || "restrição relatada"}). Revise antes de enviar ao aluno. Treino com patologia diagnosticada exige liberação médica.`;
    args.observacao_clinica = `${resumo}\n\n${args.observacao_clinica || ""}`.trim();
  }

  return { args, bloqueados };
}
