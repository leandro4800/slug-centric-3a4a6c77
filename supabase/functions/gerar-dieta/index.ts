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

    // Refeições por nível
    const numRefeicoes = nivel.includes("alto") ? "6 a 7"
      : nivel.includes("avan") ? "5 a 6"
      : "4 a 5";

    // 1. TMB (Mifflin-St Jeor)
    const tmb = sexo === "M"
      ? 10 * peso + 6.25 * altura - 5 * idade + 5
      : 10 * peso + 6.25 * altura - 5 * idade - 161;
    const gcd = tmb * fa;
    const ajusteBase = objetivo === "cutting" ? -400 : objetivo === "hipertrofia" ? 350 : 0;
    // Atleta de alto nível em hipertrofia precisa de mais superávit
    const ajuste = nivel.includes("alto") && objetivo === "hipertrofia" ? ajusteBase + 200 : ajusteBase;
    const kcalAlvo = Math.round(gcd + ajuste);

    // Macros baseados na proporção 45/35/20 (Carboidrato/Proteína/Gordura)
    const carboG = Math.round((kcalAlvo * 0.45) / 4);
    const proteinaG = Math.round((kcalAlvo * 0.35) / 4);
    const gorduraG = Math.round((kcalAlvo * 0.20) / 9);

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

    const systemPrompt = `Você é DR. IA NUTRI, Estrategista Nutricional de Performance — Seguindo a Metodologia Fabrício Pacholok.
Use EXCLUSIVAMENTE alimentos da tabela TACO fornecida (use os IDs exatos).

═══════════════════════════════════════════════
REGRAS INVIOLÁVEIS:
═══════════════════════════════════════════════
1. Equilíbrio de Macros: Siga estritamente a proporção de 45% Carboidratos, 35% Proteínas e 20% Gorduras.
2. Proibição de Redundância: É proibido repetir fontes de gordura do mesmo tipo na mesma refeição (ex: não usar amendoim + pasta de amendoim).
3. Café da Manhã de Elite: Proibido carbo simples de alto índice glicêmico ou 'bombas de açúcar' (como sucos) logo ao acordar. Priorize carbo complexo e proteína.
4. Volume Humano: Limite as quantidades de fontes de carbo (arroz/batata) a níveis realistas (seguir o calculo de 45% de carbo por refeição). Nao colocar mais do que 1 tipo de carbo, proteína e gordura por refeição. Se precisar de mais calorias, aumente a densidade calórica ou o número de refeições, não apenas o volume de um único prato.
5. Fidelidade Visual: Retorne descrições de imagens que correspondam EXATAMENTE aos alimentos descritos. Se a refeição é sólida (frango/arroz), a descrição não pode sugerir um shake. Use o campo "descricao_ia".

═══════════════════════════════════════════════
NUTRIENT TIMING (JANELA DE PERFORMANCE) — OBRIGATÓRIO
═══════════════════════════════════════════════
- Identifique as 3 refeições que cercam o treino: PRÉ-TREINO, INTRA/LANCHE PÓS-IMEDIATO e PÓS-TREINO (refeição sólida).
- Concentre ~60% dos CARBOIDRATOS DIÁRIOS nessas 3 refeições.
- PRÉ e PÓS imediato: REDUZA gorduras (<10g) e fibras (<5g) para acelerar esvaziamento gástrico.
- Refeições longe do treino: priorize carbos de baixo IG (aveia, batata-doce, arroz integral) + fibras + gorduras boas.

═══════════════════════════════════════════════
PROTEÍNA ROTATIVA (ANTI-MONOTONIA + BIODISPONIBILIDADE)
═══════════════════════════════════════════════
- MÍNIMO 3 fontes proteicas DISTINTAS no dia (ex: ovos, frango, carne vermelha, peixe, whey).
- PROIBIDO repetir a mesma fonte proteica em mais de 2 refeições consecutivas.

═══════════════════════════════════════════════
FIBRAS E HIDRATAÇÃO (SAÚDE SISTÊMICA)
═══════════════════════════════════════════════
- META FIBRAS: ${fibrasMin}g a ${fibrasMax}g/dia. Distribuídas em refeições FORA da janela do treino.
- HIDRATAÇÃO: ${hidratacaoMl}ml/dia (50ml × ${peso}kg).

═══════════════════════════════════════════════
NUTRIÇÃO FUNCIONAL (BASEADA EM LAUDOS CLÍNICOS)
═══════════════════════════════════════════════
${alertasNutricionais.length > 0 ? alertasNutricionais.map(a => `- ${a}`).join("\n") : "- Nenhum alerta clínico relevante. Foco em performance pura."}
- Se houver deficiência (Vit D, Ferro, Magnésio): priorize alimentos ricos no nutriente em falta.
- Documente cada ajuste em "observacoes_clinicas".

═══════════════════════════════════════════════
5. ESTRUTURA POR NÍVEL DO ATLETA: ${nivel.toUpperCase()}
═══════════════════════════════════════════════
- Iniciante: Refeições simples, foco em aderência.
- Intermediário: Variedade moderada + timing nutricional básico.
- Avançado: Timing preciso, ciclagem de carboidratos, fontes magras em todas as refeições.
- Atleta de Alto Nível (Pacho): Precisão absoluta, controle de sódio/potássio para densidade muscular, refeições pré/intra/pós meticulosas, alimentos de fácil digestão em horários estratégicos.

DISTRIBUIR EM ${numRefeicoes} REFEIÇÕES atingindo as metas de macros. Quantidades em GRAMAS realistas.
Retorne APENAS JSON válido, sem markdown.

FORMATO OBRIGATÓRIO:
{
  "observacoes_clinicas": "string descrevendo ajustes nutricionais funcionais aplicados",
  "ajuste_clinico_badge": "string curta tipo 'Anti-inflamatório' / 'Anemia' / 'Vitamina D' ou null",
  "recomendacao_hidratacao": "${hidratacaoMl}ml/dia distribuídos em ...",
  "fibras_alvo_g": ${Math.round((fibrasMin + fibrasMax) / 2)},
  "estrategia_timing": "string descrevendo qual refeição é PRÉ/PÓS treino e como os carbos foram distribuídos",
  "refeicoes": [
    {
      "nome": "Café da Manhã",
      "horario": "07:00",
      "ordem": 1,
      "tag_timing": "longe_treino",
      "descricao_ia": "Ovos mexidos com batata doce cozida e abacate fatiado (exemplo sólido)",
      "itens": [
        { "alimento_id": "uuid-da-tabela", "quantidade_g": 100, "substituicoes": "sugestão livre opcional" }
      ]
    }
  ]
}`;

    const userPrompt = `META: ${kcalAlvo} kcal | P:${proteinaG}g C:${carboG}g G:${gorduraG}g
OBJETIVO: ${objetivo}
DADOS DO ATLETA: Sexo ${sexo} · ${idade} anos · ${peso}kg · ${altura}cm · Nível ${nivel}
COMPOSIÇÃO CORPORAL: ${composicaoTxt}
HORÁRIO DO TREINO (presumido): ${nivel.includes("alto") || nivel.includes("avan") ? "17:00-19:00" : "manhã ou tarde — você decide e marque tag_timing"}
DEFICIÊNCIAS CLÍNICAS: ${deficienciasTxt}
ALERTAS NUTRICIONAIS DETECTADOS: ${alertasNutricionais.join(" | ") || "nenhum"}
RESUMO CLÍNICO: ${ultimaAnalise?.resumo_clinico || "Nenhum exame disponível"}

ALIMENTOS DISPONÍVEIS (id|nome|categoria|kcal|P|C|G por 100g):
${alimentosLista}

Gere o plano em JSON aplicando Nutrient Timing, Proteína Rotativa, metas de Fibras (${fibrasMin}-${fibrasMax}g) e Hidratação (${hidratacaoMl}ml).`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp",
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
