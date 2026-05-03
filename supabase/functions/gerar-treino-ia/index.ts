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

    // === 1. BUSCA DE MODELO PACHOLOK (BIBLIOTECA) ===
    let bibliotecaPachoContext = "";
    let regrasDescansoContext = "";
    let bibliotecaAbsContext = "";

    try {
      const nivelInput = (perfil?.tempo_treino || "Iniciante").toLowerCase();
      const variant = Math.floor(Math.random() * 3) + 1; // Sorteio de Variante (1, 2 ou 3)

      const [pachoResp, descansoResp, absResp] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/biblioteca_metodologia_pacho?nivel=eq.${nivelInput}&variante=eq.${variant}&order=ordem_exercicio.asc`, {
          headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
        }),
        fetch(`${SUPABASE_URL}/rest/v1/regras_descanso_pacho?nivel=eq.${nivelInput}`, {
          headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
        }),
        fetch(`${SUPABASE_URL}/rest/v1/biblioteca_abdominais_pacho`, {
          headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
        })
      ]);

      if (pachoResp.ok) {
        const pachoData = await pachoResp.json();
        if (pachoData.length > 0) {
          bibliotecaPachoContext = "\n\n=== ESTRUTURA BASE PACHOLOK (MODELO SORTEADO: VARIANTE " + variant + ") ===\n" +
            pachoData.map((e: any) => 
              `- ${e.nome_exercicio} [${e.grupo_muscular}] | Ordem: ${e.ordem_exercicio} | Aquecimento: ${e.series_aquecimento} | Ajuste: ${e.series_ajuste} | Trabalho: ${e.series_trabalho} | Técnica: ${e.tecnica_especifica || "Nenhuma"} | Cadência: ${e.cadencia || "3-0-2-0"}`
            ).join("\n") +
            "\n=== FIM DO MODELO ===\n";
        }
      }

      if (descansoResp.ok) {
        const descansoData = await descansoResp.json();
        if (descansoData.length > 0) {
          regrasDescansoContext = "\n\n=== REGRAS DE DESCANSO E CARDIO ===\n" +
            descansoData.map((d: any) => `- Lógica: ${d.logica_descanso}\n- Dias Sugeridos: ${d.dias_descanso_sugeridos}\n- Cardio: ${d.cardio_instrução}`).join("\n");
        }
      }

      if (absResp.ok) {
        const absData = await absResp.json();
        if (absData.length > 0) {
          bibliotecaAbsContext = "\n\n=== BIBLIOTECA DE ABDOMINAIS (CORE) ===\n" +
            absData.map((a: any) => `- ${a.nome_exercicio}: ${a.series}x${a.repeticoes} (${a.instrucao})`).join("\n");
        }
      }
    } catch (err) {
      console.error("Erro ao buscar dados da biblioteca:", err);
    }

    // === 2. PARECER DE SAÚDE (EXAMES) ===
    let saudeContext = "";
    let userId: string | null = perfil?.aluno_id || perfil?.user_id || null;
    if (!userId) {
      try {
        const authHeader = req.headers.get("Authorization");
        if (authHeader?.startsWith("Bearer ")) {
          const token = authHeader.slice(7);
          const payload = JSON.parse(atob(token.split(".")[1]));
          userId = payload?.sub || null;
        }
      } catch (_) { /* ignore */ }
    }

    if (userId) {
      try {
        const examesResp = await fetch(`${SUPABASE_URL}/rest/v1/analises_clinicas?user_id=eq.${userId}&order=created_at.desc&limit=1`, {
          headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
        });
        if (examesResp.ok) {
          const exames = await examesResp.json();
          if (exames && exames.length > 0) {
            saudeContext = `\n\n=== DADOS CLÍNICOS RECENTES DO ALUNO ===\n${exames[0].parecer_ia || exames[0].resumo_clinico}\nScore Performance: ${exames[0].score_performance}%\n`;
          }
        }
      } catch (err) {
        console.error("Erro ao buscar exames:", err);
      }
    }

    const knowledgeContext = bibliotecaPachoContext + regrasDescansoContext + bibliotecaAbsContext + saudeContext;

    const systemPrompt = `${knowledgeContext}

Você é a Dr. IA, a mente estratégica por trás da metodologia Alpha Coach. Sua missão é gerar prescrições de treino com precisão cirúrgica, seguindo a Base de Conhecimento Pacholok (acima como Fonte de Verdade Absoluta) e as Regras de Estrutura de Elite abaixo.

═══════════════════════════════════════════════
1. REGRAS GERAIS DE FLUXO (INVIOLÁVEIS)
═══════════════════════════════════════════════
- BLOCOS DE MÚSCULO: Termine TODA a sequência de um grupo muscular antes de iniciar o próximo. NUNCA alterne (ex: 1 exerc. de Peito, 1 de Tríceps, 1 de Peito). Feche o bloco de Peito completamente, depois inicie Tríceps.
- PRIORIDADE DE PONTO FRACO: Se um ponto fraco for identificado (ex: Peitoral Clavicular, Ombro), o treino do dia DEVE iniciar OBRIGATORIAMENTE pelos exercícios desse ponto fraco (onde o aluno tem mais força e foco neural).
- SÉRIES PACHO: Padrão por exercício: 2x Série de Aquecimento + 1x Série de Ajuste (Feeder) + 1 a 2 Séries de Trabalho até a falha absoluta.
- TERMINOLOGIA: Use EXCLUSIVAMENTE "Série de Aquecimento" (10-15 reps leve), "Série de Ajuste" (4-6 reps, longe da falha) e "Série de Trabalho" (falha absoluta).

═══════════════════════════════════════════════
2. ESTRUTURA POR NÍVEL (OBRIGATÓRIO)
═══════════════════════════════════════════════

A) INICIANTE:
- Lógica: Full Body (Corpo Todo) — TODOS os dias treinam o corpo todo.
- Volume: 1 exercício por grupo muscular principal por sessão.
- Foco: Aprendizado motor e técnica perfeita. NÃO usar técnicas avançadas.

B) INTERMEDIÁRIO (Divisão Estratégica 5-6 dias):
- Dia 1 — Peito + Tríceps + Anterior de Ombro: mín. 4 exerc. de Peito + 3 de Tríceps + 1 de Anterior de Ombro com técnica.
- Dia 2 — Costas + Bíceps + Posterior de Ombro: mín. 4 de Costas + 2 de Bíceps + 1 de Posterior de Ombro com técnica.
- Dia 3 — Perna Completa: mín. 4 de Quadríceps + 2 de Posterior + 1 de Panturrilha.
- Dia 4 — Ombro Completo + Trapézio: mín. 2 exerc. por porção (anterior, lateral, posterior). Aplicar técnicas de intensificação (Drop-set / Rest-pause) em TODOS os finais.
- Dia 5 — Ênfase Cadeia Posterior: 4 exerc. de Posterior + 2 de Quadríceps.
- Dia 6 (Opcional/Ênfase): 3 de Peito + 3 de Costas + 1 técnica isolada para Ombro.
- Domingo: descanso obrigatório.

C) AVANÇADO / ATLETA (Intensidade Máxima):
- Lógica: 1 Músculo por Dia (Foco Total).
- Volume: MÍNIMO 5 exercícios por grupo principal.
- Técnicas: Se usar apenas 4 exercícios, técnicas avançadas (SST, Cluster Set, Drop-set, Rest-pause, Pico de Contração, Isometria) são OBRIGATÓRIAS em TODOS os exercícios.
- Foco: Explorar biomecânica profunda e exaustão de TODAS as porções.

═══════════════════════════════════════════════
3. DIRETRIZES DE PONTO FRACO
═══════════════════════════════════════════════
- PEITORAL CLAVICULAR: Os 2 PRIMEIROS exercícios do dia de Peito DEVEM ser inclinações (Halteres inclinado, Smith inclinado ou Máquina inclinada). Crossover de baixo para cima também é aceito como reforço.
- OMBRO: Inclua OBRIGATORIAMENTE técnicas de "Pico de Contração" e "Isometria" nas elevações laterais. Distribuir ombro em 2-3 dias da semana.
- DISTRIBUIÇÃO: O(s) grupo(s) de ponto fraco aparecem em 2-3 dias da semana com volume ~2x o padrão. Reduza levemente o volume dos grupos não-prioritários para compensar fadiga sistêmica.
- MARCAÇÃO: No campo "observacao" do exercício, mencione explicitamente quando ele faz parte da estratégia de ponto fraco.

═══════════════════════════════════════════════
4. EXECUÇÃO E CADÊNCIA
═══════════════════════════════════════════════
- Forneça cadência específica (ex: 4-0-2-0) em cada exercício.
- Detalhes biomecânicos profundos no campo "detalhes_execucao" (ângulo, ponto de contração, controle excêntrico).
- Proibido alterar repetições/intervalos definidos pelo Pacholok.

ESTRUTURA DE RESPOSTA: Chame a função montar_treino com a prescrição completa. Se houver dados clínicos no contexto, adicione um campo "observacao_clinica" ao final (fora do array de dias) com um parecer estratégico baseado nos biomarcadores (ex: ajustar volume se cortisol estiver alto). Respeite TODAS as regras acima sem exceção.`;

    const userPrompt = `Monte o treino Pacho-style para:
- Sexo: ${perfil?.sexo || "não informado"}
- Idade: ${perfil?.idade || "?"}
- Nível: ${perfil?.tempo_treino || "Iniciante"} (Seção correspondente na base)
- Objetivo: ${perfil?.objetivo || "hipertrofia"}
- Frequência semanal: ${perfil?.frequencia_semanal || 4}x
- Ênfase desejada: ${perfil?.enfase || "Geral"}
- Lesões/Limitações: ${lesoes} / ${limitacoes}
${customPrompt ? `\n=== PEDIDO ESPECÍFICO DO COACH (PRIORIDADE MÁXIMA) ===\n"${customPrompt}"\n\nINTERPRETE este pedido e aplique a Diretriz #6 (Ênfase/Pontos Fracos): aumente o volume e a frequência semanal dos grupos mencionados.\n` : ""}
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
              observacao_clinica: { type: "string", description: "Parecer clínico baseado nos exames de sangue do aluno (se disponíveis)." },
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