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
  bf_pct?: number;
  pescoco_cm?: number;
  cintura_cm?: number;
  quadril_cm?: number;
  refeicoes_dia?: number;
  prompt?: string;
  aluno_id?: string;
  tenant_id?: string;
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
    let targetUserId = user.id;
    if (body.aluno_id && body.aluno_id !== user.id) {
      const { data: alunoRow } = await supabase
        .from("alunos").select("tenant_id").eq("id", body.aluno_id).maybeSingle();
      if (!alunoRow) {
        return new Response(JSON.stringify({ error: "Aluno não encontrado" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: isCoach } = await supabase.rpc("has_role", {
        _user_id: user.id, _role: "coach", _tenant_id: alunoRow.tenant_id,
      });
      let allowed = !!isCoach;
      if (!allowed) {
        const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
        allowed = !!isAdmin;
      }
      if (!allowed) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetUserId = body.aluno_id;
    }
    const objetivo = body.objetivo || "hipertrofia";
    const peso = Number(body.peso_kg) || 75;
    const altura = Number(body.altura_cm) || 175;
    const idade = Number(body.idade) || 28;
    const sexo = (body.sexo || "M").toUpperCase();
    const fa = Number(body.nivel_atividade) || 1.55;
    const nivel = (body.nivel || "intermediario").toLowerCase();
    const bfPct = Number(body.bf_pct) || null;
    const pescoco = Number(body.pescoco_cm) || null;
    const cintura = Number(body.cintura_cm) || null;
    const quadril = Number(body.quadril_cm) || null;

    // Multiplicador de proteína por nível
    const protPorKg = nivel.includes("alto") ? 2.6
      : nivel.includes("avan") ? 2.3
      : nivel.includes("inter") ? 2.0
      : 1.6;

    // Refeições: Prioriza o que vem no body (da anamnese), senão usa default por nível
    const numRefeicoesAlvo = body.refeicoes_dia || (
      nivel.includes("alto") ? 6
      : nivel.includes("avan") ? 5
      : 4
    );

    // 1. TMB (Mifflin-St Jeor) → GET (TMB × Fator Atividade) → Ajuste % por objetivo
    const tmb = sexo === "M"
      ? 10 * peso + 6.25 * altura - 5 * idade + 5
      : 10 * peso + 6.25 * altura - 5 * idade - 161;

    let fatorAtividade = fa;
    let nivelAtividadeDiaria = "moderado";

    let gcd = tmb * fatorAtividade;
    let kcalAlvo = Math.round(gcd);
    let carboG = 0, proteinaG = 0, gorduraG = 0;
    let estrategiaCalorica = "";

    const { data: anamneseRow } = await supabase
      .from("anamnese_aluno")
      .select("horario_treino, nivel_atividade_diaria, alimentos_basicos_casa, cafe_lanche_habitual, proteinas_consumidas, frutas_vegetais_preferidos, horario_almoco, horario_jantar, alimentos_ama, alimentos_evita, restricoes_alimentares, suplementos, refeicoes_dia")
      .eq("aluno_id", targetUserId)
      .maybeSingle();
    
    const finalNumRefeicoes = body.refeicoes_dia || (anamneseRow as any)?.refeicoes_dia || numRefeicoesAlvo;

    const fatorMap: Record<string, number> = {
      sedentario: 1.2, leve: 1.375, moderado: 1.55, intenso: 1.725, muito_intenso: 1.9,
    };
    nivelAtividadeDiaria = (anamneseRow as any)?.nivel_atividade_diaria || "moderado";
    fatorAtividade = fatorMap[nivelAtividadeDiaria] ?? fa;
    gcd = tmb * fatorAtividade;

    let percAjuste = 0;
    if (objetivo === "cutting") percAjuste = -0.20;
    else if (objetivo === "hipertrofia") percAjuste = nivel.includes("alto") ? 0.18 : 0.12;
    else percAjuste = 0;

    kcalAlvo = Math.round(gcd * (1 + percAjuste));
    estrategiaCalorica = `TMB ${Math.round(tmb)}kcal × FA ${fatorAtividade} (${nivelAtividadeDiaria}) = GET ${Math.round(gcd)}kcal | ${objetivo}: ${(percAjuste * 100).toFixed(0)}% → Alvo ${kcalAlvo}kcal`;

    proteinaG = Math.max(Math.round((kcalAlvo * 0.35) / 4), Math.round(peso * protPorKg));
    gorduraG = Math.round((kcalAlvo * 0.20) / 9);
    const kcalRestante = kcalAlvo - (proteinaG * 4) - (gorduraG * 9);
    carboG = Math.max(0, Math.round(kcalRestante / 4));

    const { data: alimentos } = await supabase
      .from("alimentos_taco")
      .select("id, nome, categoria, energia_kcal, proteina_g, carboidrato_g, lipideos_g")
      .limit(200);

    const alimentosLista = (alimentos || []).map(a =>
      `${a.id}|${a.nome}|${a.categoria}|kcal:${a.energia_kcal}|P:${a.proteina_g}|C:${a.carboidrato_g}|G:${a.lipideos_g}`
    ).join("\n");

    const hidratacaoMl = Math.round(peso * 50);
    const fibrasMin = Math.max(25, Math.round(peso * 0.35));
    const fibrasMax = Math.max(35, Math.round(peso * 0.45));

    let levelQuery = "iniciante";
    if (nivel.includes("atleta") || nivel.includes("alto") || nivel.includes("avan")) {
      levelQuery = "avancado";
    } else if (nivel.includes("inter")) {
      levelQuery = "intermediario";
    }

    const { data: menuTemplates } = await supabase
      .from("menu_templates")
      .select("name, meal_structure")
      .eq("level", levelQuery)
      .eq("meal_count", finalNumRefeicoes);
    
    let finalMenuTemplates = menuTemplates;
    if (!finalMenuTemplates || finalMenuTemplates.length === 0) {
      const { data: altTemplates } = await supabase
        .from("menu_templates")
        .select("name, meal_structure")
        .eq("level", levelQuery);
      finalMenuTemplates = altTemplates;
    }

    const modelosTxt = (finalMenuTemplates || []).map((m: any, idx: number) => {
      return `MODELO ${idx + 1}: ${m.name}\n` + m.meal_structure.map((r: any) => `  - ${r.nome}: ${r.itens.join(", ")}`).join("\n");
    }).join("\n\n") || "Nenhum modelo encontrado.";

    const systemPrompt = `Você é DR. IA NUTRI, Estrategista Nutricional de Performance seguindo a Metodologia Fabrício Pacholok.
Sua missão é gerar um plano alimentar baseado RIGOROSAMENTE nos modelos base fornecidos.

═══════════════════════════════════════════════
REGRAS INVIOLÁVEIS:
═══════════════════════════════════════════════
1. ESCOLHA UM MODELO: Escolha EXCLUSIVAMENTE UM dos modelos de nível ${nivel.toUpperCase()} com ${finalNumRefeicoes} refeições fornecidos abaixo.
2. NÃO INVENTE: É expressamente proibido adicionar, remover ou substituir alimentos do modelo escolhido.
3. AJUSTE APENAS QUANTIDADES: Sua única função é definir as gramagens (quantidade_g) de cada item. Para ovos, se o modelo indicar "Ovos inteiros" e "Clara de ovo", você DEVE fornecer AMBOS com quantidades específicas (ex: 2 ovos inteiros e 60g de clara).
4. ESTRUTURA FIXA: O número de refeições deve ser RIGOROSAMENTE ${finalNumRefeicoes} e os nomes devem ser EXATAMENTE os do modelo.
5. TACO: Use os IDs da tabela TACO. Para ovos inteiros use id: 53514fca-bf4c-4bd7-bc72-57b1c3a2da94. Para claras use id: 921fa2e8-23f9-4933-a821-6544ed5c5ddf.

═══════════════════════════════════════════════
MODELOS DISPONÍVEIS PARA NÍVEL ${nivel.toUpperCase()} (${finalNumRefeicoes} REFEIÇÕES):
═══════════════════════════════════════════════
${modelosTxt}

═══════════════════════════════════════════════
REGRAS PACHOLOK ESPECÍFICAS (PARA AJUSTE DE QUANTIDADES):
═══════════════════════════════════════════════
1. Se o objetivo for Cutting, reduza carboidratos e aumente fibras/vegetais (salada_livre: true).
2. Se o objetivo for Hipertrofia, aumente carboidratos, especialmente no Pré e Pós treino.
3. Concentre ~60% dos carboidratos na janela de treino (refeições marcadas como pre_treino ou pos_treino).

═══════════════════════════════════════════════
ESTRUTURA DE RETORNO (JSON):
═══════════════════════════════════════════════
{
  "modelo_escolhido": "Nome do modelo selecionado",
  "observacoes_clinicas": "Resumo do ajuste feito",
  "ajuste_clinico_badge": "Opcional: Alerta curto",
  "recomendacao_hidratacao": "${hidratacaoMl}ml/dia",
  "fibras_alvo_g": number,
  "estrategia_timing": "Como os carbos foram distribuídos",
  "refeicoes": [
    {
      "nome": "Nome da refeição (EXATO do modelo)",
      "horario": "Horário sugerido",
      "ordem": number,
      "tag_timing": "pre_treino | pos_treino_imediato | pos_treino_solido | longe_treino",
      "descricao_ia": "Breve descrição",
      "salada_livre": boolean,
      "itens": [
        { "alimento_id": "uuid da TACO", "quantidade_g": number, "substituicoes": null }
      ]
    }
  ]
}`;

    const userPrompt = `META DIÁRIA: ${kcalAlvo} kcal | Proteína: ${proteinaG}g | Carbo: ${carboG}g | Gordura: ${gorduraG}g
OBJETIVO: ${objetivo}
DADOS DO ATLETA: Sexo ${sexo} · ${idade} anos · ${peso}kg · ${altura}cm · Nível ${nivel}
QUANTIDADE DE REFEIÇÕES DESEJADA: ${finalNumRefeicoes}
PROMPT ADICIONAL: ${body.prompt || "Nenhum"}

ALIMENTOS TACO (IDs):
${alimentosLista}

INSTRUÇÃO: Selecione um dos modelos ${nivel.toUpperCase()} que possua ${finalNumRefeicoes} refeições. Se o modelo indicar ovos no café, use ovos inteiros + claras separadamente com quantidades exatas. GERE O JSON seguindo a estrutura do modelo.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${LOVABLE_API_KEY}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-pro-exp-02-05",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      throw new Error(`IA falhou: ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    const content = aiData.choices[0].message.content;
    const plano = JSON.parse(content);

    const { data: dieta, error: dietaErr } = await supabase
      .from("dietas")
      .insert({
        user_id: targetUserId,
        objetivo,
        tmb_estimada: Math.round(tmb),
        kcal_alvo: kcalAlvo,
        macros_alvo: {
          proteina_g: proteinaG,
          carboidrato_g: carboG,
          lipideos_g: gorduraG,
          fibras_g: plano.fibras_alvo_g || Math.round((fibrasMin + fibrasMax) / 2),
          hidratacao_ml: hidratacaoMl,
          badge: plano.ajuste_clinico_badge || null,
        },
        observacoes_clinicas: [
          plano.observacoes_clinicas,
          `\n🔥 Cálculo: ${estrategiaCalorica}`,
        ].filter(Boolean).join("") || null,
      })
      .select()
      .single();
    if (dietaErr) throw dietaErr;

    for (const ref of plano.refeicoes || []) {
      const { data: refIns, error: refErr } = await supabase
        .from("refeicoes")
        .insert({ dieta_id: dieta.id, nome: ref.nome, horario: ref.horario, ordem: ref.ordem, descricao_ia: ref.descricao_ia })
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
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});