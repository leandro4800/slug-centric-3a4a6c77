// Extrai dados de aluno (nome, email, telefone) a partir de imagem OU texto livre
// usando o Lovable AI Gateway (Gemini vision).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você extrai dados de cadastro de aluno de fitness/nutrição a partir de imagens (prints de WhatsApp, fichas, cartões de visita) ou texto livre.

Retorne SEMPRE apenas um JSON válido, sem markdown, sem explicações, no formato:
{
  "nome": "Nome completo do aluno ou null",
  "email": "email@dominio.com ou null",
  "telefone": "apenas dígitos com DDD, ex: 11999999999 ou null",
  "sexo": "masculino | feminino | null",
  "observacoes": "qualquer info extra útil ao coach (idade, objetivo, etc) ou null"
}

Regras:
- Se algum campo não estiver claro, use null.
- Nome completo: capitalize corretamente.
- Email: valide formato antes de retornar.
- Telefone brasileiro: extraia só dígitos, remova +55, parênteses, hífens, espaços.
- Nunca invente dados.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const { image_base64, image_mime, text } = await req.json();

    if (!image_base64 && !text) {
      return new Response(JSON.stringify({ error: "Envie 'image_base64' ou 'text'" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Monta o content multimodal
    const userContent: any[] = [];
    if (text && text.trim()) {
      userContent.push({ type: "text", text: `Extraia os dados deste texto:\n\n${text.trim()}` });
    } else {
      userContent.push({ type: "text", text: "Extraia os dados de cadastro do aluno desta imagem." });
    }
    if (image_base64) {
      const mime = image_mime || "image/png";
      const dataUrl = image_base64.startsWith("data:")
        ? image_base64
        : `data:${mime};base64,${image_base64}`;
      userContent.push({ type: "image_url", image_url: { url: dataUrl } });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("[parse-aluno-ia] gateway error", resp.status, errText);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso da IA atingido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Falha ao consultar IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      // tentar extrair JSON dentro do texto
      const m = String(raw).match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch { /* ignore */ } }
    }

    // Normaliza telefone
    if (parsed.telefone) {
      parsed.telefone = String(parsed.telefone).replace(/\D/g, "");
      if (parsed.telefone.startsWith("55") && parsed.telefone.length > 11) {
        parsed.telefone = parsed.telefone.slice(2);
      }
      if (parsed.telefone.length < 10) parsed.telefone = null;
    }

    return new Response(JSON.stringify({ ok: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[parse-aluno-ia] error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
