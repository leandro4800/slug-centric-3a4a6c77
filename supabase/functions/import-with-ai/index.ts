import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const isImage = (fileType || "").startsWith("image/");
    const isPDF = fileType === "application/pdf";

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
        ? `Estrutura esperada (valores em mm para dobras e cm para perímetros/peso/altura): {
            "peso": number, "altura": number, "idade": number, "sexo": "M" | "F",
            "dobras": { "peitoral": number, "axilar_media": number, "triceps": number, "subescapular": number, "abdominal": number, "suprailiaca": number, "coxa": number, "panturrilha": number },
            "perimetros": { "pescoco": number, "ombro": number, "torax": number, "cintura": number, "abdomen": number, "quadril": number, "braco_relaxado_dir": number, "braco_relaxado_esq": number, "braco_contraido_dir": number, "braco_contraido_esq": number, "antebraco_dir": number, "antebraco_esq": number, "coxa_proximal_dir": number, "coxa_proximal_esq": number, "coxa_media_dir": number, "coxa_media_esq": number, "coxa_distal_dir": number, "coxa_distal_esq": number, "panturrilha_dir": number, "panturrilha_esq": number }
          }`
        : "";

    const userContent: any[] = [
      {
        type: "text",
        text: `Extraia os dados estruturados do arquivo para o tipo: ${importType}.\n\n${schemaForType}`,
      },
    ];

    if (isImage) {
      userContent.push({ type: "image_url", image_url: { url: `data:${fileType};base64,${file}` } });
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
- Procure variações em PT-BR com ou sem acento: "Peitoral", "Tríceps/Triceps", "Subescapular", "Axilar Média/Axilar Medial/Axilar média", "Suprailíaca/Supra-ilíaca/Suprailiaca", "Abdominal/Abdômen (dobra)", "Coxa", "Panturrilha".
- Valores de DOBRAS são em milímetros (mm), normalmente entre 3 e 60.
- SEMPRE preencha TODAS as 7 dobras do protocolo Jackson & Pollock se aparecerem no relatório: peitoral, axilar_media, triceps, subescapular, abdominal, suprailiaca, coxa (panturrilha é opcional/8ª).
- Coloque os valores numéricos dentro de "dobras" (snake_case), conforme o schema. NÃO invente valores; se não encontrar, omita.
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
        model: "google/gemini-2.5-flash",
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
    let result: any;
    try { result = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      result = m ? JSON.parse(m[0]) : {};
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
    } else if (importType === "dieta" && result?.refeicoes) {
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
