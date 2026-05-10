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
      .select("horario_treino, nivel_atividade_diaria, alimentos_basicos_casa, cafe_lanche_habitual, proteinas_consumidas, frutas_vegetais_preferidos, horario_almoco, horario_jantar, alimentos_ama, alimentos_evita, restricoes_alimentares, suplementos")
      .eq("aluno_id", targetUserId)
      .maybeSingle();

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
NUTRIENT TIMING — HORÁRIO DE TREINO DO ATLETA
═══════════════════════════════════════════════
- O atleta TREINA NA JANELA: ${horarioTreino.label} (${horarioTreino.janela}).
- PRÉ-TREINO (refeição ~30-60min antes, por volta de ${horarioTreino.pre}): carbo de médio/alto IG + proteína magra, baixa gordura (<10g) e baixa fibra (<5g). Ex.: banana + whey, pão + ovos, mingau de aveia + whey.
- PÓS-TREINO IMEDIATO (até 30min após, por volta de ${horarioTreino.pos}): **OBRIGATÓRIO PRIORIZAR WHEY PROTEIN** como fonte proteica principal por absorção rápida. Combine com carbo de alto IG (banana, mel, dextrose, arroz branco, batata inglesa). Mantenha gordura mínima (<5g) e fibra <3g.
- Se houver refeição sólida pós-treino (~60-90min depois), priorize proteína magra + carbo + vegetais.
- Marque corretamente "tag_timing" como: "pre_treino", "pos_treino_imediato", "pos_treino_solido" ou "longe_treino".

═══════════════════════════════════════════════
SALADA À VONTADE (ALMOÇO E JANTAR)
═══════════════════════════════════════════════
- Em TODA refeição de ALMOÇO (~${horarioAlmoco}) e JANTAR (~${horarioJantar}), inclua OBRIGATORIAMENTE uma orientação de "salada de folhas verdes e vegetais crus À VONTADE / a gosto" — não conte essas calorias no fechamento dos macros (volume livre).
- Use o campo "salada_livre": true nessas refeições e descreva exemplos no "descricao_ia" (ex.: alface, rúcula, agrião, tomate, pepino, cenoura ralada, beterraba).

═══════════════════════════════════════════════
PREFERÊNCIAS ALIMENTARES DO ATLETA (ANAMNESE)
═══════════════════════════════════════════════
- Alimentos básicos em casa: ${prefAlimentos.basicos || "não informado"}
- Café da manhã / lanche habitual: ${prefAlimentos.cafe_lanche || "não informado"}
- Proteínas que costuma consumir: ${prefAlimentos.proteinas || "não informado"}
- Frutas/vegetais preferidos: ${prefAlimentos.frutas_veg || "não informado"}
- AMA: ${prefAlimentos.ama || "—"} | EVITA: ${prefAlimentos.evita || "—"}
- Restrições/Alergias: ${prefAlimentos.restricoes || "nenhuma"}
- Suplementos disponíveis: ${prefAlimentos.suplementos || "nenhum"}
- PRIORIZE alimentos que o atleta JÁ TEM EM CASA e CONSOME REGULARMENTE para garantir aderência. Use os "AMA" sempre que possível e NUNCA inclua os "EVITA" ou os listados em restrições.

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
      "salada_livre": false,
      "itens": [
        { "alimento_id": "uuid-da-tabela", "quantidade_g": 100, "substituicoes": "sugestão livre opcional" }
      ]
    }
  ]
}`;

    const userPrompt = `META: ${kcalAlvo} kcal | P:${proteinaG}g C:${carboG}g G:${gorduraG}g
ESTRATÉGIA CALÓRICA: ${estrategiaCalorica}
OBJETIVO: ${objetivo}
DADOS DO ATLETA: Sexo ${sexo} · ${idade} anos · ${peso}kg · ${altura}cm · Nível ${nivel}
COMPOSIÇÃO CORPORAL: ${composicaoTxt}
HORÁRIO DO TREINO (anamnese): ${horarioTreino.label} — janela ${horarioTreino.janela}. Pré ~${horarioTreino.pre}, pós imediato ~${horarioTreino.pos}. PRIORIZE WHEY no pós-treino imediato.
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
        model: "google/gemini-2.5-flash",
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
