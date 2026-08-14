import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function extractPdfText(b64: string): Promise<string> {
  try {
    const bytes = base64ToBytes(b64);
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : (text || "");
  } catch (e) {
    console.error("PDF extract error:", e);
    return "";
  }
}

const parseJsonContent = (content: string) => {
  try {
    return JSON.parse(content || "{}");
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  }
};

const SEVEN_FOLD_KEYS = ["peitoral", "axilar_media", "triceps", "subescapular", "abdominal", "suprailiaca", "coxa"] as const;
type SevenFoldKey = typeof SEVEN_FOLD_KEYS[number];

const normalizeToken = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const numberFromUnknown = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value ?? "").replace(",", ".");
  const match = text.match(/\b\d{1,3}(?:\.\d+)?\b/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) && n >= 2 && n <= 80 ? n : null;
};

const numberListFromText = (text: string) =>
  [...String(text || "").replace(/,/g, ".").matchAll(/\b\d{1,3}(?:\.\d+)?\b/g)]
    .map((m) => Number(m[0]))
    .filter((n) => Number.isFinite(n) && n >= 2 && n <= 80);

const FOLD_ALIASES: Record<SevenFoldKey, string[]> = {
  peitoral: ["peitoral", "dobra peitoral", "chest", "pectoral", "pectoralis", "torax", "tórax", "pt", "peit"],
  axilar_media: ["axilar media", "axilar média", "axilar medial", "axilarmedia", "midaxillary", "axilar", "ax", "am"],
  triceps: ["triceps", "tríceps", "tricep", "tricipital", "tri", "tric"],
  subescapular: ["subescapular", "sub escapular", "subescapularis", "sub scapular", "subscapular", "sub", "subesc", "se"],
  abdominal: ["abdominal", "abdomen", "abdômen", "dobra abdominal", "abdominal vertical", "abd"],
  suprailiaca: ["suprailiaca", "suprailíaca", "supra iliaca", "supra-ilíaca", "suprailiac", "supra", "si"],
  coxa: ["coxa", "coxa medial", "coxa media", "coxa média", "thigh", "cx"],
};

const findSevenFoldKey = (label: unknown): SevenFoldKey | null => {
  const normalized = normalizeToken(label);
  if (!normalized) return null;
  for (const key of SEVEN_FOLD_KEYS) {
    for (const alias of FOLD_ALIASES[key]) {
      const normalizedAlias = normalizeToken(alias);
      if (normalized === normalizedAlias || normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized)) return key;
    }
  }
  return null;
};

export const normalizeSevenFoldResult = (...sources: any[]) => {
  const dobras: Record<SevenFoldKey, number | null> = {
    peitoral: null,
    axilar_media: null,
    triceps: null,
    subescapular: null,
    abdominal: null,
    suprailiaca: null,
    coxa: null,
  };
  const campos = new Set<string>();
  const textParts: string[] = [];
  let peso: number | null = null;
  let altura: number | null = null;
  let idade: number | null = null;
  let sexo: string | null = null;

  const setFold = (key: SevenFoldKey | null, value: unknown, label?: unknown, force = false) => {
    if (!key || (dobras[key] !== null && !force)) return;
    const n = numberFromUnknown(value);
    if (n === null) return;
    dobras[key] = n;
    if (label) campos.add(String(label));
  };

  const fillByOrder = (values: unknown[], force = false) => {
    const nums = values.map(numberFromUnknown).filter((n): n is number => n !== null);
    if (nums.length >= 7) SEVEN_FOLD_KEYS.forEach((key, index) => setFold(key, nums[index], "ordem Jackson & Pollock", force));
  };

  const parseText = (text: string) => {
    if (!text.trim()) return;
    textParts.push(text.slice(0, 1500));
    const lines = text.split(/\n|;|\|/).map((line) => line.trim()).filter(Boolean);
    const normalizedWholeText = normalizeToken(text);
    const mentionedInText = SEVEN_FOLD_KEYS.filter((key) => FOLD_ALIASES[key].some((alias) => normalizedWholeText.includes(normalizeToken(alias)))).length;

    if (mentionedInText >= 6) {
      const allNumbers = numberListFromText(text);
      if (allNumbers.length === 7) fillByOrder(allNumbers, true);
    }

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const normalizedLine = normalizeToken(line);
      const mentionedInLine = SEVEN_FOLD_KEYS.filter((key) => FOLD_ALIASES[key].some((alias) => normalizedLine.includes(normalizeToken(alias)))).length;
      const lineNumbers = numberListFromText(line);
      if (mentionedInLine >= 6 && lineNumbers.length >= 7) fillByOrder(lineNumbers, true);
      if (mentionedInLine >= 6 && lineNumbers.length === 0) {
        const followingNumbers = numberListFromText([lines[lineIndex + 1], lines[lineIndex + 2]].filter(Boolean).join(" "));
        if (followingNumbers.length >= 7) fillByOrder(followingNumbers, true);
      }

      for (const key of SEVEN_FOLD_KEYS) {
        if (dobras[key] !== null) continue;
        for (const alias of FOLD_ALIASES[key]) {
          const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*");
          const rx = new RegExp(`${escapedAlias}[^0-9]{0,80}(\\d{1,3}(?:[,.]\\d+)?)`, "i");
          const reverseRx = new RegExp(`(\\d{1,3}(?:[,.]\\d+)?)[^a-zA-ZÀ-ÿ0-9]{0,20}${escapedAlias}`, "i");
          const match = line.match(rx) || line.match(reverseRx);
          if (match?.[1]) setFold(key, match[1], alias);
        }
      }
    }
    if (mentionedInText >= 4) fillByOrder(numberListFromText(text));
  };

  const walk = (obj: unknown) => {
    if (obj === null || obj === undefined) return;
    if (typeof obj === "string") { parseText(obj); return; }
    if (typeof obj === "number") return;
    if (Array.isArray(obj)) {
      if (obj.length >= 7 && obj.every((item) => typeof item === "string" || typeof item === "number")) fillByOrder(obj);
      obj.forEach(walk);
      return;
    }
    if (typeof obj !== "object") return;

    const entries = Object.entries(obj as Record<string, unknown>);
    const labelEntry = entries.find(([k]) => ["nome", "name", "label", "dobra", "campo", "tipo", "local", "regiao", "região", "ponto", "site", "campo_lido"].includes(normalizeToken(k)));
    const valueEntry = entries.find(([k]) => ["valor", "value", "mm", "valormm", "valor_mm", "medicao", "medição", "resultado", "medidamm", "medida_mm", "dobramm", "dobra_mm", "milimetros", "milímetros"].includes(normalizeToken(k)));
    if (labelEntry && valueEntry) setFold(findSevenFoldKey(labelEntry[1]), valueEntry[1], labelEntry[1]);

    const orderedEntry = entries.find(([k, value]) => ["valores", "values", "medidas", "dobras", "lista", "ordem", "ordemjacksonpollock", "ordem_jackson_pollock"].includes(normalizeToken(k)) && Array.isArray(value));
    if (orderedEntry && Array.isArray(orderedEntry[1])) fillByOrder(orderedEntry[1]);

    for (const [rawKey, value] of entries) {
      const key = normalizeToken(rawKey);
      if (["peso", "pesokg", "peso_kg", "weight"].includes(key)) peso ??= numberFromUnknown(value);
      if (["altura", "alturacm", "altura_cm", "height"].includes(key)) altura ??= numberFromUnknown(value);
      if (["idade", "age"].includes(key)) idade ??= numberFromUnknown(value);
      if (["sexo", "gender"].includes(key) && value) sexo ??= String(value).toUpperCase().startsWith("F") ? "F" : String(value).toUpperCase().startsWith("M") ? "M" : null;
      setFold(findSevenFoldKey(rawKey), value, rawKey);
      if (["textolido", "texto_lido", "texto", "ocr", "transcricao", "transcrição", "rawtext", "content", "conteudo", "conteúdo"].includes(key)) parseText(String(value ?? ""));
      walk(value);
    }
  };

  sources.forEach(walk);
  return { peso, altura, idade, sexo, dobras, campos_encontrados: [...campos], texto_lido: textParts.join("\n").slice(0, 3000) };
};

export const hasSevenFoldValues = (result: any) => Object.values(normalizeSevenFoldResult(result).dobras).some((value) => value !== null);

export const sevenFoldValueCount = (result: any) => Object.values(normalizeSevenFoldResult(result).dobras).filter((value) => value !== null).length;

export const mergeSevenFoldResult = (...sources: any[]) => {
  const normalized = normalizeSevenFoldResult(...sources);
  const first = sources.find(Boolean) || {};
  return {
    ...first,
    peso: first?.peso ?? normalized.peso,
    altura: first?.altura ?? normalized.altura,
    idade: first?.idade ?? normalized.idade,
    sexo: first?.sexo ?? normalized.sexo,
    dobras: normalized.dobras,
    campos_encontrados: normalized.campos_encontrados,
    texto_lido: first?.texto_lido || normalized.texto_lido,
  };
};

const ANAMNESE_SCHEMA = `Estrutura esperada: {
  "doencas": string[],
  "medicamentos": string,
  "lesoes_atuais": string,
  "horas_sono": number,
  "qualidade_sono": number,
  "nivel_estresse": number,
  "tabagismo": boolean,
  "alcool": string,
  "suplementos": string[],
  "restricoes_alimentares": string[],
  "refeicoes_dia": number,
  "agua_litros": number,
  "anos_treino": number,
  "horario_treino": string,
  "nivel_experiencia": "iniciante" | "intermediario" | "avancado",
  "faz_uso_ergogenicos": boolean,
  "detalhes_ergogenicos": string,
  "historico_familiar": string,
  "cirurgias": string,
  "alimentos_ama": string,
  "alimentos_evita": string,
  "modalidades_anteriores": string[],
  "tempo_recuperacao": string,
  "alimentos_basicos_casa": string,
  "cafe_lanche_habitual": string,
  "proteinas_consumidas": string,
  "frutas_vegetais_preferidos": string,
  "horario_almoco": string,
  "horario_jantar": string,
  "nivel_atividade_diaria": string
}`;

const DEFAULT_SEVEN_FOLD_VISUAL_PROMPT =
  "Analise a imagem como se fosse um avaliador físico experiente. Faça apenas uma estimativa visual, deixando claro que não se trata de uma medição real com adipômetro. Estime os valores das 7 dobras cutâneas em milímetros (protocolo Jackson & Pollock para mulheres): peitoral, axilar média, tríceps, subescapular, abdominal, supra-ilíaca e coxa. Em seguida, informe a soma das 7 dobras e, se possível, apresente uma estimativa do percentual de gordura corporal baseada nesses valores, destacando que se trata apenas de uma aproximação visual e que a avaliação precisa exige medição com adipômetro realizada por um profissional";

const AI_VISUAL_ESTIMATE_WARNING =
  "Estimativa visual feita por IA. Não é uma medição real com adipômetro e não substitui avaliação presencial realizada por profissional.";

const JACKSON_POLLOCK_SOURCE_URL = "https://pubmed.ncbi.nlm.nih.gov/702330/";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { file, fileType, importType, alunoId, tenantId, dryRun } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ANON_KEY) throw new Error("Supabase credentials not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authErr } = await authClient.auth.getUser(token);
    if (authErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (!tenantId || (!dryRun && !alunoId)) {
      return new Response(JSON.stringify({ error: "tenantId (e alunoId quando não for dryRun) são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let allowed = !!alunoId && callerId === alunoId;
    if (!allowed) {
      const { data: isCoach } = await supabase.rpc("has_role", {
        _user_id: callerId, _role: "coach", _tenant_id: tenantId,
      });
      allowed = !!isCoach;
      if (!allowed) {
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: callerId, _role: "admin",
        });
        allowed = !!isAdmin;
      }
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedFileType = String(fileType || "").toLowerCase();
    const isSevenFoldsImport = importType === "7dobras" || importType === "avaliacao";
    const isPDF = normalizedFileType === "application/pdf";
    const isUnknownBinaryImage =
      isSevenFoldsImport &&
      (!normalizedFileType || normalizedFileType === "application/octet-stream" || normalizedFileType === "binary/octet-stream");
    const isImage = normalizedFileType.startsWith("image/") || isUnknownBinaryImage;
    const imageMimeType = normalizedFileType.startsWith("image/") ? normalizedFileType : "image/jpeg";

    let pdfText = "";
    if (isPDF) {
      pdfText = await extractPdfText(file);
      if (!pdfText || pdfText.replace(/\s+/g, "").length < 30) {
        return new Response(JSON.stringify({
          error: "Não foi possível extrair texto deste PDF. Ele pode ser um PDF escaneado (imagem). Tente exportar como imagem (JPG/PNG) ou usar um PDF com texto selecionável.",
        }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    let sevenFoldVisualPrompt = DEFAULT_SEVEN_FOLD_VISUAL_PROMPT;
    if (isSevenFoldsImport) {
      const { data: promptConfig } = await supabase
        .from("configuracoes_tenant")
        .select("valor")
        .eq("tenant_id", tenantId)
        .eq("chave", "prompt_ia_7_dobras_visual")
        .maybeSingle();
      if (promptConfig?.valor) sevenFoldVisualPrompt = promptConfig.valor;
    }

    const schemaForType =
      importType === "treino"
        ? `Estrutura esperada: { "dias": [ { "dia": "string", "exercicios": [ { "nome": "string", "series": "string", "repeticoes": "string", "cadencia": "string", "detalhes_execucao": "string", "observacao": "string" } ] } ], "cardio": "string" }`
        : importType === "dieta"
        ? `Estrutura esperada: {
  "objetivo": "string (objetivo/meta do plano, como escrito no documento)",
  "kcal_alvo": number | null,
  "tmb": number | null,
  "macros_alvo": { "proteina_g": number | null, "carboidrato_g": number | null, "lipideos_g": number | null } | null,
  "gasto_calorico_treino": "string | null",
  "agua_litros_dia": "string | null",
  "observacoes": "string (TODAS as observações, orientações, restrições, suplementação e recados do documento, uma por linha)",
  "refeicoes": [ { "nome": "string", "horario": "string", "descricao": "TODAS as linhas da refeição, exatamente como escritas", "itens": [ { "nome": "string (texto do item exatamente como no documento)", "quantidade_g": number | null, "unidade": "g | ml | unidade" } ] } ]
}

REGRAS OBRIGATÓRIAS PARA DIETA:
- NÃO calcule kcal nem macros. Só preencha "kcal_alvo", "tmb" e "macros_alvo" se o documento trouxer os números escritos (ex.: "Valor do Plano Alimentar: 2400kcal/dia" -> kcal_alvo = 2400; "TMB: 1780Kcal/dia" -> tmb = 1780; "Proteínas: 180g / Carboidratos: 250g / Gorduras: 60g" -> macros_alvo). Se os totais de macros não estiverem escritos, use null.

- O campo "descricao" NUNCA pode ficar vazio. Ele deve conter TODAS as linhas da refeição no formato "Alimento — medida caseira (substituições)", uma por linha, exatamente como no documento (inclusive "Livre", "200-350g", "3 unidades", "OU Ricota OU Cottage").
- Se o documento vier de uma tabela com colunas (Refeição/Horário | Distribuição dos Alimentos | Medidas Caseiras | Substituições), associe linha a linha: cada alimento com a sua medida caseira e a sua substituição.
- Blocos gerais que não são refeição (ex.: "EM JEJUM ... 500ml de água + 1 cápsula", "Suplementação antes de dormir 5g de creatina") também devem virar refeições com nome e descrição completa, com horario null se não houver.
- Mantenha blocos de opções alternativas separados no campo descricao com linhas "Opção 1", "Opção 2" quando existirem.
- PROIBIDO INVENTAR: transcreva SOMENTE o que está escrito no documento. Nunca acrescente alimentos, quantidades, marcas ou substituições que não estejam no texto. Se algo não estiver escrito, deixe fora (null / lista vazia). Copie os nomes exatamente como aparecem (ex.: "500ml de água", "1 cápsula de Lipodrene amarelo").
- PROIBIDO REPETIR: cada bloco de horário tem SEU PRÓPRIO conteúdo. Nunca copie as linhas de uma refeição para outra. Duas refeições NUNCA podem ter a mesma lista de alimentos.
- Quando aparecer um horário sozinho, sem nome de refeição (ex.: "( 10:00 h )" logo abaixo de "Desjejum ( 06:30 h )"), isso é OUTRA refeição: use como nome o título escrito dentro do bloco (ex.: "Shake Proteico") ou o horário, e transcreva APENAS as linhas daquele bloco (no exemplo: Leite Integral Zero Lactose 200ml / Banana Prata 1 Unidade / Albumina S/ Sabor 30g / Canela Livre).
- "itens": liste CADA linha de alimento/bebida/suplemento exatamente como escrita, com "quantidade_g" numérica quando houver quantidade. Para líquidos em ml, use o número em ml (500ml -> 500) e marque "unidade": "ml"; para sólidos use gramas e "unidade": "g". Converta medidas caseiras SÓ quando o documento não trouxer peso (1 ovo = 50g, 1 fatia de queijo = 30g, 1 scoop de whey = 30g). Em faixas ("200-350g") use a média. Se não houver quantidade, use null.
- Água, chá, café e cápsulas/suplementos NÃO são gramas de alimento: mantenha o texto e a unidade corretos (ml para líquidos, "cápsula"/"comprimido" no nome).
- O cálculo de macros será feito depois pela tabela TACO do banco.`
        : importType === "anamnese"
        ? ANAMNESE_SCHEMA
        : (importType === "7dobras" || importType === "avaliacao")
        ? `${sevenFoldVisualPrompt}

Campos que devem ser estimados e exibidos na seção "Dados das 7 dobras por IA":
1. peitoral — rótulos possíveis: Peitoral, Dobra Peitoral, Chest, Pectoral
2. axilar_media — rótulos possíveis: Axilar Média, Axilar Medial, Axilar Media, Midaxillary
3. triceps — rótulos possíveis: Tríceps, Triceps, Tricipital
4. subescapular — rótulos possíveis: Subescapular, Subescapularis
5. abdominal — rótulos possíveis: Abdominal, Abdômen, Abdomen
6. suprailiaca — rótulos possíveis: Suprailíaca, Supra-ilíaca, Supra Iliaca, Suprailiac
7. coxa — rótulos possíveis: Coxa, Coxa medial, Thigh

Retorne sempre JSON puro neste formato, usando números em milímetros. Não retorne idade, peso, altura ou sexo:
{
  "dobras": {
    "peitoral": number | null,
    "axilar_media": number | null,
    "triceps": number | null,
    "subescapular": number | null,
    "abdominal": number | null,
    "suprailiaca": number | null,
    "coxa": number | null
  },
  "soma_7_dobras": number | null,
  "bf_pct_estimado": number | null,
  "aviso_estimativa": "${AI_VISUAL_ESTIMATE_WARNING}",
  "fonte_url": "${JACKSON_POLLOCK_SOURCE_URL}",
  "prompt_utilizado": ${JSON.stringify(sevenFoldVisualPrompt)},
  "campos_encontrados": ["nomes dos campos lidos na imagem"],
  "texto_lido": "descrição curta do que foi analisado"
}

Se for uma foto corporal sem tabela, faça uma estimativa visual das 7 dobras em mm. Se a imagem tiver uma tabela com linhas e colunas, leia linha por linha. Se a ordem aparecer sem rótulos claros, use a ordem padrão Jackson & Pollock 7 dobras: peitoral, axilar_media, triceps, subescapular, abdominal, suprailiaca, coxa. Não extraia perímetros como cintura/quadril/braço para dentro das dobras.`
        : "";

    const userContent: any[] = [
      {
        type: "text",
        text: `Extraia os dados estruturados do arquivo para o tipo: ${importType}.\n\n${schemaForType}`,
      },
    ];

    if (isImage) {
      if (importType === "7dobras" || importType === "avaliacao") {
        userContent.push({
          type: "text",
          text: `A imagem enviada será usada para estimativa visual das 7 dobras cutâneas. Use este prompt principal:
${sevenFoldVisualPrompt}

Os campos que precisam voltar dentro de "dobras" são exatamente:
- peitoral = campo visual "PEITORAL"
- axilar_media = campo visual "AXILAR MÉDIA"
- triceps = campo visual "TRÍCEPS"
- subescapular = campo visual "SUBESCAPULAR"
- abdominal = campo visual "ABDOMINAL"
- suprailiaca = campo visual "SUPRAILÍACA"
- coxa = campo visual "COXA"

Reconheça também abreviações comuns em fichas: PT/PEIT, AX/AM, TRI/TRIC, SUB/SUBESC, ABD, SUPRA/SI e CX/COXA. Se houver uma tabela com esses nomes e uma coluna de valor em mm, associe linha por linha. Se for foto corporal sem tabela, estime visualmente. Não retorne idade, peso, altura, sexo ou perímetros.`,
        });
      }
      userContent.push({ type: "image_url", image_url: { url: `data:${imageMimeType};base64,${file}` } });
    } else if (isPDF) {
      userContent.push({ type: "text", text: `Conteúdo do PDF:\n\n${pdfText.slice(0, 60000)}` });
    } else {
      // texto/markdown/etc — assume base64 de texto
      let txt = "";
      try { txt = new TextDecoder().decode(base64ToBytes(file)); } catch { txt = file; }
      userContent.push({ type: "text", text: `Conteúdo do arquivo:\n\n${txt.slice(0, 60000)}` });
    }

    const extraInstr = (importType === "7dobras" || importType === "avaliacao")
      ? `\n\nINSTRUÇÕES IMPORTANTES PARA AVALIAÇÃO FÍSICA / 7 DOBRAS:
- Use o prompt principal de estimativa visual quando a imagem não tiver uma ficha/tabela legível: ${sevenFoldVisualPrompt}
- Os únicos campos corporais a retornar são: peitoral, axilar_media, triceps, subescapular, abdominal, suprailiaca e coxa.
- Procure variações em PT-BR com ou sem acento: "Peitoral", "Tríceps/Triceps/Tricipital", "Subescapular", "Axilar Média/Axilar Medial/Axilar media", "Suprailíaca/Supra-ilíaca/Supra iliaca/Suprailiaca", "Abdominal/Abdômen (dobra)", "Coxa/Coxa medial".
- Valores de DOBRAS são em milímetros (mm), normalmente entre 3 e 60.
- SEMPRE preencha TODAS as 7 dobras do protocolo Jackson & Pollock se aparecerem no relatório: peitoral, axilar_media, triceps, subescapular, abdominal, suprailiaca, coxa.
- Coloque os valores numéricos dentro de "dobras" (snake_case), conforme o schema. Se for estimativa visual, estimar valores é esperado; deixe o aviso claro.
- Se a tabela mostrar os nomes das dobras em uma coluna e os valores em outra coluna, associe cada linha ao seu valor.
- Retorne soma_7_dobras, bf_pct_estimado quando possível, aviso_estimativa, fonte_url e prompt_utilizado.
- Não retorne idade, peso, altura ou sexo. Perímetros são em centímetros (cm) e não devem virar dobras.`
      : "";

    const messages = [
      {
        role: "system",
          content: `Você é um avaliador físico experiente. Extraia dados estruturados a partir do documento ou faça estimativa visual quando solicitado. Retorne APENAS um JSON válido conforme a estrutura solicitada. Se um campo não estiver presente, omita-o.${extraInstr}`,
      },
      { role: "user", content: userContent },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Lovable-API-Key": LOVABLE_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: (importType === "7dobras" || importType === "avaliacao") ? "openai/gpt-5.5" : "google/gemini-2.5-flash",
        messages,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições à IA. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Erro na IA: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData?.choices?.[0]?.message?.content || "{}";
    let result: any = parseJsonContent(content);

    // Dieta: se a IA devolveu refeições sem descrição, tenta de novo cobrando o conteúdo completo.
    if (importType === "dieta") {
      const refs = Array.isArray(result?.refeicoes) ? result.refeicoes : [];
      const semDescricao = refs.length > 0 && refs.every((r: any) => !String(r?.descricao || "").trim() && !(Array.isArray(r?.itens) && r.itens.length));
      if (refs.length === 0 || semDescricao) {
        const retry = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Lovable-API-Key": LOVABLE_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-pro",
            messages: [
              {
                role: "system",
                content: `Você transcreve planos alimentares em JSON. Retorne APENAS JSON válido. É PROIBIDO devolver refeições com "descricao" vazia: cada refeição precisa listar todos os alimentos com medidas caseiras e substituições, uma linha por alimento. Também extraia kcal_alvo, tmb e observações se estiverem escritos no documento.`,
              },
              { role: "user", content: userContent },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (retry.ok) {
          const retryData = await retry.json();
          const retryResult = parseJsonContent(retryData?.choices?.[0]?.message?.content || "{}");
          const retryRefs = Array.isArray(retryResult?.refeicoes) ? retryResult.refeicoes : [];
          if (retryRefs.some((r: any) => String(r?.descricao || "").trim())) result = retryResult;
        } else {
          console.error("[import-with-ai] dieta retry error", retry.status, await retry.text().catch(() => ""));
        }
      }
      // Fallback final: monta descricao a partir dos itens quando a IA só devolveu itens.
      if (Array.isArray(result?.refeicoes)) {
        result.refeicoes = result.refeicoes.map((r: any) => {
          if (String(r?.descricao || "").trim()) return r;
          const itens = Array.isArray(r?.itens) ? r.itens : [];
          const linhas = itens
            .map((it: any) => (it?.quantidade_g ? `${it?.nome || ""} — ${it.quantidade_g} g` : String(it?.nome || "")))
            .filter((l: string) => l.trim());
          return { ...r, descricao: linhas.join("\n") };
        });
      }
    }

    if ((importType === "7dobras" || importType === "avaliacao") && isImage && !hasSevenFoldValues(result)) {
      const fallbackMessages = [
        {
          role: "system",
          content: `Você é um avaliador físico experiente. Retorne APENAS JSON válido. Não explique nada. Sua tarefa é estimar visualmente DOBRAS CUTÂNEAS em mm e mapear para os campos exatos do AlphaCoach Pro.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${sevenFoldVisualPrompt}

Os campos que precisam ser estimados são exatamente:
- peitoral: rótulos Peitoral, Dobra Peitoral, PT, PEIT, Chest, Pectoral
- axilar_media: rótulos Axilar Média, Axilar Media, Axilar Medial, AX, AM, Midaxillary
- triceps: rótulos Tríceps, Triceps, Tricipital, TRI, TRIC
- subescapular: rótulos Subescapular, Sub Escapular, SUB, SUBESC
- abdominal: rótulos Abdominal, Abdômen, Abdomen, ABD
- suprailiaca: rótulos Suprailíaca, Supra-ilíaca, Supra Iliaca, SI, SUPRA
- coxa: rótulos Coxa, Coxa medial, CX, Thigh

Leia tabelas linha por linha. Se os nomes estiverem abreviados, use o mapeamento acima. Se aparecerem 7 valores de dobras sem rótulo claro, use a ordem Jackson & Pollock: peitoral, axilar_media, triceps, subescapular, abdominal, suprailiaca, coxa.

Não use idade, peso, altura, cintura, quadril, braço ou perímetros como dobras. Não retorne idade, peso, altura ou sexo.

Retorne este JSON exato:
{"dobras":{"peitoral":null,"axilar_media":null,"triceps":null,"subescapular":null,"abdominal":null,"suprailiaca":null,"coxa":null},"soma_7_dobras":null,"bf_pct_estimado":null,"aviso_estimativa":"${AI_VISUAL_ESTIMATE_WARNING}","fonte_url":"${JACKSON_POLLOCK_SOURCE_URL}","prompt_utilizado":${JSON.stringify(sevenFoldVisualPrompt)},"campos_encontrados":[],"texto_lido":""}`,
            },
            { type: "image_url", image_url: { url: `data:${imageMimeType};base64,${file}` } },
          ],
        },
      ];

      const fallbackResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Lovable-API-Key": LOVABLE_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai/gpt-5.5",
          messages: fallbackMessages,
          response_format: { type: "json_object" },
        }),
      });

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        const fallbackContent = fallbackData?.choices?.[0]?.message?.content || "{}";
        const fallbackResult = parseJsonContent(fallbackContent);
        result = mergeSevenFoldResult(result, fallbackResult);
        console.log("[import-with-ai] 7dobras fallback", JSON.stringify({
          usedFallback: true,
          hasDobras: hasSevenFoldValues(result),
          campos: result?.campos_encontrados || null,
          dobras: result?.dobras || null,
        }));
      } else {
        console.error("[import-with-ai] 7dobras fallback error", fallbackResponse.status, await fallbackResponse.text().catch(() => ""));
      }
    }

    if ((importType === "7dobras" || importType === "avaliacao") && isImage && !hasSevenFoldValues(result)) {
      const geminiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Lovable-API-Key": LOVABLE_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3.5-flash",
          messages: [
            {
              role: "system",
              content: "Você é um avaliador físico experiente para estimativas visuais de avaliação física. Responda somente JSON válido, sem markdown.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `${sevenFoldVisualPrompt}

Leia esta imagem e estime ou transcreva as 7 dobras cutâneas. Extraia somente estes campos em milímetros: peitoral, axilar_media, triceps, subescapular, abdominal, suprailiaca, coxa.

Mapeamento visual obrigatório:
PEITORAL -> dobras.peitoral
AXILAR MÉDIA / AXILAR MEDIA / AXILAR MEDIAL -> dobras.axilar_media
TRÍCEPS / TRICEPS -> dobras.triceps
SUBESCAPULAR / SUB ESCAPULAR -> dobras.subescapular
ABDOMINAL / ABDÔMEN -> dobras.abdominal
SUPRAILÍACA / SUPRA ILIACA / SUPRA-ILÍACA -> dobras.suprailiaca
COXA / COXA MEDIAL -> dobras.coxa

Se vir apenas 7 valores de dobras na ficha, use esta ordem: Peitoral, Axilar Média, Tríceps, Subescapular, Abdominal, Suprailíaca, Coxa.

Retorne exatamente:
{"dobras":{"peitoral":null,"axilar_media":null,"triceps":null,"subescapular":null,"abdominal":null,"suprailiaca":null,"coxa":null},"soma_7_dobras":null,"bf_pct_estimado":null,"aviso_estimativa":"${AI_VISUAL_ESTIMATE_WARNING}","fonte_url":"${JACKSON_POLLOCK_SOURCE_URL}","prompt_utilizado":${JSON.stringify(sevenFoldVisualPrompt)},"campos_encontrados":[],"texto_lido":""}`,
                },
                { type: "image_url", image_url: { url: `data:${imageMimeType};base64,${file}` } },
              ],
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        const geminiContent = geminiData?.choices?.[0]?.message?.content || "{}";
        const geminiResult = parseJsonContent(geminiContent);
        result = mergeSevenFoldResult(result, geminiResult);
        console.log("[import-with-ai] 7dobras gemini fallback", JSON.stringify({
          usedGeminiFallback: true,
          hasDobras: hasSevenFoldValues(result),
          campos: result?.campos_encontrados || null,
          dobras: result?.dobras || null,
        }));
      } else {
        console.error("[import-with-ai] 7dobras gemini fallback error", geminiResponse.status, await geminiResponse.text().catch(() => ""));
      }
    }

    if (importType === "7dobras" || importType === "avaliacao") {
      result = mergeSevenFoldResult(result);
      console.log("[import-with-ai] 7dobras extracted keys", JSON.stringify({
        hasDobras: !!result?.dobras,
        campos: result?.campos_encontrados || null,
        dobras: result?.dobras || null,
      }));
    }

    if (!dryRun && importType === "treino" && result?.dias) {
      await supabase.from("treinos_prescritos").delete().eq("aluno_id", alunoId).eq("tenant_id", tenantId);
      const rows: any[] = [];
      result.dias.forEach((dia: any) => {
        (dia.exercicios || []).forEach((ex: any, idx: number) => {
          rows.push({
            tenant_id: tenantId, aluno_id: alunoId, dia_semana: dia.dia, ordem: idx,
            exercicio: ex.nome, series: ex.series, repeticoes: ex.repeticoes,
            cadencia: ex.cadencia, detalhes_execucao: ex.detalhes_execucao, observacao: ex.observacao,
          });
        });
      });
      if (rows.length > 0) {
        const { error } = await supabase.from("treinos_prescritos").insert(rows);
        if (error) throw error;
      }
    } else if (!dryRun && importType === "dieta" && result?.refeicoes) {
      await supabase.from("dietas").delete().eq("user_id", alunoId);
      const { data: dieta, error: dError } = await supabase
        .from("dietas")
        .insert({
          user_id: alunoId,
          objetivo: result.objetivo,
          kcal_alvo: Number.isFinite(Number(result.kcal_alvo)) ? Number(result.kcal_alvo) : null,
          tmb_estimada: Number.isFinite(Number(result.tmb)) ? Number(result.tmb) : null,
          macros_alvo: result.macros_alvo,
          observacoes_clinicas: [result.observacoes, result.agua_litros_dia ? `Água: ${result.agua_litros_dia}` : "", result.gasto_calorico_treino ? `Gasto calórico treino: ${result.gasto_calorico_treino}` : ""].filter(Boolean).join("\n") || null,
          is_published: true,
        })
        .select().single();
      if (dError) throw dError;

      const parseHorario = (raw: unknown): string | null => {
        if (raw == null) return null;
        const s = String(raw).trim();
        if (!s) return null;
        const m = s.match(/(\d{1,2})\s*[:hH]\s*(\d{2})?/);
        if (!m) return null;
        const h = Number(m[1]);
        const min = Number(m[2] ?? "0");
        if (!Number.isFinite(h) || h > 23 || !Number.isFinite(min) || min > 59) return null;
        return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;
      };


      // Vincula cada item a um alimento da tabela TACO para o app conseguir contar os macros.
      const { data: tacoAll } = await supabase
        .from("alimentos_taco")
        .select("id, nome, energia_kcal, proteina_g, carboidrato_g, lipideos_g")
        .limit(5000);
      const norm = (s: string) =>
        s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
      const stop = new Set(["de","da","do","com","sem","em","e","ou","a","o","cru","cozido","grelhado","integral","light","zero","natural"]);
      const tacoList = (tacoAll ?? []).map((t: any) => ({ id: t.id, tokens: norm(t.nome).split(" ").filter((w: string) => w && !stop.has(w)) }));
      const tacoById = new Map<string, any>((tacoAll ?? []).map((t: any) => [t.id, t]));

      // Itens sem valor nutricional (água, café, chá, cápsulas) não devem virar alimento da TACO.
      const semMacro = /(agua|cha\b|cafe|capsula|comprimido|lipodrene|termogenico|creatina|bcaa|glutamina|multivitaminico|omega|vitamina|colageno|adocante)/;
      const matchAlimento = (nome: string): string | null => {
        // usa só o primeiro alimento escrito da linha (antes de travessão, "OU", parênteses)
        const principal = String(nome || "").split(/—|–|-{1,2}|\bOU\b|\bou\b|\(|,|;|\//)[0];
        const raw = norm(principal);
        if (!raw || semMacro.test(raw)) return null;
        const tokens = raw.split(" ").filter((w) => w && !stop.has(w) && !/^\d+$/.test(w) && w.length > 2);
        if (!tokens.length || !tacoList.length) return null;
        let best: { id: string; score: number } | null = null;
        for (const t of tacoList) {
          if (!t.tokens.length) continue;
          const hits = tokens.filter((w) => t.tokens.some((tw: string) => tw === w || tw.startsWith(w) || w.startsWith(tw))).length;
          if (!hits) continue;
          // exige que a maior parte do nome escrito esteja no alimento da TACO (evita casar "água" com "Atum em água")
          const cobertura = hits / tokens.length;
          if (cobertura < 0.6) continue;
          const score = hits / Math.max(tokens.length, t.tokens.length);
          if (!best || score > best.score) best = { id: t.id, score };
        }
        return best && best.score >= 0.5 ? best.id : null;
      };


      // Remove refeições duplicadas retornadas pela IA (mesmo nome/horário/itens)
      // e também blocos com conteúdo idêntico em horários diferentes (repetição indevida).
      const conteudoRef = (r: any) =>
        [norm(String(r?.descricao || "")),
         (r?.itens || []).map((i: any) => norm(`${i?.nome || ""}${i?.quantidade_g ?? ""}`)).sort().join("|")].join("::");
      const chaveRef = (r: any) =>
        [norm(String(r?.nome || "")), String(r?.horario || "").trim(), conteudoRef(r)].join("::");
      const vistas = new Set<string>();
      const conteudos = new Set<string>();
      const refeicoesUnicas = (result.refeicoes as any[]).filter((r) => {
        const k = chaveRef(r);
        const c = conteudoRef(r);
        if (vistas.has(k)) return false;
        if (c.replace(/[:|]/g, "").trim() && conteudos.has(c)) return false;
        vistas.add(k);
        conteudos.add(c);
        return true;
      });

      for (const [idx, ref] of refeicoesUnicas.entries()) {
        const { data: refeicao, error: rError } = await supabase
          .from("refeicoes")
          .insert({ dieta_id: dieta.id, nome: ref.nome, horario: parseHorario(ref.horario), ordem: idx, descricao_ia: String(ref.descricao || "").trim() || null })
          .select().single();

        if (rError) throw rError;

        if (ref.itens && ref.itens.length > 0) {
          const itemRows = ref.itens.map((item: any) => {
            const qtd = Number(item.quantidade_g);
            const quantidade_g = Number.isFinite(qtd) && qtd > 0 ? qtd : 0;
            const alimento_id = matchAlimento(item.nome);
            return {
              refeicao_id: refeicao.id,
              substituicoes: item.nome,
              quantidade_g,
              alimento_id,
            };
          });
          const { error: iError } = await supabase.from("itens_refeicao").insert(itemRows);
          if (iError) throw iError;
        }
      }

      // Metas: SOMENTE o que está escrito no documento. Nada é calculado nem estimado.
      const escrito = result.macros_alvo || {};
      const num = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.round(Number(v)) : null);
      const macrosFinais = {
        proteina_g: num(escrito.proteina_g),
        carboidrato_g: num(escrito.carboidrato_g),
        lipideos_g: num(escrito.lipideos_g),
      };
      const kcalFinal = num(result.kcal_alvo);

      await supabase
        .from("dietas")
        .update({ macros_alvo: macrosFinais, kcal_alvo: kcalFinal })
        .eq("id", dieta.id);


    }

    return new Response(JSON.stringify({ success: true, data: result, extractedData: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
