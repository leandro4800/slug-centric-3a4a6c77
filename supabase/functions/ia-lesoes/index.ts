// IA Clínica de Lesões (AlphaCoach) — tira dúvidas do coach sobre lesões,
// sugere os melhores exercícios e gera o conteúdo do laudo técnico.
import { corsHeaders } from "../_shared/cors.ts";
import { analisarRestricoes } from "../_shared/restricoes.ts";

const BASE = `Você é o especialista clínico da metodologia AlphaCoach, com formação em
treinamento resistido para populações especiais (ortopedia, reabilitação e cardiologia do exercício).
Fala em português do Brasil, direto ao COACH (nunca ao aluno).

REGRAS INEGOCIÁVEIS:
- Você NÃO dá diagnóstico médico, não interpreta exames de imagem e não prescreve medicamentos.
- Sempre reforce que patologia diagnosticada exige liberação médica/fisioterapêutica.
- A seção "RESTRIÇÕES DETECTADAS" recebida abaixo tem PRIORIDADE ABSOLUTA: nunca sugira um exercício
  que conste na lista de proibidos, mesmo que seja o "padrão ouro" para o grupo muscular.
- Toda sugestão de exercício deve vir com: motivo da escolha, amplitude/cadência, faixa de repetições,
  PSE máxima e sinal de alerta para interromper.
- Se faltar informação, diga exatamente o que o coach precisa coletar.`;

const PROMPT_CHAT = `${BASE}

Responda em markdown curto e prático (máx. ~450 palavras) com:
## Leitura do caso
## Exercícios recomendados (tabela: Exercício | Por quê | Séries x Reps | Cuidado)
## Evitar agora
## Sinais de alerta / quando parar
## Próximo passo`;

const PROMPT_LAUDO = `${BASE}

Gere um LAUDO TÉCNICO DE ADEQUAÇÃO DE EXERCÍCIOS, objetivo e auditável, em markdown, com EXATAMENTE estas seções:
## 1. Identificação do caso
## 2. Restrições relatadas e classificação de gravidade
## 3. Exercícios contraindicados (lista com justificativa biomecânica)
## 4. Exercícios liberados e prescrição segura (tabela: Exercício | Séries x Reps | Amplitude/Cadência | PSE máx | Observação)
## 5. Progressão sugerida (4 semanas)
## 6. Critérios de reavaliação e sinais de interrupção
## 7. Limitações deste documento
Na seção 7 deixe explícito que este documento é um material técnico de apoio ao profissional de
Educação Física, NÃO é laudo médico, não substitui avaliação clínica presencial e não serve para
diagnóstico. Seja exato: nada de exercício genérico sem parâmetro.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const body = await req.json().catch(() => ({}));
    const modo: string = body?.modo === "laudo" ? "laudo" : "chat";
    const pergunta: string = String(body?.pergunta || "").slice(0, 4000);
    const aluno = body?.aluno ?? null;
    const relato: string = String(body?.relato || "").slice(0, 4000);
    const historico: { role: string; content: string }[] = Array.isArray(body?.historico)
      ? body.historico.slice(-10)
      : [];

    if (modo === "chat" && !pergunta.trim()) {
      return new Response(JSON.stringify({ error: "Escreva uma pergunta." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analise = analisarRestricoes(
      relato,
      aluno?.lesoes_atuais,
      aluno?.cirurgias,
      aluno?.doencas,
      aluno?.limitacoes,
    );

    const contexto = `
DADOS DO ATLETA:
${JSON.stringify(
  {
    nome: aluno?.nome ?? null,
    sexo: aluno?.sexo ?? null,
    idade: aluno?.idade ?? null,
    peso_kg: aluno?.peso_kg ?? null,
    altura_cm: aluno?.altura_cm ?? null,
    nivel: aluno?.nivel ?? null,
    dias_disponiveis: aluno?.dias_disponiveis ?? null,
    objetivo: aluno?.objetivo ?? null,
    doencas: aluno?.doencas ?? null,
    medicamentos: aluno?.medicamentos ?? null,
    lesoes_atuais: aluno?.lesoes_atuais ?? null,
    cirurgias: aluno?.cirurgias ?? null,
  },
  null,
  1,
)}

RESTRIÇÕES DETECTADAS PELA TRAVA CLÍNICA DETERMINÍSTICA:
${analise.temRestricao ? analise.blocoPrompt : "Nenhuma restrição identificada automaticamente no texto informado."}
`.trim();

    const messages = [
      { role: "system", content: modo === "laudo" ? PROMPT_LAUDO : PROMPT_CHAT },
      { role: "system", content: contexto },
      ...historico
        .filter((m) => m && typeof m.content === "string")
        .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 4000) })),
      {
        role: "user",
        content:
          modo === "laudo"
            ? `Gere o laudo técnico completo para este caso.${pergunta ? ` Observações do coach: ${pergunta}` : ""}`
            : pergunta,
      },
    ];

    const stream = modo === "laudo";

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.2,
        max_tokens: 3000,
        stream,
      }),
    });


    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Recarregue para continuar." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`Falha na IA: ${resp.status} ${t.slice(0, 300)}`);
    }

    const restricoesMeta = {
      detectadas: analise.temRestricao,
      gravidade: analise.gravidade,
      regioes: analise.regioes.map((r) => r.rotulo),
      proibidos: analise.proibidos,
      substitutos: analise.substitutos,
    };

    if (stream && resp.body) {
      // Modo laudo: repassa o SSE do gateway (evita timeout da edge function em respostas longas).
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const reader = resp.body.getReader();
      const out = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode(`event: meta\ndata: ${JSON.stringify(restricoesMeta)}\n\n`));
          let buffer = "";
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";
              for (const line of lines) {
                if (!line.startsWith("data:")) continue;
                const payload = line.slice(5).trim();
                if (!payload || payload === "[DONE]") continue;
                try {
                  const json = JSON.parse(payload);
                  const delta = json?.choices?.[0]?.delta?.content;
                  if (delta) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
                  }
                } catch { /* chunk parcial */ }
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } catch (err) {
            controller.enqueue(
              encoder.encode(`event: error\ndata: ${JSON.stringify({ error: String(err) })}\n\n`),
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(out, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const data = await resp.json();
    const texto = data?.choices?.[0]?.message?.content ?? "";


    return new Response(
      JSON.stringify({
        texto,
        restricoes: {
          detectadas: analise.temRestricao,
          gravidade: analise.gravidade,
          regioes: analise.regioes.map((r) => r.rotulo),
          proibidos: analise.proibidos,
          substitutos: analise.substitutos,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
