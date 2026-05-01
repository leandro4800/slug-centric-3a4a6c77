// Edge function: gera treino prescrito via Lovable AI
// Recebe: { perfil, biblioteca, frequencia, divisoes }
// Retorna: { dias: [{ dia: "Treino A", exercicios: [{nome, series, repeticoes, observacao}] }], cardio: string }

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

    const systemPrompt = `Você é um coach especialista em musculação que segue a Metodologia Pacho.
Para cada exercício use estrutura: Warm-up sets (2 leves), Feeder sets (1-2 médias), Work sets (até a falha técnica).
NUNCA prescreva exercícios contraindicados pelas lesões/limitações do aluno.
Cardio: LISS para perda de gordura; cardio leve (zona 2, 20-30min) para ganho de massa.

AJUSTE O VOLUME E INTENSIDADE CONFORME O NÍVEL DO ALUNO:
- Iniciante: 4-5 exercícios/dia, 2-3 work sets, foco em técnica e amplitude, sem técnicas avançadas.
- Intermediário: 5-6 exercícios/dia, 3 work sets, introduzir drop-sets ocasionais e progressão de carga.
- Avançado: 6-7 exercícios/dia, 3-4 work sets, técnicas de intensidade (rest-pause, drop, FST-7) frequentes.
- Atleta de Alto Nível (competidor/fisiculturista): 7-8 exercícios/dia, 4 work sets, periodização de pico, divisões altamente especializadas, alto volume de isoladores, técnicas de intensidade combinadas, ênfase em pontos fracos e simetria competitiva.

Responda SEMPRE chamando a função montar_treino com a estrutura completa.`;

    const userPrompt = `Monte o treino para o aluno:
- Sexo: ${perfil?.sexo || "não informado"}
- Idade: ${perfil?.idade || "?"}
- Peso: ${perfil?.peso_kg || "?"}kg / Altura: ${perfil?.altura_cm || "?"}cm / BF: ${perfil?.bf_pct || "?"}%
- Objetivo: ${perfil?.objetivo || "hipertrofia"}
- Frequência semanal: ${perfil?.frequencia_semanal || 4}x
- Tempo de treino: ${perfil?.tempo_treino || "intermediário"}
- Lesões: ${lesoes}
- Limitações: ${limitacoes}

Divisão sugerida: ${divisoes?.join(", ") || "ABC"}

Use APENAS exercícios desta biblioteca (id, nome, grupo, contraindicacoes):
${(biblioteca || []).map((e: any) => `- ${e.nome} [${e.grupo_muscular}] contra: ${(e.contraindicacoes || []).join("/") || "—"}`).join("\n")}

Cada dia deve ter 5-7 exercícios. Inclua observações de execução curtas (Pacho).`;

    const tools = [
      {
        type: "function",
        function: {
          name: "montar_treino",
          description: "Retorna a prescrição estruturada do treino completo.",
          parameters: {
            type: "object",
            properties: {
              dias: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    dia: { type: "string", description: "Ex: Treino A" },
                    exercicios: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          nome: { type: "string" },
                          series: { type: "string" },
                          repeticoes: { type: "string" },
                          observacao: { type: "string" },
                        },
                        required: ["nome", "series", "repeticoes", "observacao"],
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
