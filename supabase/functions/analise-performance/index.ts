// Edge function: análise de performance de evolução com IA (Lovable AI Gateway)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado", details: userErr?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Buscar dados do aluno
    const [{ data: checkins }, { data: perfilTreino }, { data: anamnese }, { data: avaliacoes }] =
      await Promise.all([
        supabase
          .from("evolucao_checkins")
          .select("data_checkin, peso_kg, bf_percentual, medida_cintura, medida_quadril, medida_braco, observacoes")
          .eq("user_id", userId)
          .order("data_checkin", { ascending: true })
          .limit(60),
        supabase.from("perfis_treino").select("*").eq("aluno_id", userId).maybeSingle(),
        supabase.from("anamnese_aluno").select("*").eq("aluno_id", userId).maybeSingle(),
        supabase
          .from("avaliacoes_fisicas")
          .select("created_at, peso_kg, bf_pct_calculado, imc, massa_magra_kg, massa_gorda_kg")
          .eq("aluno_id", userId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

    const list = checkins ?? [];
    if (list.length < 1) {
      return new Response(
        JSON.stringify({
          analise:
            "Ainda não há check-ins suficientes para uma análise de IA. Registre seu primeiro check-in com peso, BF% e fotos para ativar a análise inteligente.",
          meta: { checkins: 0 },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const first = list[0];
    const last = list[list.length - 1];
    const days = Math.max(
      1,
      Math.round(
        (new Date(last.data_checkin).getTime() - new Date(first.data_checkin).getTime()) / 86400000,
      ),
    );
    const deltaPeso =
      last.peso_kg != null && first.peso_kg != null ? Number(last.peso_kg) - Number(first.peso_kg) : null;
    const deltaBF =
      last.bf_percentual != null && first.bf_percentual != null
        ? Number(last.bf_percentual) - Number(first.bf_percentual)
        : null;
    const ritmoSemanal = deltaPeso != null ? (deltaPeso / days) * 7 : null;

    const objetivo = perfilTreino?.objetivo || "recomposição";
    const sexo = perfilTreino?.sexo || anamnese?.sexo || "n/d";
    const nivel = anamnese?.nivel_experiencia || "intermediário";

    const systemPrompt = `Você é um coach de elite (cutting/recomposição corporal) analisando a evolução de um aluno.
Seja direto, motivador e técnico. Use português BR. Máximo 4 parágrafos curtos.
Estruture: (1) diagnóstico do ritmo atual, (2) projeção realista, (3) ajuste prático (treino/dieta/sono), (4) próxima meta de check-in.
Use 1-2 emojis no máximo. Não invente dados não fornecidos.`;

    const userPrompt = `DADOS DO ALUNO
Sexo: ${sexo} | Nível: ${nivel} | Objetivo: ${objetivo}
Período analisado: ${days} dias | Check-ins: ${list.length}

VARIAÇÃO
Peso: ${first.peso_kg ?? "?"}kg → ${last.peso_kg ?? "?"}kg (Δ ${deltaPeso?.toFixed(2) ?? "?"}kg, ${ritmoSemanal?.toFixed(2) ?? "?"}kg/sem)
BF%: ${first.bf_percentual ?? "?"}% → ${last.bf_percentual ?? "?"}% (Δ ${deltaBF?.toFixed(2) ?? "?"} p.p.)
Cintura recente: ${last.medida_cintura ?? "n/d"}cm | Braço: ${last.medida_braco ?? "n/d"}cm

HISTÓRICO (últimos check-ins)
${list.slice(-10).map((c) => `${c.data_checkin}: ${c.peso_kg ?? "?"}kg, BF ${c.bf_percentual ?? "?"}%`).join("\n")}

AVALIAÇÕES FÍSICAS (recentes)
${(avaliacoes ?? []).map((a) => `${a.created_at?.slice(0, 10)}: peso ${a.peso_kg}kg, BF ${a.bf_pct_calculado}%, MM ${a.massa_magra_kg}kg`).join("\n") || "n/d"}

Gere a análise de performance agora.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI gateway ${aiRes.status}: ${t}`);
    }

    const aiJson = await aiRes.json();
    const analise = aiJson.choices?.[0]?.message?.content?.trim() || "Sem análise disponível.";

    return new Response(
      JSON.stringify({
        analise,
        meta: {
          checkins: list.length,
          dias: days,
          delta_peso: deltaPeso,
          delta_bf: deltaBF,
          ritmo_semanal_kg: ritmoSemanal,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("analise-performance error", msg);
    return new Response(JSON.stringify({ error: "Erro interno", details: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
