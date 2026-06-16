// Edge function: Gera planilha de treino premium via IA para o Hub do Coach
// Input: { sexo, nivel, frequencia, objetivo, foco?, observacoes? }
// Output: { plano: { title, recomendacoes, divisao[], workouts[{nome, exercicios[{nome, series, repeticoes, intervalo, tecnica}]}] } }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY não configurada" }, 500);

    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const sexo = String(body.sexo || "").toLowerCase();
    const nivel = String(body.nivel || "Intermediário");
    const frequencia = Number(body.frequencia || 4);
    const objetivo = String(body.objetivo || "Hipertrofia");
    const foco = String(body.foco || "").trim();
    const observacoes = String(body.observacoes || "").trim();
    const enfase = String(body.enfase || "").trim();
    const exemplos = Array.isArray(body.exemplos) ? body.exemplos : [];

    if (!["masculino", "feminino"].includes(sexo)) {
      return json({ error: "Sexo inválido (use masculino ou feminino)" }, 400);
    }
    if (frequencia < 2 || frequencia > 6) {
      return json({ error: "Frequência deve ser entre 2 e 6" }, 400);
    }

    let femEnfaseBlock = "";
    if (sexo === "feminino") {
      if (enfase === "posterior_gluteo") {
        femEnfaseBlock = `\n- ÊNFASE SELECIONADA: POSTERIOR + GLÚTEO. Dedique no MÍNIMO 60% do volume semanal de inferiores para posterior de coxa e glúteo. Hip Thrust pesado, Stiff, Levantamento Terra Romeno, Cadeira Flexora, Mesa Flexora, Coice na Polia, Glúteo Máquina, Búlgaro com foco em posterior. Quadríceps entra apenas como acessório (2-3 exercícios em 1 dia).`;
      } else if (enfase === "quadriceps") {
        femEnfaseBlock = `\n- ÊNFASE SELECIONADA: QUADRÍCEPS. Dedique no MÍNIMO 60% do volume de inferiores para quadríceps. Agachamento livre, Hack, Leg Press 45, Cadeira Extensora (pico 2s), Afundo, Sissy Squat. Glúteo/posterior mantidos com 1 dia dedicado + finalizadores (Hip Thrust, Stiff).`;
      } else {
        femEnfaseBlock = `\n- ÊNFASE SELECIONADA: BALANCEADO. Distribua o volume igualmente entre glúteo/posterior e quadríceps ao longo da semana.`;
      }
    }

    const femBlock = sexo === "feminino"
      ? `\n\nPÚBLICO FEMININO — REGRAS INVIOLÁVEIS:
- Foco estético em inferiores. Mínimo 2 dias de posterior/glúteo + 1 dia de quadríceps (ajustar conforme ênfase).
- Em CADA dia de inferiores: 5-6 exercícios mínimo, sempre incluindo movimento de quadril dominante (Hip Thrust/Stiff/Terra Romeno).
- Membros superiores: volume moderado, foco em tônus. Costas e ombro lateral priorizados.
- Peito: máximo 3 exercícios por sessão.
- Repetições: pernas/glúteo 12-20 reps; superiores 10-15 reps.
- Use técnicas como drop set, rest-pause e pico de contração em glúteo.${femEnfaseBlock}`
      : `\n\nPÚBLICO MASCULINO — METODOLOGIA ALPHA:
- Volume equilibrado entre todos os grupos com ênfase em peito, costas, ombro e braços.
- Compostos pesados (Supino, Agachamento, Levantamento Terra, Desenvolvimento) sempre presentes.
- Siga FIELMENTE o padrão de seleção/ordem/volume dos EXEMPLOS DE REFERÊNCIA abaixo (planilhas oficiais Metodologia Alpha do nível do aluno). Adapte apenas à frequência e objetivo.`;

    const exemplosBlock = exemplos.length
      ? `\n\nEXEMPLOS DE REFERÊNCIA (planilhas oficiais Metodologia Alpha — base de seleção/ordem de exercícios):\n${JSON.stringify(exemplos).slice(0, 12000)}`
      : "";

    const divisaoSugerida = (() => {
      if (sexo === "feminino") {
        const eq = enfase === "quadriceps";
        if (frequencia <= 3) return eq
          ? ["Quadríceps A", "Superiores", "Quadríceps B + Glúteo"]
          : ["Inferiores A (Glúteo/Posterior)", "Superiores", "Inferiores B (Quadríceps/Glúteo)"];
        if (frequencia === 4) return eq
          ? ["Quadríceps A", "Superiores (Push)", "Quadríceps B + Posterior", "Superiores (Pull)"]
          : ["Glúteo/Posterior", "Superiores (Push)", "Quadríceps/Glúteo", "Superiores (Pull)"];
        if (frequencia === 5) return eq
          ? ["Quadríceps A", "Peito/Ombro/Tríceps", "Quadríceps B", "Costas/Bíceps", "Glúteo/Posterior"]
          : ["Glúteo/Posterior A", "Peito/Ombro/Tríceps", "Quadríceps/Glúteo", "Costas/Bíceps", "Glúteo/Posterior B"];
        return eq
          ? ["Quadríceps A", "Peito/Tríceps", "Costas/Bíceps", "Quadríceps B", "Ombro/Trapézio", "Glúteo/Posterior"]
          : ["Glúteo/Posterior A", "Peito/Tríceps", "Costas/Bíceps", "Quadríceps/Glúteo", "Ombro/Trapézio", "Glúteo/Posterior B"];
      }
      if (frequencia <= 3) return ["Push (Peito/Ombro/Tríceps)", "Pull (Costas/Bíceps)", "Legs (Pernas)"];
      if (frequencia === 4) return ["Peito/Bíceps", "Costas/Lombar", "Ombro/Tríceps", "Pernas"];
      if (frequencia === 5) return ["Peito", "Costas", "Pernas (Quadríceps)", "Ombro/Trapézio", "Braços + Posterior"];
      return ["Peito", "Costas", "Pernas (Quadríceps)", "Ombro/Trapézio", "Braços", "Posterior/Glúteo/Panturrilha"];
    })();

    const systemPrompt = `Você é o mestre treinador da Metodologia Alpha — referência em prescrição de musculação avançada. Gere planilhas PREMIUM, NUNCA genéricas.

REGRAS DE VOLUME OBRIGATÓRIAS (musculatura grande = mínimo 5 exercícios por sessão):
- COSTAS: mínimo 5 exercícios (puxadas, remadas variadas, pullover).
- QUADRÍCEPS: mínimo 5 exercícios (agachamento livre, leg press, hack, cadeira extensora, afundo/búlgaro).
- POSTERIOR DE COXA: mínimo 5 exercícios (stiff, mesa flexora, cadeira flexora, levantamento terra romeno, glute-ham).
- PEITORAL: mínimo 5 exercícios (supinos variados, voador, crossover).
- GLÚTEO (especial feminino): mínimo 5 exercícios.
- Musculaturas menores (bíceps, tríceps, ombro lateral, panturrilha): 3-4 exercícios.

ESTRUTURA DE SÉRIES (Metodologia Alpha):
- Cada exercício composto: 1-2 séries de AQUECIMENTO + 1-2 séries de AJUSTE + 1-2 séries de TRABALHO (até a falha técnica).
- Exercícios isoladores podem ir direto para ajuste + trabalho.
- Use técnicas avançadas: rest-pause, drop set, pico de contração 2s, bi-set quando apropriado.
- Cadência sugerida em compostos: 3-1-X-0.

Retorne APENAS um JSON válido (sem markdown, sem \`\`\`) no formato exato:
{
  "title": "string descritiva (ex: 'Hipertrofia Avançada — Mulher 5x/semana — Foco Glúteo')",
  "recomendacoes": "string longa com orientações de progressão de carga, descanso, cardio e cuidados",
  "divisao": ["SEGUNDA: TREINO A", "TERÇA: ...", ...] (7 dias da semana),
  "workouts": [
    {
      "nome": "TREINO A (Grupo Muscular)",
      "exercicios": [
        {
          "nome": "Nome do exercício",
          "series": "Ex: 2 aquec + 2 ajuste + 2 trabalho",
          "repeticoes": "Ex: 6-10 (trabalho)",
          "intervalo": "Ex: 60-90s",
          "tecnica": "Ex: Rest-pause 10s na última série | Pico 2s | Drop set"
        }
      ]
    }
  ]
}${femBlock}${exemplosBlock}`;

    const userPrompt = `Monte uma planilha de treino PREMIUM com os seguintes parâmetros:
- Sexo: ${sexo}
- Nível: ${nivel}
- Frequência semanal: ${frequencia}x na academia
- Objetivo principal: ${objetivo}
- Foco extra: ${foco || "nenhum específico"}
- Observações do coach: ${observacoes || "nenhuma"}

DIVISÃO BASE SUGERIDA (use ou adapte mantendo a lógica): ${JSON.stringify(divisaoSugerida)}

Garanta: musculaturas grandes com 5+ exercícios, estrutura aquecimento/ajuste/trabalho, técnicas avançadas, divisão semanal cobrindo 7 dias com descansos posicionados de forma inteligente.

RETORNE APENAS O JSON, SEM TEXTO EXTRA.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        temperature: 0.7,
      }),
    });

    if (aiResp.status === 429) return json({ error: "Limite de requisições atingido. Tente novamente em instantes." }, 429);
    if (aiResp.status === 402) return json({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }, 402);
    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI Gateway error:", aiResp.status, errText);
      return json({ error: `Erro na IA: ${aiResp.status}` }, 500);
    }

    const aiData = await aiResp.json();
    const content = aiData?.choices?.[0]?.message?.content || "";

    let plano: any = null;
    try {
      plano = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try { plano = JSON.parse(match[0]); } catch {}
      }
    }
    if (!plano || !Array.isArray(plano.workouts)) {
      console.error("Resposta IA inválida:", content);
      return json({ error: "A IA retornou um formato inválido. Tente novamente." }, 500);
    }

    return json({ plano });
  } catch (err) {
    console.error("Erro inesperado:", err);
    return json({ error: (err as Error).message || "Erro interno" }, 500);
  }
});
