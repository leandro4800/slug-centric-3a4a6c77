import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DietRequest {
  mode?: "generate" | "refine";
  objetivo?: string;
  peso_kg?: number;
  altura_cm?: number;
  idade?: number;
  sexo?: string;
  nivel_atividade?: number;
  nivel?: string;
  bf_pct?: number;
  pescoco_cm?: number;
  cintura_cm?: number;
  quadril_cm?: number;
  refeicoes_dia?: number;
  prompt?: string;
  aluno_id?: string;
  dieta_id?: string;
  kcal_alvo?: number;
  macros_alvo?: any;
  refeicoes?: Array<{ nome: string, descricao: string }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await authClient.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: DietRequest = await req.json().catch(() => ({}));
    const mode = body.mode || "generate";
    let targetUserId = user.id;

    if (body.aluno_id && body.aluno_id !== user.id) {
      const { data: alunoRow } = await supabase
        .from("perfis").select("id, tenant_id").eq("id", body.aluno_id).maybeSingle();
      if (!alunoRow) {
        return new Response(JSON.stringify({ error: "Aluno não encontrado" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetUserId = body.aluno_id;
    }

    if (mode === "refine") {
      const kcalAlvo = body.kcal_alvo || 2500;
      const macros = body.macros_alvo || { proteina_g: 200, carboidrato_g: 250, lipideos_g: 60 };
      const refeicoesTxt = (body.refeicoes || []).map(r => `Refeição: ${r.nome}\nDescrição atual: ${r.descricao}`).join("\n\n");

      const systemPrompt = `Você é um nutricionista especialista.
Sua tarefa é AJUSTAR AS QUANTIDADES de uma dieta já montada para que ela atinja EXATAMENTE os macros alvo fornecidos.

META ALVO:
Kcal: ${kcalAlvo}
Proteína: ${macros.proteina_g}g
Carbo: ${macros.carboidrato_g}g
Gordura: ${macros.lipideos_g}g

REGRAS DE OURO (OBRIGATÓRIO):
1. FIBRA: Máximo de 35g de fibra por dia. Distribua a fibra entre as refeições.
2. AVEIA: Limite máximo de 100g de aveia por refeição. Se a quantidade original for maior, substitua o excesso por CREME DE ARROZ (especialmente no café da manhã).
3. DIGESTÃO: Para volumes altos de comida, priorize alimentos de fácil digestão (arroz branco, purê de batata, etc), mas mantenha a fibra dentro do limite.
4. GORDURAS:
   - ELIMINE CASTANHAS (custo alto).
   - Se objetivo for CUTTING: Priorize ovos, iogurte, pasta de amendoim (controlada), abacate.
   - Se objetivo for BULKING: Priorize ovos, pasta de amendoim, queijo, banana + aveia.
5. Mantenha os outros alimentos citados, alterando apenas os números (quantidades) para bater os macros.
6. Retorne no mesmo formato JSON abaixo.`;

      const userPrompt = `Abaixo estão as refeições atuais. Ajuste-as para bater os macros alvo.\n\n${refeicoesTxt}`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        }),
      });

      if (!aiResp.ok) {
        const txt = await aiResp.text();
        console.error("[gerar-dieta refine] AI error", aiResp.status, txt);
        if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições da IA atingido. Tente em alguns segundos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`IA falhou no refinamento (${aiResp.status}): ${txt.slice(0, 200)}`);
      }
      const aiData = await aiResp.json();
      const content = aiData.choices[0].message.content;
      const plano = JSON.parse(content);

      // O retorno esperado do JSON é { "refeicoes": [ { "nome": "...", "descricao_ia": "..." } ] }
      return new Response(JSON.stringify({ success: true, refeicoes: plano.refeicoes }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- MODO GENERATE (original) ---
    const objetivo = body.objetivo || "hipertrofia";
    const peso = Number(body.peso_kg) || 75;
    const altura = Number(body.altura_cm) || 175;
    const idade = Number(body.idade) || 28;
    const sexo = (body.sexo || "M").toUpperCase();
    const fa = Number(body.nivel_atividade) || 1.55;
    const nivel = (body.nivel || "intermediario").toLowerCase();
    
    // TMB Mifflin-St Jeor
    const tmb = sexo === "M"
      ? 10 * peso + 6.25 * altura - 5 * idade + 5
      : 10 * peso + 6.25 * altura - 5 * idade - 161;

    let gcd = tmb * fa;
    let percAjuste = 0;
    if (objetivo === "cutting") percAjuste = -0.20;
    else if (objetivo === "hipertrofia") percAjuste = 0.15;

    const kcalAlvo = Math.round(gcd * (1 + percAjuste));
    const protPorKg = nivel.includes("alto") ? 2.5 : 2.0;
    const proteinaG = Math.round(peso * protPorKg);
    const gorduraG = Math.round(peso * 0.8);
    const carboG = Math.round((kcalAlvo - (proteinaG * 4) - (gorduraG * 9)) / 4);

    const { data: alimentos } = await supabase
      .from("alimentos_taco")
      .select("nome, energia_kcal, proteina_g, carboidrato_g, lipideos_g")
      .limit(100);

    const alimentosLista = (alimentos || []).map(a => `${a.nome} (kcal:${a.energia_kcal}, P:${a.proteina_g}, C:${a.carboidrato_g}, G:${a.lipideos_g})`).join("\n");

    const systemPrompt = `Você é um nutricionista especialista. Gere uma dieta completa com ${body.refeicoes_dia || 4} refeições.
META: ${kcalAlvo} kcal | P: ${proteinaG}g | C: ${carboG}g | G: ${gorduraG}g
OBJETIVO: ${objetivo}
ALIMENTOS REFERÊNCIA:
${alimentosLista}

REGRAS:
1. Retorne um JSON com o campo "refeicoes" contendo "nome", "horario", "ordem" e "descricao_ia".
2. A "descricao_ia" deve ser amigável e conter quantidades exatas em gramas.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("[gerar-dieta generate] AI error", aiResp.status, txt);
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições da IA atingido. Tente em alguns segundos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`Falha na geração da IA (${aiResp.status}): ${txt.slice(0, 200)}`);
    }
    const aiData = await aiResp.json();
    const plano = JSON.parse(aiData.choices[0].message.content);

    const { data: dieta, error: dietaErr } = await supabase
      .from("dietas")
      .insert({
        user_id: targetUserId,
        objetivo,
        kcal_alvo: kcalAlvo,
        macros_alvo: { proteina_g: proteinaG, carboidrato_g: carboG, lipideos_g: gorduraG },
        is_published: false,
      })
      .select()
      .single();
    if (dietaErr) throw dietaErr;

    for (const ref of plano.refeicoes || []) {
      await supabase.from("refeicoes").insert({
        dieta_id: dieta.id,
        nome: ref.nome,
        horario: ref.horario,
        ordem: ref.ordem,
        descricao_ia: ref.descricao_ia
      });
    }

    return new Response(JSON.stringify({ success: true, dieta_id: dieta.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});