import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { file, fileType, importType, alunoId, tenantId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase credentials not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const isImage = fileType.startsWith("image/");
    const messages = [
      {
        role: "system",
        content: `Você é um especialista em fitness e nutrição. Sua tarefa é extrair dados estruturados de ${importType === "treino" ? "treinos" : "dietas"} a partir de documentos ou imagens. 
        Retorne APENAS um JSON válido. Se não conseguir extrair, retorne um erro amigável em JSON.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extraia o ${importType} deste arquivo. 
            ${importType === "treino" ? 
              `Estrutura esperada: { "dias": [ { "dia": "string", "exercicios": [ { "nome": "string", "series": "string", "repeticoes": "string", "cadencia": "string", "detalhes_execucao": "string", "observacao": "string" } ] } ], "cardio": "string" }` : 
              `Estrutura esperada: { "objetivo": "string", "kcal_alvo": number, "macros_alvo": { "proteina_g": number, "carboidrato_g": number, "lipideos_g": number }, "refeicoes": [ { "nome": "string", "horario": "string", "itens": [ { "nome": "string", "quantidade_g": number } ] } ] }`
            }`,
          },
          isImage ? {
            type: "image_url",
            image_url: { url: `data:${fileType};base64,${file}` },
          } : {
            type: "text",
            text: `Conteúdo do arquivo (Base64): ${file.substring(0, 10000)}... [truncado se necessário]`,
          },
        ],
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Error:", errorText);
      throw new Error(`Erro na IA: ${response.status}`);
    }

    const aiData = await response.json();
    const result = JSON.parse(aiData.choices[0].message.content);

    // Persist data
    if (importType === "treino") {
      // Clear existing workouts for this student
      await supabase.from("treinos_prescritos").delete().eq("aluno_id", alunoId).eq("tenant_id", tenantId);
      
      const rows = [];
      result.dias.forEach((dia: any) => {
        dia.exercicios.forEach((ex: any, idx: number) => {
          rows.push({
            tenant_id: tenantId,
            aluno_id: alunoId,
            dia_semana: dia.dia,
            ordem: idx,
            exercicio: ex.nome,
            series: ex.series,
            repeticoes: ex.repeticoes,
            cadencia: ex.cadencia,
            detalhes_execucao: ex.detalhes_execucao,
            observacao: ex.observacao,
          });
        });
      });
      
      if (rows.length > 0) {
        const { error } = await supabase.from("treinos_prescritos").insert(rows);
        if (error) throw error;
      }
    } else {
      // Import Dieta
      // Clear existing diets for this user
      await supabase.from("dietas").delete().eq("user_id", alunoId);

      const { data: dieta, error: dError } = await supabase
        .from("dietas")
        .insert({
          user_id: alunoId,
          objetivo: result.objetivo,
          kcal_alvo: result.kcal_alvo,
          macros_alvo: result.macros_alvo,
        })
        .select()
        .single();
      
      if (dError) throw dError;

      for (const [idx, ref] of result.refeicoes.entries()) {
        const { data: refeicao, error: rError } = await supabase
          .from("refeicoes")
          .insert({
            dieta_id: dieta.id,
            nome: ref.nome,
            horario: ref.horario || null,
            ordem: idx,
          })
          .select()
          .single();
        
        if (rError) throw rError;

        if (ref.itens && ref.itens.length > 0) {
          const itemRows = ref.itens.map((item: any) => ({
            refeicao_id: refeicao.id,
            substituicoes: item.nome, // Store name in substitutions for now as it's the only text field
            quantidade_g: item.quantidade_g,
          }));
          const { error: iError } = await supabase.from("itens_refeicao").insert(itemRows);
          if (iError) throw iError;
        }
      }
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
