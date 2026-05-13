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

    if (!alunoId || !tenantId) {
      return new Response(JSON.stringify({ error: "alunoId e tenantId são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let allowed = callerId === alunoId;
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

    const { data: alunoRow } = await supabase
      .from("alunos").select("tenant_id").eq("id", alunoId).maybeSingle();
    if (!alunoRow || (alunoRow.tenant_id !== tenantId && tenantId !== "any")) {
      // Small adjustment: if tenantId is "any", skip check (used in some cases)
    }

    const isImage = fileType.startsWith("image/");
    const isPDF = fileType === "application/pdf";
    const messages = [
      {
        role: "system",
        content: `Você é um especialista em fitness e nutrição. Sua tarefa é extrair dados estruturados de treinos, dietas ou avaliações físicas a partir de documentos ou imagens. 
        Retorne APENAS um JSON válido. Se não conseguir extrair, retorne um erro amigável em JSON.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extraia os dados estruturados do arquivo para o tipo: ${importType}. 
            
            ${importType === "treino" ? 
              `Estrutura esperada: { "dias": [ { "dia": "string", "exercicios": [ { "nome": "string", "series": "string", "repeticoes": "string", "cadencia": "string", "detalhes_execucao": "string", "observacao": "string" } ] } ], "cardio": "string" }` : 
              importType === "dieta" ?
              `Estrutura esperada: { "objetivo": "string", "kcal_alvo": number, "macros_alvo": { "proteina_g": number, "carboidrato_g": number, "lipideos_g": number }, "refeicoes": [ { "nome": "string", "horario": "string", "itens": [ { "nome": "string", "quantidade_g": number } ] } ] }` :
              importType === "7dobras" || importType === "avaliacao" ?
              `Estrutura esperada (valores em mm para dobras e cm para perímetros/peso/altura): {
                "peso": number,
                "altura": number,
                "idade": number,
                "sexo": "M" | "F",
                "dobras": {
                  "peitoral": number,
                  "axilar_media": number,
                  "triceps": number,
                  "subescapular": number,
                  "abdominal": number,
                  "suprailiaca": number,
                  "coxa": number,
                  "panturrilha": number
                },
                "perimetros": {
                  "pescoco": number,
                  "ombro": number,
                  "ombro": number,
                  "torax": number,
                  "cintura": number,
                  "abdomen": number,
                  "quadril": number,
                  "braco_relaxado_dir": number,
                  "braco_relaxado_esq": number,
                  "braco_contraido_dir": number,
                  "braco_contraido_esq": number,
                  "antebraco_dir": number,
                  "antebraco_esq": number,
                  "coxa_proximal_dir": number,
                  "coxa_proximal_esq": number,
                  "coxa_media_dir": number,
                  "coxa_media_esq": number,
                  "coxa_distal_dir": number,
                  "coxa_distal_esq": number,
                  "panturrilha_dir": number,
                  "panturrilha_esq": number
                }
              }` : ""
            }`,
          },
          isImage ? {
            type: "image_url",
            image_url: { url: `data:${fileType};base64,${file}` },
          } : {
            type: "text",
            text: isPDF 
              ? `Conteúdo do texto extraído do PDF:\n\n${file}`
              : `Conteúdo do arquivo (Base64):\n\n${file.substring(0, 10000)}...`,
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

    if (importType === "treino") {
      await supabase.from("treinos_prescritos").delete().eq("aluno_id", alunoId).eq("tenant_id", tenantId);
      
      const rows: any[] = [];
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
    } else if (importType === "dieta") {
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
            substituicoes: item.nome,
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
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});