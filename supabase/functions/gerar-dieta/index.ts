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
  objetivo?: string; // "hipertrofia" | "cutting" | "manutencao"
  peso_kg?: number;
  altura_cm?: number;
  idade?: number;
  sexo?: string;
  nivel_atividade?: number; // 1.2 - 1.9
  nivel?: string; // "iniciante" | "intermediario" | "avancado" | "alto_nivel"
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autenticado");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error("Usuário inválido");

    const body: DietRequest = await req.json().catch(() => ({}));
    const objetivo = body.objetivo || "hipertrofia";
    const peso = Number(body.peso_kg) || 75;
    const altura = Number(body.altura_cm) || 175;
    const idade = Number(body.idade) || 28;
    const sexo = (body.sexo || "M").toUpperCase();
    const fa = Number(body.nivel_atividade) || 1.55;

    // 1. TMB (Mifflin-St Jeor)
    const tmb = sexo === "M"
      ? 10 * peso + 6.25 * altura - 5 * idade + 5
      : 10 * peso + 6.25 * altura - 5 * idade - 161;
    const gcd = tmb * fa;
    const ajuste = objetivo === "cutting" ? -400 : objetivo === "hipertrofia" ? 350 : 0;
    const kcalAlvo = Math.round(gcd + ajuste);

    // Macros
    const proteinaG = Math.round(peso * 2.0);
    const gorduraG = Math.round((kcalAlvo * 0.25) / 9);
    const carboG = Math.round((kcalAlvo - proteinaG * 4 - gorduraG * 9) / 4);

    // 2. Última análise clínica (deficiências)
    const { data: ultimaAnalise } = await supabase
      .from("analises_clinicas")
      .select("id, resumo_clinico, dados_extraidos")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: biomarcadores } = await supabase
      .from("exames_biomarcadores")
      .select("nome, valor, unidade, classificacao")
      .eq("user_id", user.id)
      .in("classificacao", ["Alerta", "Critico", "Subotimizado"])
      .limit(20);

    // 3. Alimentos disponíveis
    const { data: alimentos } = await supabase
      .from("alimentos_taco")
      .select("id, nome, categoria, energia_kcal, proteina_g, carboidrato_g, lipideos_g")
      .limit(200);

    const alimentosLista = (alimentos || []).map(a =>
      `${a.id}|${a.nome}|${a.categoria}|kcal:${a.energia_kcal}|P:${a.proteina_g}|C:${a.carboidrato_g}|G:${a.lipideos_g}`
    ).join("\n");

    const deficienciasTxt = (biomarcadores || []).map(b => `${b.nome}: ${b.valor} ${b.unidade} (${b.classificacao})`).join(", ") || "Nenhuma alteração relevante";

    const systemPrompt = `Você é DR. IA NUTRI, nutricionista esportivo especializado em fisiculturismo.
Crie um plano alimentar usando EXCLUSIVAMENTE os alimentos da tabela TACO fornecida (use os IDs exatos).

REGRAS:
1. Distribua em 5 a 6 refeições balanceadas atingindo as metas de macros.
2. Quantidades em GRAMAS realistas.
3. Se houver deficiência clínica (ex: Vitamina D baixa, Anemia/Ferro baixo, Magnésio), priorize alimentos ricos no nutriente em falta e mencione no campo "observacoes_clinicas".
4. Retorne APENAS JSON válido, sem markdown.

FORMATO OBRIGATÓRIO:
{
  "observacoes_clinicas": "string curta sobre ajustes feitos",
  "ajuste_clinico_badge": "string curta tipo 'Anemia' ou 'Vitamina D' ou null",
  "refeicoes": [
    {
      "nome": "Café da Manhã",
      "horario": "07:00",
      "ordem": 1,
      "itens": [
        { "alimento_id": "uuid-da-tabela", "quantidade_g": 100, "substituicoes": "sugestão livre opcional" }
      ]
    }
  ]
}`;

    const userPrompt = `META: ${kcalAlvo} kcal | P:${proteinaG}g C:${carboG}g G:${gorduraG}g
OBJETIVO: ${objetivo}
DEFICIÊNCIAS CLÍNICAS: ${deficienciasTxt}
RESUMO CLÍNICO: ${ultimaAnalise?.resumo_clinico || "Nenhum exame disponível"}

ALIMENTOS DISPONÍVEIS (id|nome|categoria|kcal|P|C|G por 100g):
${alimentosLista}

Gere o plano em JSON.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      throw new Error(`IA falhou: ${aiResp.status} ${t}`);
    }

    const aiData = await aiResp.json();
    let content = aiData.choices[0].message.content;
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const plano = JSON.parse(content);

    // 4. Persistir
    const { data: dieta, error: dietaErr } = await supabase
      .from("dietas")
      .insert({
        user_id: user.id,
        analise_id: ultimaAnalise?.id || null,
        objetivo,
        tmb_estimada: Math.round(tmb),
        kcal_alvo: kcalAlvo,
        macros_alvo: { proteina_g: proteinaG, carboidrato_g: carboG, lipideos_g: gorduraG, badge: plano.ajuste_clinico_badge || null },
        observacoes_clinicas: plano.observacoes_clinicas || null,
      })
      .select()
      .single();
    if (dietaErr) throw dietaErr;

    for (const ref of plano.refeicoes || []) {
      const { data: refIns, error: refErr } = await supabase
        .from("refeicoes")
        .insert({ dieta_id: dieta.id, nome: ref.nome, horario: ref.horario, ordem: ref.ordem })
        .select()
        .single();
      if (refErr) continue;
      const itens = (ref.itens || []).map((i: any) => ({
        refeicao_id: refIns.id,
        alimento_id: i.alimento_id,
        quantidade_g: Number(i.quantidade_g) || 100,
        substituicoes: i.substituicoes || null,
      }));
      if (itens.length) await supabase.from("itens_refeicao").insert(itens);
    }

    return new Response(JSON.stringify({ success: true, dieta_id: dieta.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("gerar-dieta error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
