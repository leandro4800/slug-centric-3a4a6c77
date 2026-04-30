// Edge function: recebe um comando em linguagem natural e devolve um JSON
// com tokens de tema (theme_overrides) para mesclar no tenant.
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Você é um designer assistente do app AlphaCoach.
Recebe um comando em português e devolve EXCLUSIVAMENTE um JSON de tokens de tema.

Tokens permitidos (todos opcionais):
- "primary": HSL string ex "270 80% 55%"   (cor primária / botões / destaques)
- "primary_glow": HSL string                (variação clara da primária)
- "accent": HSL string                      (cor de ação - botão REPRODUZIR, ícones)
- "background": HSL string                  (fundo geral do app)
- "card": HSL string                        (fundo dos cards)
- "foreground": HSL string                  (cor do texto principal)
- "border": HSL string                      (borda dos elementos)

Regras:
- Use SEMPRE formato HSL "H S% L%" (sem hsl(), sem vírgulas).
- Mantenha contraste legível (fundo escuro -> texto claro).
- Se o usuário pedir "roxo espelhado", use roxo escuro saturado, ex "270 60% 18%".
- Se o usuário pedir só uma mudança (ex "muda o botão pra azul"), devolva APENAS aquele token.
- NUNCA quebre o padrão Netflix sem o usuário pedir explicitamente — só altere o que ele pediu.
- Resposta: APENAS o JSON, sem markdown, sem texto extra.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { command, current } = await req.json();
    if (!command) throw new Error("command é obrigatório");

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

    const userMsg = `Tema atual (overrides): ${JSON.stringify(current || {})}\n\nComando: ${command}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway: ${resp.status} ${txt}`);
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let patch: Record<string, string> = {};
    try { patch = JSON.parse(content); } catch { patch = {}; }

    return new Response(JSON.stringify({ patch }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[theme-ai] erro", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
