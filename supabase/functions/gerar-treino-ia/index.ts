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
    const { perfil, biblioteca, divisoes } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const lesoes = (perfil?.lesoes || []).join(", ") || "nenhuma";
    const limitacoes = (perfil?.limitacoes || []).join(", ") || "nenhuma";

    // Preparação para futura integração com a tabela biblioteca_metodologia_pacho
    // Por enquanto, usamos a biblioteca geral enviada pelo frontend
    
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