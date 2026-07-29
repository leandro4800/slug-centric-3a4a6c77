// Analisa métricas do aluno (progressão de carga, evolução corporal) via Lovable AI Gateway.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o analista de performance da metodologia AlphaCoach.
Recebe métricas reais de um atleta (progressão de cargas, peso, %BF, massa magra, avaliações físicas).

Responda em português do Brasil, direto ao coach, em markdown curto com estas seções:
## Resumo
## Progressão de carga
## Evolução corporal
## Pontos de atenção
## Recomendações práticas (3 a 5 bullets)

Regras:
- Baseie-se APENAS nos dados enviados. Se faltar dado, diga o que falta coletar.
- Cite números e variações (kg, %, período).
- Nunca dê diagnóstico médico nem prescreva medicamentos.
- Seja objetivo: no máximo ~350 palavras.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const { aluno, cargas, evolucao, avaliacoes, peso_diario } = await req.json();

    const payload = {
      aluno: aluno ?? null,
      progressao_cargas: cargas ?? [],
      evolucao_metricas: evolucao ?? [],
      avaliacoes_fisicas: avaliacoes ?? [],
      peso_diario: peso_diario ?? [],
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Analise as métricas deste atleta:\n\n${JSON.stringify(payload).slice(0, 60000)}`,
          },
        ],
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      console.error(`AI gateway error [${resp.status}]: ${body}`);
      return new Response(
        JSON.stringify({ error: "Falha na análise de IA", status: resp.status, details: body }),
        { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();
    const analise = data?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ analise }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analisar-metricas-aluno error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
