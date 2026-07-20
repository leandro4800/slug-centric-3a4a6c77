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

const hasSevenFoldValues = (result: any) => {
  const dobras = result?.dobras || result?.skinfolds || result?.seven_folds || {};
  const keys = ["peitoral", "axilar_media", "triceps", "subescapular", "abdominal", "suprailiaca", "coxa"];
  return keys.some((key) => {
    const value = dobras?.[key] ?? dobras?.[key.replace("_", "")] ?? result?.[key] ?? result?.[key.replace("_", "")];
    if (value === null || value === undefined || value === "") return false;
    const n = Number(String(value).replace(",", ".").match(/\d{1,3}(?:\.\d+)?/)?.[0]);
    return Number.isFinite(n) && n >= 2 && n <= 80;
  });
};

const mergeSevenFoldResult = (primary: any, fallback: any) => {
  const keys = ["peitoral", "axilar_media", "triceps", "subescapular", "abdominal", "suprailiaca", "coxa"];
  const merged = {
    ...(primary || {}),
    peso: primary?.peso ?? fallback?.peso ?? null,
    altura: primary?.altura ?? fallback?.altura ?? null,
    idade: primary?.idade ?? fallback?.idade ?? null,
    sexo: primary?.sexo ?? fallback?.sexo ?? null,
    dobras: { ...(primary?.dobras || {}) },
    campos_encontrados: primary?.campos_encontrados?.length ? primary.campos_encontrados : (fallback?.campos_encontrados || []),
    texto_lido: primary?.texto_lido || fallback?.texto_lido || "",
  };
  for (const key of keys) merged.dobras[key] = merged.dobras[key] ?? fallback?.dobras?.[key] ?? fallback?.[key] ?? null;
  return merged;
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

    const schemaForType =
      importType === "treino"
        ? `Estrutura esperada: { "dias": [ { "dia": "string", "exercicios": [ { "nome": "string", "series": "string", "repeticoes": "string", "cadencia": "string", "detalhes_execucao": "string", "observacao": "string" } ] } ], "cardio": "string" }`
        : importType === "dieta"
        ? `Estrutura esperada: { "objetivo": "string", "kcal_alvo": number, "macros_alvo": { "proteina_g": number, "carboidrato_g": number, "lipideos_g": number }, "refeicoes": [ { "nome": "string", "horario": "string", "itens": [ { "nome": "string", "quantidade_g": number } ] } ] }`
        : importType === "anamnese"
        ? ANAMNESE_SCHEMA
        : (importType === "7dobras" || importType === "avaliacao")
        ? `Leia a imagem/arquivo como uma ficha de avaliação física e extraia EXATAMENTE estes campos do app AlphaCoach Pro.

Campos que existem na tela e devem ser preenchidos:
1. peitoral — rótulos possíveis: Peitoral, Dobra Peitoral, Chest, Pectoral
2. axilar_media — rótulos possíveis: Axilar Média, Axilar Medial, Axilar Media, Midaxillary
3. triceps — rótulos possíveis: Tríceps, Triceps, Tricipital
4. subescapular — rótulos possíveis: Subescapular, Subescapularis
5. abdominal — rótulos possíveis: Abdominal, Abdômen, Abdomen
6. suprailiaca — rótulos possíveis: Suprailíaca, Supra-ilíaca, Supra Iliaca, Suprailiac
7. coxa — rótulos possíveis: Coxa, Coxa medial, Thigh

Retorne sempre JSON puro neste formato, usando números em milímetros:
{
  "peso": number | null,
  "altura": number | null,
  "idade": number | null,
  "sexo": "M" | "F" | null,
  "dobras": {
    "peitoral": number | null,
    "axilar_media": number | null,
    "triceps": number | null,
    "subescapular": number | null,
    "abdominal": number | null,
    "suprailiaca": number | null,
    "coxa": number | null
  },
  "campos_encontrados": ["nomes dos campos lidos na imagem"],
  "texto_lido": "transcrição curta dos trechos onde aparecem as dobras"
}

Se a imagem tiver uma tabela com linhas e colunas, leia linha por linha. Se a ordem aparecer sem rótulos claros, use a ordem padrão Jackson & Pollock 7 dobras: peitoral, axilar_media, triceps, subescapular, abdominal, suprailiaca, coxa. Não extraia perímetros como cintura/quadril/braço para dentro das dobras.`
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
          text: `A imagem enviada é uma ficha/foto de avaliação física. Leia a imagem por OCR e foque apenas nos campos de DOBRAS CUTÂNEAS em mm.

Os campos da tela do app são exatamente estes e precisam voltar dentro de "dobras":
- peitoral = campo visual "PEITORAL"
- axilar_media = campo visual "AXILAR MÉDIA"
- triceps = campo visual "TRÍCEPS"
- subescapular = campo visual "SUBESCAPULAR"
- abdominal = campo visual "ABDOMINAL"
- suprailiaca = campo visual "SUPRAILÍACA"
- coxa = campo visual "COXA"

Reconheça também abreviações comuns em fichas: PT/PEIT, AX/AM, TRI/TRIC, SUB/SUBESC, ABD, SUPRA/SI e CX/COXA. Se houver uma tabela com esses nomes e uma coluna de valor em mm, associe linha por linha. Se houver 7 números de dobras sem rótulo claro, use a ordem Jackson & Pollock: peitoral, axilar_media, triceps, subescapular, abdominal, suprailiaca, coxa. Não use idade, peso, altura ou perímetros como dobras.`,
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
- Os campos da tela são: peitoral, axilar_media, triceps, subescapular, abdominal, suprailiaca e coxa.
- Procure variações em PT-BR com ou sem acento: "Peitoral", "Tríceps/Triceps/Tricipital", "Subescapular", "Axilar Média/Axilar Medial/Axilar media", "Suprailíaca/Supra-ilíaca/Supra iliaca/Suprailiaca", "Abdominal/Abdômen (dobra)", "Coxa/Coxa medial".
- Valores de DOBRAS são em milímetros (mm), normalmente entre 3 e 60.
- SEMPRE preencha TODAS as 7 dobras do protocolo Jackson & Pollock se aparecerem no relatório: peitoral, axilar_media, triceps, subescapular, abdominal, suprailiaca, coxa.
- Coloque os valores numéricos dentro de "dobras" (snake_case), conforme o schema. Se não encontrar um campo, use null. NÃO invente valores.
- Se a tabela mostrar os nomes das dobras em uma coluna e os valores em outra coluna, associe cada linha ao seu valor.
- Perímetros são em centímetros (cm). Peso em kg, altura em cm.`
      : "";

    const messages = [
      {
        role: "system",
        content: `Você é um especialista em fitness e nutrição. Extraia dados estruturados a partir do documento. Retorne APENAS um JSON válido conforme a estrutura solicitada. Se um campo não estiver presente, omita-o.${extraInstr}`,
      },
      { role: "user", content: userContent },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
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

    if ((importType === "7dobras" || importType === "avaliacao") && isImage && !hasSevenFoldValues(result)) {
      const fallbackMessages = [
        {
          role: "system",
          content: `Você é um OCR especializado em avaliações físicas. Retorne APENAS JSON válido. Não explique nada. Sua tarefa é localizar medidas de DOBRAS CUTÂNEAS em mm e mapear para os campos exatos do AlphaCoach Pro.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analise esta imagem com foco máximo em OCR. Os campos que precisam ser preenchidos são exatamente:
- peitoral: rótulos Peitoral, Dobra Peitoral, PT, PEIT, Chest, Pectoral
- axilar_media: rótulos Axilar Média, Axilar Media, Axilar Medial, AX, AM, Midaxillary
- triceps: rótulos Tríceps, Triceps, Tricipital, TRI, TRIC
- subescapular: rótulos Subescapular, Sub Escapular, SUB, SUBESC
- abdominal: rótulos Abdominal, Abdômen, Abdomen, ABD
- suprailiaca: rótulos Suprailíaca, Supra-ilíaca, Supra Iliaca, SI, SUPRA
- coxa: rótulos Coxa, Coxa medial, CX, Thigh

Leia tabelas linha por linha. Se os nomes estiverem abreviados, use o mapeamento acima. Se aparecerem 7 valores de dobras sem rótulo claro, use a ordem Jackson & Pollock: peitoral, axilar_media, triceps, subescapular, abdominal, suprailiaca, coxa.

Não use idade, peso, altura, cintura, quadril, braço, perímetros ou porcentual de gordura como dobras.

Retorne este JSON exato:
{"peso":null,"altura":null,"idade":null,"sexo":null,"dobras":{"peitoral":null,"axilar_media":null,"triceps":null,"subescapular":null,"abdominal":null,"suprailiaca":null,"coxa":null},"campos_encontrados":[],"texto_lido":""}`,
            },
            { type: "image_url", image_url: { url: `data:${imageMimeType};base64,${file}` } },
          ],
        },
      ];

      const fallbackResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
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

    if (importType === "7dobras" || importType === "avaliacao") {
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
        .insert({ user_id: alunoId, objetivo: result.objetivo, kcal_alvo: result.kcal_alvo, macros_alvo: result.macros_alvo })
        .select().single();
      if (dError) throw dError;

      for (const [idx, ref] of result.refeicoes.entries()) {
        const { data: refeicao, error: rError } = await supabase
          .from("refeicoes")
          .insert({ dieta_id: dieta.id, nome: ref.nome, horario: ref.horario || null, ordem: idx })
          .select().single();
        if (rError) throw rError;

        if (ref.itens && ref.itens.length > 0) {
          const itemRows = ref.itens.map((item: any) => ({
            refeicao_id: refeicao.id, substituicoes: item.nome, quantidade_g: item.quantidade_g,
          }));
          const { error: iError } = await supabase.from("itens_refeicao").insert(itemRows);
          if (iError) throw iError;
        }
      }
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
