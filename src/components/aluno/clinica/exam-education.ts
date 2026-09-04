export const EDUCATION_CLOSING =
  "Antes de iniciar qualquer suplementação ou mudança relevante na dieta, converse com um profissional de saúde para avaliar se é indicado para o seu caso.";

interface EducationTopic {
  /** palavras-chave (normalizadas, sem acento, minúsculas) que identificam o biomarcador */
  keys: string[];
  titulo: string;
  itens: string[];
}

const TOPICS: EducationTopic[] = [
  {
    keys: ["hdl"],
    titulo: "Hábitos frequentemente associados ao HDL",
    itens: [
      "Atividade física regular, especialmente exercícios aeróbicos contínuos, é um dos hábitos mais estudados em relação ao HDL.",
      "Fontes alimentares de gorduras insaturadas e ômega-3 (peixes de água fria, linhaça, chia, azeite, castanhas) aparecem com frequência na literatura sobre perfil lipídico.",
      "Redução de ultraprocessados, frituras e bebidas alcoólicas em excesso costuma ser orientada em diretrizes gerais de saúde cardiovascular.",
      "Não fumar é apontado como fator relevante para o perfil lipídico.",
    ],
  },
  {
    keys: ["ldl", "colesterol total", "nao hdl", "colesterol"],
    titulo: "Hábitos frequentemente associados ao colesterol",
    itens: [
      "Fibras solúveis (aveia, feijões, frutas com casca, vegetais) são bastante citadas em orientações alimentares sobre colesterol.",
      "Redução de gordura saturada e de gordura trans (embutidos, frituras, produtos de padaria industrializados) é uma recomendação geral comum.",
      "Atividade física regular e manutenção de peso corporal saudável são hábitos frequentemente associados ao perfil lipídico.",
    ],
  },
  {
    keys: ["triglic"],
    titulo: "Hábitos frequentemente associados aos triglicerídeos",
    itens: [
      "Redução de açúcares simples, refrigerantes, doces e bebidas alcoólicas é apontada com frequência na literatura sobre triglicerídeos.",
      "Preferência por carboidratos integrais no lugar de refinados costuma ser orientada em diretrizes alimentares gerais.",
      "Atividade física regular é um dos hábitos mais estudados nesse contexto.",
    ],
  },
  {
    keys: ["glicose", "glicemia", "hemoglobina glicada", "hba1c", "insulina", "homa"],
    titulo: "Hábitos frequentemente associados ao metabolismo da glicose",
    itens: [
      "Distribuição das refeições ao longo do dia e preferência por alimentos in natura são orientações alimentares gerais comuns.",
      "Fibras, proteínas e vegetais junto às refeições costumam ser citados por relação com a resposta glicêmica.",
      "Atividade física regular e sono adequado aparecem com frequência em materiais educativos sobre saúde metabólica.",
    ],
  },
  {
    keys: ["ferritina", "ferro", "hemoglobina", "hematocrito", "hemacia"],
    titulo: "Hábitos frequentemente associados ao ferro",
    itens: [
      "Fontes alimentares de ferro incluem carnes, vísceras, feijões, lentilha e vegetais verde-escuros.",
      "Alimentos ricos em vitamina C na mesma refeição são frequentemente citados por favorecer o aproveitamento do ferro de origem vegetal.",
      "Café e chá em grandes quantidades junto às refeições são apontados como fatores que podem reduzir esse aproveitamento.",
    ],
  },
  {
    keys: ["vitamina d", "25-oh", "25 oh"],
    titulo: "Hábitos frequentemente associados à vitamina D",
    itens: [
      "Exposição solar regular e segura é o fator mais citado na literatura sobre vitamina D.",
      "Fontes alimentares incluem peixes gordurosos, gema de ovo e alimentos fortificados.",
      "Atividade física ao ar livre costuma ser mencionada em materiais educativos sobre o tema.",
    ],
  },
  {
    keys: ["tsh", "t4", "t3", "tireoid"],
    titulo: "Informações gerais sobre exames da tireoide",
    itens: [
      "Resultados de tireoide costumam ser interpretados em conjunto com outros exames e com o histórico da pessoa.",
      "Sono regular, manejo do estresse e alimentação variada são hábitos gerais citados em materiais educativos de saúde.",
      "Alterações nesses exames pedem sempre avaliação individualizada, pois não podem ser interpretadas isoladamente.",
    ],
  },
  {
    keys: ["creatinina", "ureia", "tfg", "acido urico", "urico"],
    titulo: "Hábitos frequentemente associados à função renal e ao ácido úrico",
    itens: [
      "Hidratação adequada ao longo do dia é uma orientação geral comum.",
      "Moderação no consumo de bebidas alcoólicas, carnes vermelhas em excesso e bebidas açucaradas aparece com frequência em materiais sobre ácido úrico.",
      "Resultados isolados podem variar com hidratação, alimentação recente e atividade física intensa nos dias anteriores.",
    ],
  },
  {
    keys: ["tgo", "tgp", "ast", "alt", "gama", "ggt", "bilirrubina", "fosfatase"],
    titulo: "Hábitos frequentemente associados às enzimas hepáticas",
    itens: [
      "Redução de bebidas alcoólicas e de ultraprocessados é orientação geral comum em materiais sobre saúde do fígado.",
      "Alimentação rica em vegetais, frutas e fibras, além de atividade física regular, também são hábitos frequentemente citados.",
      "Exercício muito intenso nos dias anteriores pode influenciar alguns desses valores.",
    ],
  },
  {
    keys: ["testosterona", "estradiol", "shbg", "cortisol", "prolactina", "lh", "fsh"],
    titulo: "Hábitos frequentemente associados ao equilíbrio hormonal",
    itens: [
      "Sono regular e suficiente é um dos fatores mais citados na literatura sobre hormônios.",
      "Manejo do estresse, alimentação adequada em energia e nutrientes e atividade física regular também aparecem com frequência.",
      "Horário da coleta e fase do ciclo podem influenciar bastante esses resultados.",
    ],
  },
  {
    keys: ["pcr", "proteina c reativa", "vhs", "homocisteina"],
    titulo: "Hábitos frequentemente associados a marcadores inflamatórios",
    itens: [
      "Infecções recentes, treinos intensos e lesões podem alterar temporariamente esses marcadores.",
      "Alimentação rica em vegetais, frutas, fibras e gorduras insaturadas, além de sono adequado, é citada em materiais educativos gerais.",
      "Redução de ultraprocessados e de tabagismo é orientação frequente em diretrizes de saúde.",
    ],
  },
];

const GENERIC: EducationTopic = {
  keys: [],
  titulo: "Hábitos gerais de saúde",
  itens: [
    "Alimentação variada, baseada em alimentos in natura, com vegetais, frutas, fibras e boas fontes de proteína, é a base das orientações gerais de saúde.",
    "Atividade física regular, sono adequado, hidratação e redução de ultraprocessados e álcool aparecem em praticamente todas as diretrizes educativas.",
    "Um resultado isolado não define nada sozinho: ele precisa ser lido junto com o histórico e outros exames.",
  ],
};

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const getMarkerEducation = (nome: string, codigo?: string) => {
  const haystack = normalize(`${codigo ?? ""} ${nome}`);
  const found = TOPICS.find((t) => t.keys.some((k) => haystack.includes(k)));
  return found ?? GENERIC;
};
