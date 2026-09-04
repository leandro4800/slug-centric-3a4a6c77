export const EDUCATION_CLOSING =
  "Antes de iniciar qualquer suplementação ou mudança relevante na dieta, converse com um profissional de saúde para avaliar se é indicado para o seu caso.";

interface EducationTopic {
  /** palavras-chave (normalizadas, sem acento, minúsculas) que identificam o biomarcador */
  keys: string[];
  titulo: string;
  itens: string[];
}

const TOPICS: EducationTopic[] = [
  // ---------- Perfil lipídico ----------
  {
    keys: ["hdl", "colesterol hdl"],
    titulo: "Hábitos frequentemente associados ao HDL",
    itens: [
      "Atividade física regular, especialmente exercícios aeróbicos contínuos, é um dos hábitos mais estudados em relação ao HDL.",
      "Fontes alimentares de gorduras insaturadas e ômega-3 (peixes de água fria, linhaça, chia, azeite, castanhas) aparecem com frequência na literatura sobre perfil lipídico.",
      "Redução de ultraprocessados, frituras e bebidas alcoólicas em excesso costuma ser orientada em diretrizes gerais de saúde cardiovascular.",
      "Não fumar é apontado como fator relevante para o perfil lipídico.",
    ],
  },
  {
    keys: ["ldl", "vldl", "nao hdl", "nao-hdl", "colesterol total", "colesterol", "apolipoproteina", "apo b", "apob", "lipoproteina a", "lp(a)", "lpa"],
    titulo: "Hábitos frequentemente associados ao colesterol",
    itens: [
      "Fibras solúveis (aveia, feijões, frutas com casca, vegetais) são bastante citadas em orientações alimentares sobre colesterol.",
      "Redução de gordura saturada e de gordura trans (embutidos, frituras, produtos de padaria industrializados) é uma recomendação geral comum.",
      "Atividade física regular e manutenção de peso corporal saudável são hábitos frequentemente associados ao perfil lipídico.",
      "Alguns marcadores lipídicos têm forte componente genético e por isso precisam de leitura individualizada por um profissional.",
    ],
  },
  {
    keys: ["triglic", "trigliceride"],
    titulo: "Hábitos frequentemente associados aos triglicerídeos",
    itens: [
      "Redução de açúcares simples, refrigerantes, doces e bebidas alcoólicas é apontada com frequência na literatura sobre triglicerídeos.",
      "Preferência por carboidratos integrais no lugar de refinados costuma ser orientada em diretrizes alimentares gerais.",
      "Atividade física regular é um dos hábitos mais estudados nesse contexto.",
      "O tempo de jejum antes da coleta pode influenciar bastante esse resultado.",
    ],
  },

  // ---------- Metabolismo da glicose ----------
  {
    keys: ["glicose", "glicemia", "hemoglobina glicada", "glicada", "hba1c", "a1c", "insulina", "homa", "peptideo c", "frutosamina", "curva glicemica", "tolerancia a glicose"],
    titulo: "Hábitos frequentemente associados ao metabolismo da glicose",
    itens: [
      "Distribuição das refeições ao longo do dia e preferência por alimentos in natura são orientações alimentares gerais comuns.",
      "Fibras, proteínas e vegetais junto às refeições costumam ser citados por relação com a resposta glicêmica.",
      "Atividade física regular (aeróbica e de força) e sono adequado aparecem com frequência em materiais educativos sobre saúde metabólica.",
      "Jejum incorreto, doença aguda e estresse recente podem alterar temporariamente esses valores.",
    ],
  },

  // ---------- Hemograma / ferro ----------
  {
    keys: ["ferritina", "ferro serico", "ferro", "transferrina", "saturacao de transferrina", "tibc", "hemoglobina", "hematocrito", "hemacia", "eritrocito", "vcm", "hcm", "chcm", "rdw"],
    titulo: "Hábitos frequentemente associados ao ferro e à série vermelha",
    itens: [
      "Fontes alimentares de ferro incluem carnes, vísceras, feijões, lentilha e vegetais verde-escuros.",
      "Alimentos ricos em vitamina C na mesma refeição são frequentemente citados por favorecer o aproveitamento do ferro de origem vegetal.",
      "Café e chá em grandes quantidades junto às refeições são apontados como fatores que podem reduzir esse aproveitamento.",
      "A ferritina também sobe em quadros inflamatórios, por isso costuma ser lida junto com marcadores de inflamação.",
    ],
  },
  {
    keys: ["leucocito", "neutrofilo", "linfocito", "monocito", "eosinofilo", "basofilo", "plaqueta", "hemograma"],
    titulo: "Informações gerais sobre células de defesa e plaquetas",
    itens: [
      "Esses valores variam bastante com infecções recentes, alergias, estresse físico e uso de alguns medicamentos.",
      "Sono adequado, alimentação variada e recuperação entre treinos são hábitos gerais citados em materiais educativos.",
      "Como oscilam com facilidade, costumam ser interpretados em conjunto e ao longo do tempo, nunca em um exame isolado.",
    ],
  },
  {
    keys: ["vitamina b12", "b12", "cobalamina", "acido folico", "folato"],
    titulo: "Hábitos frequentemente associados à B12 e ao folato",
    itens: [
      "Fontes alimentares de B12 são de origem animal (carnes, ovos, leite e derivados); alimentos fortificados também são citados.",
      "Folato aparece em vegetais verde-escuros, feijões, lentilha, abacate e frutas cítricas.",
      "Dietas vegetarianas estritas e algumas condições do estômago/intestino são frequentemente mencionadas em materiais educativos sobre B12.",
    ],
  },

  // ---------- Vitaminas e minerais ----------
  {
    keys: ["vitamina d", "25-oh", "25 oh", "calcidiol", "colecalciferol"],
    titulo: "Hábitos frequentemente associados à vitamina D",
    itens: [
      "Exposição solar regular e segura é o fator mais citado na literatura sobre vitamina D.",
      "Fontes alimentares incluem peixes gordurosos, gema de ovo e alimentos fortificados.",
      "Atividade física ao ar livre costuma ser mencionada em materiais educativos sobre o tema.",
    ],
  },
  {
    keys: ["calcio", "fosforo", "paratormonio", "pth", "vitamina k"],
    titulo: "Informações gerais sobre cálcio e saúde óssea",
    itens: [
      "Leite e derivados, vegetais verde-escuros, tofu e sardinha aparecem entre as fontes alimentares mais citadas de cálcio.",
      "Exercícios de força e de impacto são frequentemente associados à saúde óssea em materiais educativos.",
      "Cálcio, fósforo, vitamina D e PTH costumam ser interpretados em conjunto, nunca isoladamente.",
    ],
  },
  {
    keys: ["magnesio", "zinco", "potassio", "sodio", "cloro", "selenio", "cobre"],
    titulo: "Informações gerais sobre minerais e eletrólitos",
    itens: [
      "Alimentos in natura variados — folhas, castanhas, sementes, feijões, frutas, carnes e frutos do mar — são as fontes alimentares mais citadas desses minerais.",
      "Hidratação, sudorese intensa em treinos e uso de alguns medicamentos podem influenciar eletrólitos como sódio e potássio.",
      "Suplementação de minerais sem avaliação pode desequilibrar outros nutrientes, por isso costuma ser orientada individualmente.",
    ],
  },
  {
    keys: ["vitamina a", "vitamina e", "vitamina c", "vitamina b6", "vitamina b1", "tiamina", "complexo b"],
    titulo: "Informações gerais sobre vitaminas",
    itens: [
      "Frutas, vegetais, castanhas, ovos, cereais integrais e alimentos de origem animal são as fontes alimentares mais citadas dessas vitaminas.",
      "Uma alimentação variada costuma ser apontada em diretrizes como a base para a maioria dos micronutrientes.",
      "Vitaminas lipossolúveis (A, D, E, K) podem acumular no organismo, por isso suplementar sem avaliação não é recomendado.",
    ],
  },

  // ---------- Tireoide ----------
  {
    keys: ["tsh", "t4", "t3", "tireoid", "anti-tpo", "anti tpo", "antitireoglobulina", "tireoglobulina"],
    titulo: "Informações gerais sobre exames da tireoide",
    itens: [
      "Resultados de tireoide costumam ser interpretados em conjunto com outros exames e com o histórico da pessoa.",
      "Sono regular, manejo do estresse e alimentação variada (incluindo fontes de iodo e selênio) são hábitos gerais citados em materiais educativos.",
      "Horário da coleta, doenças agudas e alguns medicamentos podem influenciar esses valores.",
      "Alterações nesses exames pedem sempre avaliação individualizada, pois não podem ser interpretadas isoladamente.",
    ],
  },

  // ---------- Rim / ácido úrico ----------
  {
    keys: ["creatinina", "ureia", "tfg", "taxa de filtracao", "clearance", "cistatina", "microalbumin", "albuminuria"],
    titulo: "Hábitos frequentemente associados à função renal",
    itens: [
      "Hidratação adequada ao longo do dia é uma orientação geral comum.",
      "Consumo muito alto de proteína/suplementos, desidratação e treinos intensos nos dias anteriores podem influenciar a creatinina.",
      "Controle da pressão arterial e da glicemia aparece em praticamente todas as diretrizes educativas sobre saúde renal.",
    ],
  },
  {
    keys: ["acido urico", "urico"],
    titulo: "Hábitos frequentemente associados ao ácido úrico",
    itens: [
      "Moderação no consumo de bebidas alcoólicas (especialmente cerveja), carnes vermelhas, vísceras, frutos do mar e bebidas açucaradas aparece com frequência em materiais educativos.",
      "Boa hidratação é uma das orientações gerais mais citadas nesse contexto.",
      "Jejum prolongado e perda de peso muito rápida também são apontados como fatores que podem elevar temporariamente esse valor.",
    ],
  },
  {
    keys: ["urina", "eas", "sedimento", "densidade urinaria", "nitrito"],
    titulo: "Informações gerais sobre o exame de urina",
    itens: [
      "O resultado varia com hidratação, horário da coleta e alimentação recente.",
      "Coleta feita fora das orientações do laboratório é uma causa comum de achados que não se confirmam depois.",
      "Achados isolados na urina costumam ser reavaliados com um novo exame antes de qualquer conclusão.",
    ],
  },

  // ---------- Fígado ----------
  {
    keys: ["tgo", "tgp", "ast", "alt", "gama", "ggt", "bilirrubina", "fosfatase", "albumina", "proteinas totais"],
    titulo: "Hábitos frequentemente associados às enzimas hepáticas",
    itens: [
      "Redução de bebidas alcoólicas e de ultraprocessados é orientação geral comum em materiais sobre saúde do fígado.",
      "Alimentação rica em vegetais, frutas e fibras, além de atividade física regular, também são hábitos frequentemente citados.",
      "Exercício muito intenso nos dias anteriores, alguns suplementos e medicamentos podem influenciar esses valores.",
    ],
  },

  // ---------- Músculo ----------
  {
    keys: ["cpk", "ck", "creatinoquinase", "creatina quinase", "ldh", "mioglobina", "aldolase"],
    titulo: "Informações gerais sobre marcadores musculares",
    itens: [
      "Treinos intensos, especialmente de força ou após período parado, elevam esses valores de forma temporária e esperada.",
      "Descanso, sono e hidratação adequados nos dias anteriores ao exame costumam ser orientados para evitar leituras distorcidas.",
      "Se o exame foi feito logo depois de um treino pesado, repetir em repouso é uma conduta educativa comum.",
    ],
  },

  // ---------- Hormônios ----------
  {
    keys: ["testosterona", "shbg", "dheas", "dhea", "androstenediona", "di-hidrotestosterona", "dht"],
    titulo: "Hábitos frequentemente associados aos hormônios androgênicos",
    itens: [
      "Sono regular e suficiente é um dos fatores mais citados na literatura sobre testosterona.",
      "Alimentação adequada em energia, gorduras e micronutrientes, treino de força e controle do percentual de gordura corporal também aparecem com frequência.",
      "Horário da coleta importa bastante: esses hormônios costumam ser mais altos pela manhã.",
      "Testosterona total e livre são lidas em conjunto com SHBG e com o quadro clínico da pessoa.",
    ],
  },
  {
    keys: ["estradiol", "estrogenio", "progesterona", "prolactina", "lh", "fsh", "amh", "beta hcg"],
    titulo: "Informações gerais sobre hormônios do ciclo reprodutivo",
    itens: [
      "Esses valores mudam muito conforme a fase do ciclo menstrual e o horário da coleta.",
      "Sono, estresse, disponibilidade de energia na dieta e volume de treino aparecem com frequência em materiais educativos sobre o tema.",
      "A interpretação depende do momento da coleta, então só faz sentido junto com avaliação profissional.",
    ],
  },
  {
    keys: ["cortisol", "acth", "aldosterona"],
    titulo: "Hábitos frequentemente associados ao cortisol",
    itens: [
      "O cortisol tem ritmo diário: é naturalmente mais alto pela manhã e mais baixo à noite, por isso o horário da coleta é decisivo.",
      "Sono, manejo do estresse, volume/intensidade de treino e ingestão calórica são fatores citados com frequência.",
      "Um valor isolado dificilmente conclui algo; a leitura considera o contexto e o horário.",
    ],
  },
  {
    keys: ["igf", "hormonio do crescimento", "gh", "somatomedina"],
    titulo: "Informações gerais sobre IGF-1 e eixo do crescimento",
    itens: [
      "Sono profundo, ingestão adequada de proteína e energia e treino de força são fatores frequentemente citados nesse contexto.",
      "Idade influencia bastante os valores de referência desse marcador.",
      "É um exame que precisa de leitura individualizada, junto com o histórico da pessoa.",
    ],
  },
  {
    keys: ["leptina", "grelina", "adiponectina"],
    titulo: "Informações gerais sobre hormônios do apetite",
    itens: [
      "Sono insuficiente e dietas muito restritivas são fatores frequentemente citados em relação ao apetite e à saciedade.",
      "Refeições com proteína, fibras e alimentos in natura aparecem em materiais educativos sobre controle de saciedade.",
      "Esses marcadores costumam ser usados em contexto de pesquisa e pedem interpretação profissional.",
    ],
  },

  // ---------- Inflamação e cardiovascular ----------
  {
    keys: ["pcr", "proteina c reativa", "vhs", "homocisteina", "fibrinogenio", "interleucina", "ferro inflamat"],
    titulo: "Hábitos frequentemente associados a marcadores inflamatórios",
    itens: [
      "Infecções recentes, treinos intensos e lesões podem alterar temporariamente esses marcadores.",
      "Alimentação rica em vegetais, frutas, fibras e gorduras insaturadas, além de sono adequado, é citada em materiais educativos gerais.",
      "Redução de ultraprocessados e de tabagismo é orientação frequente em diretrizes de saúde.",
    ],
  },
  {
    keys: ["troponina", "ck-mb", "ckmb", "bnp", "nt-probnp", "dimero"],
    titulo: "Informações gerais sobre marcadores cardíacos",
    itens: [
      "São exames usados em contextos clínicos específicos e sempre interpretados por um profissional junto com sintomas e outros exames.",
      "Esforço físico muito intenso e algumas condições podem influenciar parte desses valores.",
      "Qualquer resultado fora do intervalo aqui merece conversa com um profissional de saúde, sem tentar interpretação por conta própria.",
    ],
  },

  // ---------- Coagulação ----------
  {
    keys: ["tap", "inr", "ttpa", "tempo de protrombina", "coagulograma"],
    titulo: "Informações gerais sobre exames de coagulação",
    itens: [
      "Esses exames são bastante influenciados por medicamentos em uso e por condições do fígado.",
      "Alimentos ricos em vitamina K (folhas verde-escuras) são citados em materiais educativos por interagirem com alguns medicamentos.",
      "A leitura depende totalmente do contexto individual e do que a pessoa usa, então precisa de avaliação profissional.",
    ],
  },

  // ---------- Próstata e outros ----------
  {
    keys: ["psa", "antigeno prostatico"],
    titulo: "Informações gerais sobre o PSA",
    itens: [
      "Ciclismo, relações sexuais recentes, exames e procedimentos na região podem influenciar temporariamente esse valor.",
      "Idade é um fator importante na interpretação dos intervalos de referência.",
      "Esse é um exame de acompanhamento que precisa obrigatoriamente de leitura por um profissional de saúde.",
    ],
  },
  {
    keys: ["sorologia", "hbsag", "anti-hcv", "hiv", "vdrl", "toxoplasm", "rubeola", "citomegalo"],
    titulo: "Informações gerais sobre sorologias",
    itens: [
      "Sorologias indicam contato prévio, imunidade ou necessidade de investigação, dependendo do teste e do contexto.",
      "Resultados desse tipo não devem ser interpretados sozinhos nem por meio de aplicativo.",
      "Procure um profissional de saúde para entender o significado no seu caso específico.",
    ],
  },
  {
    keys: ["helicobacter", "parasitologico", "sangue oculto", "calprotectina"],
    titulo: "Informações gerais sobre exames digestivos",
    itens: [
      "A qualidade da coleta e o preparo influenciam bastante esse tipo de resultado.",
      "Alimentação variada, rica em fibras, hidratação e regularidade nas refeições são orientações gerais comuns para a saúde digestiva.",
      "Achados nesses exames precisam de avaliação profissional para definir os próximos passos.",
    ],
  },
];

const GENERIC: EducationTopic = {
  keys: [],
  titulo: "Hábitos gerais de saúde",
  itens: [
    "Alimentação variada, baseada em alimentos in natura, com vegetais, frutas, fibras e boas fontes de proteína, é a base das orientações gerais de saúde.",
    "Atividade física regular, sono adequado, hidratação e redução de ultraprocessados e álcool aparecem em praticamente todas as diretrizes educativas.",
    "Jejum, treinos intensos, medicamentos e infecções recentes podem influenciar muitos exames laboratoriais.",
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
  let best: { topic: EducationTopic; len: number } | null = null;

  for (const topic of TOPICS) {
    for (const key of topic.keys) {
      if (haystack.includes(key) && (!best || key.length > best.len)) {
        best = { topic, len: key.length };
      }
    }
  }

  return best?.topic ?? GENERIC;
};
