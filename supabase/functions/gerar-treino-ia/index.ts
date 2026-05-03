// Edge function: gera treino prescrito via Lovable AI
// Especializada na Metodologia Fabrício Pacholok
// Recebe: { perfil, biblioteca, divisoes }
// Retorna: { dias: [{ dia: "Treino A", exercicios: [{nome, series, repeticoes, cadencia, detalhes_execucao, observacao}] }], cardio: string }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { perfil, biblioteca, divisoes, tenant_id, prompt: customPrompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const lesoes = (perfil?.lesoes || []).join(", ") || "nenhuma";
    const limitacoes = (perfil?.limitacoes || []).join(", ") || "nenhuma";

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // === RAG: Busca conhecimento semântico da Base de Verdade Absolute (Pacho) ===
    let knowledgeContext = "";
    try {
      const queryText = `Treino para ${perfil?.sexo || ""} ${perfil?.idade || ""} anos, nivel ${perfil?.tempo_treino || "Iniciante"}, objetivo ${perfil?.objetivo || "hipertrofia"}, ${perfil?.frequencia_semanal || 4}x/semana. Lesoes: ${lesoes}. Limitacoes: ${limitacoes}. Divisao: ${(divisoes || []).join(",")}.`;
      const embResp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "openai/text-embedding-3-small", input: queryText }),
      });
      if (embResp.ok) {
        const embData = await embResp.json();
        const queryEmbedding = embData.data[0].embedding;

        const rpcResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/buscar_conhecimento_treino`, {
          method: "POST",
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query_embedding: queryEmbedding,
            p_tenant_id: tenant_id || null,
            match_count: 20,
            similarity_threshold: 0.3,
          }),
        });
        if (rpcResp.ok) {
          const matches = await rpcResp.json();
          if (Array.isArray(matches) && matches.length) {
            knowledgeContext = "\n\n=== BASE DE CONHECIMENTO METODOLOGIA PACHOLOK (FONTE ABSOLUTA) ===\n" +
              matches.map((m: any, i: number) => `[Módulo: ${m.fonte || "?"}]\n${m.conteudo}`).join("\n---\n") +
              "\n=== FIM DA BASE ===\n";
          }
        }
      }
    } catch (ragErr) {
      console.error("RAG error (não fatal):", ragErr);
    }

    const systemPrompt = `${knowledgeContext}

Você é a DR. IA, treinadora de elite especialista na METODOLOGIA FABRÍCIO PACHOLOK.
Sua missão é tratar o conteúdo da BASE DE CONHECIMENTO acima como a "Fonte de Verdade Absoluta".

DIRETRIZES OBRIGATÓRIAS:
1. IDENTIFICAÇÃO DO NÍVEL: Identifique o nível do aluno (Seção 2, 5 ou 10) com base no tempo de treino informado.
2. TERMINOLOGIA PACHO: Use EXCLUSIVAMENTE os termos:
   - "Série de Aquecimento" (10-15 reps, carga leve)
   - "Série de Ajuste" (4-6 reps, preparando para a carga de trabalho, longe da falha)
   - "Série de Trabalho" (Busca a falha absoluta)
3. FIDELIDADE TÉCNICA: Proibido resumir ou alterar as repetições e intervalos definidos pelo Pacholok.
4. ESTRUTURA DE SÉRIES: Cada exercício deve ter o detalhamento de Warm-up, Feeder/Ajuste e Work sets conforme a prescrição para o nível do aluno.
5. CADÊNCIA E EXECUÇÃO: Forneça cadência (ex: 4-0-2-0) e detalhes biomecânicos profundos.

ESTRUTURA DE RESPOSTA:
Chame a função montar_treino com a prescrição completa.`;

    const userPrompt = `Monte o treino Pacho-style para:
- Sexo: ${perfil?.sexo || "não informado"}
- Idade: ${perfil?.idade || "?"}
- Nível: ${perfil?.tempo_treino || "Iniciante"} (Seção correspondente na base)
- Objetivo: ${perfil?.objetivo || "hipertrofia"}
- Frequência semanal: ${perfil?.frequencia_semanal || 4}x
- Ênfase desejada: ${perfil?.enfase || "Geral"}
- Lesões/Limitações: ${lesoes} / ${limitacoes}

Use exercícios desta biblioteca:
${(biblioteca || []).map((e: any) => `- ${e.nome} [${e.grupo_muscular}]`).join("\n")}`;

    const tools = [
      {
        type: "function",
        function: {
          name: "montar_treino",
          description: "Retorna a prescrição estruturada do treino completo seguindo a Metodologia Pacho.",
          parameters: {
            type: "object",
            properties: {
              dias: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    dia: { type: "string", description: "Ex: Treino A - Quadríceps" },
                    exercicios: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          nome: { type: "string" },
                          series: { type: "string", description: "Ex: 2 Séries de Aquecimento + 1 Série de Ajuste + 3 Séries de Trabalho" },
                          repeticoes: { type: "string", description: "Ex: 8-12 + Drop-set final" },
                          cadencia: { type: "string", description: "Ex: 4-0-2-0" },
                          detalhes_execucao: { type: "string" },
                          observacao: { type: "string" },
                        },
                        required: ["nome", "series", "repeticoes", "cadencia", "detalhes_execucao", "observacao"],
                      },
                    },
                  },
                  required: ["dia", "exercicios"],
                },
              },
              cardio: { type: "string" },
            },
            required: ["dias", "cardio"],
          },
        },
      },
    ];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "montar_treino" } },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      throw new Error("IA falhou");
    }

    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : null;
    
    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gerar-treino-ia error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});