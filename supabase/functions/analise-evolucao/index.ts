import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { antes_id, depois_id } = await req.json();
    if (!antes_id || !depois_id) {
      return new Response(JSON.stringify({ error: "antes_id e depois_id são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: checkins, error: cErr } = await supabase
      .from("evolucao_checkins")
      .select("*")
      .in("id", [antes_id, depois_id])
      .eq("user_id", user.id);
    if (cErr) throw cErr;

    const antes = checkins?.find((c: any) => c.id === antes_id);
    const depois = checkins?.find((c: any) => c.id === depois_id);
    if (!antes || !depois) {
      return new Response(JSON.stringify({ error: "Check-ins não encontrados" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Coleta TODAS as fotos disponíveis (antes/depois) e baixa em base64
    const tipos = ["foto_frente_url", "foto_costas_url", "foto_lado_url"];
    const imagens: { role: "antes" | "depois"; angulo: string; dataUrl: string }[] = [];

    for (const c of [{ obj: antes, tag: "antes" as const }, { obj: depois, tag: "depois" as const }]) {
      for (const t of tipos) {
        const path = c.obj[t];
        if (!path) continue;
        const { data: file } = await supabase.storage.from("evolucao-fotos").download(path);
        if (!file) continue;
        const buf = new Uint8Array(await file.arrayBuffer());
        let bin = "";
        for (let i = 0; i < buf.length; i += 0x8000) {
          bin += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + 0x8000)));
        }
        const b64 = btoa(bin);
        imagens.push({
          role: c.tag,
          angulo: t.replace("foto_", "").replace("_url", ""),
          dataUrl: `data:image/jpeg;base64,${b64}`,
        });
      }
    }

    if (imagens.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma foto disponível para análise visual" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const deltaPeso = (Number(depois.peso_kg) - Number(antes.peso_kg)).toFixed(1);
    const deltaBF = (depois.bf_percentual && antes.bf_percentual)
      ? (Number(depois.bf_percentual) - Number(antes.bf_percentual)).toFixed(1)
      : null;

    const dadosTxt =
`DADOS NUMÉRICOS REAIS DO ATLETA (use EXATAMENTE estes valores, NÃO invente):
ANTES (${antes.data_checkin}): peso ${antes.peso_kg}kg${antes.bf_percentual ? `, BF ${antes.bf_percentual}%` : ""}
DEPOIS (${depois.data_checkin}): peso ${depois.peso_kg}kg${depois.bf_percentual ? `, BF ${depois.bf_percentual}%` : ""}
VARIAÇÃO PESO: ${deltaPeso}kg${deltaBF ? ` | VARIAÇÃO BF: ${deltaBF}%` : ""}

FOTOS ENVIADAS (em ordem):
${imagens.map((i, idx) => `${idx + 1}. ${i.role.toUpperCase()} - ${i.angulo}`).join("\n")}`;

    const systemPrompt = `Você é um Coach especialista em finalização de atletas (cutting, pré-contest) e emagrecimento, com olho clínico para composição corporal e estética.

REGRAS ABSOLUTAS:
1. Sua análise DEVE se basear EXCLUSIVAMENTE no que você OBSERVA nas fotos enviadas E nos números reais fornecidos. NÃO INVENTE dados, datas, medidas ou cenários hipotéticos.
2. Se as fotos forem de baixa qualidade, mal iluminadas ou em ângulos ruins, DIGA isso explicitamente e analise apenas o que conseguir ver.
3. Compare visualmente ANTES vs DEPOIS para cada ângulo disponível: observe definição muscular, retenção hídrica, vascularização, postura, simetria, gordura abdominal/lombar/flancos, separação muscular, condição da pele.
4. Cruze a observação visual com a variação numérica de peso/BF informada. Se houver discrepância (ex: perdeu peso mas parece mais "achatado"), aponte hipóteses (perda de massa magra, glicogênio, retenção).
5. Linguagem: técnica de coach, direta, sem enrolação, sem clichês motivacionais genéricos. Trate como atleta sério.
6. Estruture em: VEREDITO VISUAL, PONTOS FORTES, PONTOS A CORRIGIR, RECOMENDAÇÃO TÁTICA (treino/dieta/cardio/sódio/água), PRÓXIMO CHECK-IN.
7. Seja objetivo: 4 a 6 parágrafos curtos no total. Sem markdown pesado, use texto corrido com títulos em CAIXA ALTA.`;

    const userContent: any[] = [{ type: "text", text: dadosTxt }];
    for (const img of imagens) {
      userContent.push({ type: "text", text: `--- ${img.role.toUpperCase()} / ${img.angulo} ---` });
      userContent.push({ type: "image_url", image_url: { url: img.dataUrl } });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro na IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const analise = aiJson.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({
      analise,
      meta: {
        peso_antes: antes.peso_kg,
        peso_depois: depois.peso_kg,
        delta_peso: deltaPeso,
        bf_antes: antes.bf_percentual,
        bf_depois: depois.bf_percentual,
        delta_bf: deltaBF,
        fotos_analisadas: imagens.length,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("Erro:", e);
    return new Response(JSON.stringify({ error: e.message || "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
