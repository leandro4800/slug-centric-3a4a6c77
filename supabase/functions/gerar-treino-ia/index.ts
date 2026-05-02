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
    const { perfil, biblioteca, divisoes, tenant_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const lesoes = (perfil?.lesoes || []).join(", ") || "nenhuma";
    const limitacoes = (perfil?.limitacoes || []).join(", ") || "nenhuma";

    // === RAG: Busca conhecimento relevante (global + tenant) ===
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

        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
            match_count: 18,
            similarity_threshold: 0.35,
          }),
        });
        if (rpcResp.ok) {
          const matches = await rpcResp.json();
          if (Array.isArray(matches) && matches.length) {
            knowledgeContext = "\n\n=== BASE DE CONHECIMENTO (use rigorosamente como referência) ===\n" +
              matches.map((m: any, i: number) => `[Fonte: ${m.fonte || "?"}]\n${m.conteudo}`).join("\n---\n") +
              "\n=== FIM DA BASE ===\n";
            console.log(`RAG: ${matches.length} chunks injetados`);
          }
        }
      }
    } catch (ragErr) {
      console.error("RAG error (não fatal):", ragErr);
    }

    
    const systemPrompt = `Você é um treinador de elite especialista na Metodologia Fabrício Pacholok. 
Sua missão é prescrever treinos com extrema precisão técnica, focando em:
1. FALHA MUSCULAR E PROGRESSÃO DE CARGA (Progressive Overload): Cada série deve ter um propósito claro (Warm-up, Feeder ou Work set).
2. BIOMECÂNICA AVANÇADA: Otimize a seleção de exercícios para máxima eficiência mecânica e segurança, respeitando as limitações do aluno.
3. TÉCNICAS DE INTENSIDADE: Use Rest-Pause, Drop-set, FST-7 e Cluster Sets estrategicamente.
   - Proibido para alunos de nível Iniciante ou Intermediário.
   - Obrigatório para Avançados e Atletas de Alto Nível.
4. DIVISÃO SETORIZADA: Para alunos avançados/atletas, separe grupos musculares grandes (ex: Treino focado em Quadríceps em um dia, Posterior de Coxa em outro; Costas com ênfase em largura vs. espessura).
5. DETALHAMENTO EXTREMO: Para cada exercício, você DEVE fornecer:
   - CADÊNCIA: Exemplo: 4-0-2-0 (4s excêntrica, 0s transição, 2s concêntrica, 0s pico).
   - DETALHES DE EXECUÇÃO: Instruções técnicas profundas (ex: "alongamento máximo na fase excêntrica", "pico de contração de 2 segundos no topo", "manter escápulas aduzidas").

ESTRUTURA DE SÉRIES (Padrão Pacho):
- Warm-up sets: 2 séries leves para aquecimento e lubrificação articular.
- Feeder sets: 1-2 séries com carga progressiva para preparar o sistema nervoso (sem falha).
- Work sets: As séries principais levadas até a falha técnica ou absoluta.

NÍVEIS DE PRESCRIÇÃO:
- Iniciante: 4-5 exercícios, volume moderado, foco em padrão de movimento, sem técnicas avançadas.
- Intermediário: 5-6 exercícios, foco em progressão de carga, técnicas básicas de intensidade ocasionalmente.
- Avançado: 6-7 exercícios, divisão altamente setorizada, técnicas avançadas em quase todos os grupos.
- Atleta de Alto Nível: 7-8 exercícios, volume e intensidade máximos, FST-7, Cluster Sets, foco em pontos fracos e detalhes estéticos competitivos.

Responda SEMPRE chamando a função montar_treino com riqueza de detalhes em cada campo.`;

    const userPrompt = `Monte o treino para o aluno:
- Sexo: ${perfil?.sexo || "não informado"}
- Idade: ${perfil?.idade || "?"}
- Nível: ${perfil?.tempo_treino || "Iniciante"}
- Objetivo: ${perfil?.objetivo || "hipertrofia"}
- Frequência semanal: ${perfil?.frequencia_semanal || 4}x
- Lesões: ${lesoes}
- Limitações: ${limitacoes}

Divisão sugerida: ${divisoes?.join(", ") || "ABC"}

Use exercícios desta biblioteca (id, nome, grupo, contraindicacoes):
${(biblioteca || []).map((e: any) => `- ${e.nome} [${e.grupo_muscular}] contra: ${(e.contraindicacoes || []).join("/") || "—"}`).join("\n")}

Prescreva o cardio adequado ao objetivo (Pacho style).`;

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
                          series: { type: "string", description: "Ex: 2 Warm-up + 1 Feeder + 3 Work sets" },
                          repeticoes: { type: "string", description: "Ex: 8-12 + Drop-set" },
                          cadencia: { type: "string", description: "Tempo de execução (ex: 3-1-2-0)" },
                          detalhes_execucao: { type: "string", description: "Instruções biomecânicas e de intensidade ricas em detalhes" },
                          observacao: { type: "string", description: "Informações adicionais curtas" },
                        },
                        required: ["nome", "series", "repeticoes", "cadencia", "detalhes_execucao", "observacao"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["dia", "exercicios"],
                  additionalProperties: false,
                },
              },
              cardio: { type: "string", description: "Prescrição de cardio personalizada" },
            },
            required: ["dias", "cardio"],
            additionalProperties: false,
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
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "montar_treino" } },
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit atingido. Tente em alguns instantes." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos insuficientes na workspace Lovable AI." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "Falha na IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : null;
    if (!args) {
      return new Response(JSON.stringify({ error: "IA não retornou estrutura válida" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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