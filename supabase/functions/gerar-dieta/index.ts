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

// MENUS_BASE removed in favor of menu_templates database table



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
    const composicaoTxt = [
      bfPct ? `BF%: ${bfPct.toFixed(1)}%` : null,
      pescoco ? `Pescoço: ${pescoco}cm` : null,
      cintura ? `Cintura: ${cintura}cm` : null,
      quadril ? `Quadril: ${quadril}cm` : null,
    ].filter(Boolean).join(" · ") || "Não informada";

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

    // Fator de atividade será definido após buscar anamnese (mais abaixo).
    // Por enquanto guardamos default; será recomputado.
    let fatorAtividade = fa;
    let nivelAtividadeDiaria = "moderado";

    // Placeholder — kcalAlvo será calculado após anamnese
    let gcd = tmb * fatorAtividade;
    let kcalAlvo = Math.round(gcd);
    let carboG = 0, proteinaG = 0, gorduraG = 0;
    let estrategiaCalorica = "";

    // 2. Última análise clínica (deficiências)
    const { data: ultimaAnalise } = await supabase
      .from("analises_clinicas")
      .select("id, resumo_clinico, dados_extraidos")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: biomarcadores } = await supabase
      .from("exames_biomarcadores")
      .select("nome, valor, unidade, classificacao")
      .eq("user_id", targetUserId)
      .in("classificacao", ["Alerta", "Critico", "Subotimizado"])
      .limit(20);

    // Buscar anamnese completa (horário treino + nível atividade + preferências alimentares)
    const { data: anamneseRow } = await supabase
      .from("anamnese_aluno")
      .select("horario_treino, nivel_atividade_diaria, alimentos_basicos_casa, cafe_lanche_habitual, proteinas_consumidas, frutas_vegetais_preferidos, horario_almoco, horario_jantar, alimentos_ama, alimentos_evita, restricoes_alimentares, suplementos, refeicoes_dia")
      .eq("aluno_id", targetUserId)
      .maybeSingle();
    
    // Se não veio no body, tenta pegar da anamnese do banco
    const finalNumRefeicoes = body.refeicoes_dia || (anamneseRow as any)?.refeicoes_dia || numRefeicoesAlvo;

    // Fator de atividade pelo nível diário (sobrepõe o padrão se houver)
    const fatorMap: Record<string, number> = {
      sedentario: 1.2, leve: 1.375, moderado: 1.55, intenso: 1.725, muito_intenso: 1.9,
    };
    nivelAtividadeDiaria = (anamneseRow as any)?.nivel_atividade_diaria || "moderado";
    fatorAtividade = fatorMap[nivelAtividadeDiaria] ?? fa;
    gcd = tmb * fatorAtividade;

    // Ajuste calórico em PERCENTUAL do GET por objetivo
    // Cutting: -20% (déficit moderado, ~500 kcal típico)
    // Hipertrofia: +12% (superávit moderado, ~10-15% acima do GET)
    // Alto nível em hipertrofia: +18% (superávit maior para máximo ganho)
    let percAjuste = 0;
    if (objetivo === "cutting") percAjuste = -0.20;
    else if (objetivo === "hipertrofia") percAjuste = nivel.includes("alto") ? 0.18 : 0.12;
    else percAjuste = 0;

    kcalAlvo = Math.round(gcd * (1 + percAjuste));
    estrategiaCalorica = `TMB ${Math.round(tmb)}kcal × FA ${fatorAtividade} (${nivelAtividadeDiaria}) = GET ${Math.round(gcd)}kcal | ${objetivo}: ${(percAjuste * 100).toFixed(0)}% → Alvo ${kcalAlvo}kcal`;

    // Macros 45/35/20 (Carbo/Proteína/Gordura) — mas garante mínimo de proteína por kg
    proteinaG = Math.max(Math.round((kcalAlvo * 0.35) / 4), Math.round(peso * protPorKg));
    gorduraG = Math.round((kcalAlvo * 0.20) / 9);
    const kcalRestante = kcalAlvo - (proteinaG * 4) - (gorduraG * 9);
    carboG = Math.max(0, Math.round(kcalRestante / 4));

    const horarioTreinoMap: Record<string, { label: string; janela: string; pre: string; pos: string }> = {
      manha_cedo: { label: "Manhã cedo (5h-7h)", janela: "05:00-07:00", pre: "04:30", pos: "07:30" },
      manha:      { label: "Manhã (7h-11h)",     janela: "07:00-11:00", pre: "06:30", pos: "10:30" },
      meio_dia:   { label: "Meio-dia (11h-14h)", janela: "11:00-14:00", pre: "10:30", pos: "13:30" },
      tarde:      { label: "Tarde (14h-17h)",    janela: "14:00-17:00", pre: "13:30", pos: "16:30" },
      fim_tarde:  { label: "Fim de tarde (17h-19h)", janela: "17:00-19:00", pre: "16:30", pos: "19:00" },
      noite:      { label: "Noite (19h-22h)",    janela: "19:00-22:00", pre: "18:30", pos: "21:30" },
    };
    const horarioKey = (anamneseRow as any)?.horario_treino || "tarde";
    const horarioTreino = horarioTreinoMap[horarioKey] || horarioTreinoMap.tarde;
    const horarioAlmoco = (anamneseRow as any)?.horario_almoco || "12:00";
    const horarioJantar = (anamneseRow as any)?.horario_jantar || "20:00";

    // Preferências alimentares do atleta
    const prefAlimentos = {
      basicos: (anamneseRow as any)?.alimentos_basicos_casa || "",
      cafe_lanche: (anamneseRow as any)?.cafe_lanche_habitual || "",
      proteinas: (anamneseRow as any)?.proteinas_consumidas || "",
      frutas_veg: (anamneseRow as any)?.frutas_vegetais_preferidos || "",
      ama: (anamneseRow as any)?.alimentos_ama || "",
      evita: (anamneseRow as any)?.alimentos_evita || "",
      restricoes: ((anamneseRow as any)?.restricoes_alimentares || []).join(", "),
      suplementos: ((anamneseRow as any)?.suplementos || []).join(", "),
    };

    // 3. Alimentos disponíveis
    const { data: alimentos } = await supabase
      .from("alimentos_taco")
      .select("id, nome, categoria, energia_kcal, proteina_g, carboidrato_g, lipideos_g")
      .limit(200);

    const alimentosLista = (alimentos || []).map(a =>
      `${a.id}|${a.nome}|${a.categoria}|kcal:${a.energia_kcal}|P:${a.proteina_g}|C:${a.carboidrato_g}|G:${a.lipideos_g}`
    ).join("\n");

    const deficienciasTxt = (biomarcadores || []).map(b => `${b.nome}: ${b.valor} ${b.unidade} (${b.classificacao})`).join(", ") || "Nenhuma alteração relevante";

    // Detectar alertas clínicos específicos para nutrição funcional
    const bioStr = ((biomarcadores || []).map(b => `${b.nome}`.toLowerCase()).join(" "));
    const alertaCPK = /cpk|creatino/.test(bioStr);
    const alertaHepatico = /alt|ast|tgp|tgo|gama|ggt/.test(bioStr);
    const alertaLipidico = /colesterol|ldl|triglic/.test(bioStr);
    const alertasNutricionais: string[] = [];
    if (alertaCPK) alertasNutricionais.push("CPK elevado → priorizar anti-inflamatórios (frutas vermelhas, ômega 3, açafrão/cúrcuma, gengibre)");
    if (alertaHepatico) alertasNutricionais.push("Função hepática alterada → fontes de gorduras boas (abacate, azeite extravirgem, castanhas) e fibras solúveis (aveia, chia)");
    if (alertaLipidico) alertasNutricionais.push("Perfil lipídico alterado → reduzir gorduras saturadas, aumentar fibras solúveis e ômega 3");

    // Hidratação meta
    const hidratacaoMl = Math.round(peso * 50);

    // Fibras meta (25-35g escalado por peso)
    const fibrasMin = Math.max(25, Math.round(peso * 0.35));
    const fibrasMax = Math.max(35, Math.round(peso * 0.45));

    // 3. Buscar modelos base na tabela menu_templates
    let levelQuery = "iniciante";
    if (nivel.includes("atleta") || nivel.includes("alto") || nivel.includes("avan")) {
      levelQuery = "avancado";
    } else if (nivel.includes("inter")) {
      levelQuery = "intermediario";
    }

    // 3. Buscar modelos base na tabela menu_templates filtrando por nível e quantidade de refeições
    const { data: menuTemplates } = await supabase
      .from("menu_templates")
      .select("name, meal_structure")
      .eq("level", levelQuery)
      .eq("meal_count", finalNumRefeicoes);
    
    // Se não achar nada com a quantidade exata, tenta apenas pelo nível
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
HORÁRIO DO TREINO: ${horarioTreino.label}

ALIMENTOS TACO (IDs):
${alimentosLista}

INSTRUÇÃO: Selecione um dos modelos ${nivel.toUpperCase()} e gere o JSON seguindo a estrutura de refeições e alimentos desse modelo, ajustando apenas as quantidades.`;

    console.log("Chamando IA com meta:", kcalAlvo, "Nível:", nivel);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${LOVABLE_API_KEY}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1, // Baixa temperatura para maior fidelidade
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("Erro na IA:", t);
      throw new Error(`IA falhou: ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    const content = aiData.choices[0].message.content;
    console.log("Resposta da IA recebida");
    const plano = JSON.parse(content);

    // 4. Persistir
    const { data: dieta, error: dietaErr } = await supabase
      .from("dietas")
      .insert({
        user_id: targetUserId,
        analise_id: ultimaAnalise?.id || null,
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
          plano.estrategia_timing ? `\n📍 Timing: ${plano.estrategia_timing}` : "",
          plano.recomendacao_hidratacao ? `\n💧 Hidratação: ${plano.recomendacao_hidratacao}` : "",
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
    console.error("gerar-dieta error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
