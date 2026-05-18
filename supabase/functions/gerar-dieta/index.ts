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

      const userPrompt = `Abaixo estão as refeições atuais. Ajuste-as para bater os macros alvo.${body.prompt ? `\n\nINSTRUÇÕES ADICIONAIS: ${body.prompt}` : ""}\n\n${refeicoesTxt}`;

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

    const refDia = body.refeicoes_dia || 4;

    // 1. Anamnese do aluno (PRIORIDADE MÁXIMA na escolha de alimentos)
    const { data: anamnese } = await supabase
      .from("anamnese_aluno")
      .select("alimentos_ama, alimentos_evita, restricoes_alimentares, suplementos, refeicoes_dia")
      .eq("aluno_id", targetUserId)
      .maybeSingle();

    const alimentosAma = anamnese?.alimentos_ama?.trim() || "";
    const alimentosEvita = anamnese?.alimentos_evita?.trim() || "";
    const restricoes = (anamnese?.restricoes_alimentares || []).join(", ");
    const suplementos = (anamnese?.suplementos || []).join(", ");

    // 2. Templates de cardápio de referência para o nível e quantidade de refeições
    const nivelTemplate = nivel.includes("alto") || nivel.includes("avan")
      ? "avancado"
      : nivel.includes("inter") ? "intermediario" : "iniciante";

    const { data: menuTemplates } = await supabase
      .from("menu_templates")
      .select("name, meal_count, meal_structure")
      .eq("level", nivelTemplate)
      .eq("meal_count", refDia)
      .limit(3);

    const templatesTxt = (menuTemplates || []).length > 0
      ? (menuTemplates || []).map((t: any) => {
          const refs = (t.meal_structure || []).map((r: any) =>
            `  - ${r.nome}: ${(r.itens || []).join(", ")}`
          ).join("\n");
          return `MODELO: ${t.name}\n${refs}`;
        }).join("\n\n")
      : "(sem modelo específico — use variedade de alimentos brasileiros)";

    // 3. Lista TACO de apoio
    const { data: alimentos } = await supabase
      .from("alimentos_taco")
      .select("nome, energia_kcal, proteina_g, carboidrato_g, lipideos_g")
      .limit(100);
    const alimentosLista = (alimentos || []).map(a => `${a.nome} (kcal:${a.energia_kcal}, P:${a.proteina_g}, C:${a.carboidrato_g}, G:${a.lipideos_g})`).join("\n");

    const systemPrompt = `Você é um nutricionista esportivo experiente. Monte uma dieta com ${refDia} refeições.

PERFIL DO ALUNO:
- Sexo: ${sexo === "M" ? "Masculino" : "Feminino"}
- Peso: ${peso}kg • Altura: ${altura}cm • Idade: ${idade}
- Nível: ${nivelTemplate}
- Objetivo: ${objetivo}

META DE MACROS (calculada a partir do perfil acima):
${kcalAlvo} kcal | Proteína: ${proteinaG}g | Carboidrato: ${carboG}g | Gordura: ${gorduraG}g

==== PRIORIDADE 1 — ANAMNESE DO ALUNO (REGRA SUPREMA) ====
A escolha dos alimentos DEVE respeitar a anamnese antes de qualquer outra regra.
${alimentosAma ? `ALIMENTOS QUE O ALUNO AMA (use prioritariamente, especialmente nas refeições onde fizerem sentido): ${alimentosAma}` : "Aluno não declarou alimentos preferidos."}
${alimentosEvita ? `ALIMENTOS QUE O ALUNO EVITA / NÃO GOSTA (NUNCA inclua): ${alimentosEvita}` : ""}
${restricoes ? `RESTRIÇÕES ALIMENTARES: ${restricoes}` : ""}
${suplementos ? `SUPLEMENTOS QUE USA: ${suplementos} (use whey/creatina nas refeições adequadas se citado)` : ""}

Se o aluno declarou um alimento favorito para uma refeição específica (ex.: "no café da manhã gosto de tapioca com ovo"), MONTE essa refeição com esses alimentos. Só substitua se houver restrição de saúde ou inviabilidade nutricional gritante — e justifique no texto.

==== PRIORIDADE 2 — VARIEDADE / MODELOS DE REFERÊNCIA ====
Use estes modelos do nível "${nivelTemplate}" como inspiração de VARIEDADE de cardápio (NÃO copie literalmente — combine com a anamnese):
${templatesTxt}

Cafés da manhã NÃO precisam ter aveia. Varie entre opções como: tapioca + ovo, pão integral + ovo, iogurte + fruta + granola, panqueca de aveia/banana, omelete + fruta, etc. Use o que combina com o que o aluno ama.

==== PRIORIDADE 3 — REGRAS NUTRICIONAIS ====
1. FIBRA: máximo 35g/dia distribuídos entre refeições.
2. AVEIA: a quantidade NÃO é fixa. Calcule conforme sexo, peso, objetivo e meta de carbo da refeição.
   - Mulher cutting: 20–40g por porção.
   - Mulher hipertrofia: 30–60g.
   - Homem cutting: 30–50g.
   - Homem hipertrofia leve/moderado: 40–80g.
   - Homem bulking pesado (>90kg): pode chegar a 100g.
   - LIMITE ABSOLUTO: 100g por refeição. NUNCA fixar 100g por padrão.
3. CREME DE ARROZ: use APENAS quando o carboidrato necessário no café da manhã ultrapassar o que a aveia pode entregar (acima de 80g de carbo só de cereal) E o aluno fizer bulking/alto volume. NÃO combine creme de arroz + aveia automaticamente. Se aveia bastar, use só aveia. Se o aluno preferir tapioca/pão/banana, use a preferência dele.
4. DIGESTÃO: em bulking de alto volume, priorize fontes de fácil digestão (arroz branco, batata, banana), respeitando a fibra.
5. GORDURAS:
   - NUNCA use castanhas (custo elevado).
   - Cutting: priorize ovos, iogurte, pasta de amendoim controlada, abacate.
   - Bulking/hipertrofia: ovos, pasta de amendoim, queijo, banana + aveia.

ALIMENTOS DE REFERÊNCIA (TACO, apoio nutricional):
${alimentosLista}

INSTRUÇÕES ADICIONAIS DO COACH (sobrepõem regras gerais, exceto a anamnese): ${body.prompt || "Nenhuma"}

REGRAS DE SAÍDA:
Retorne JSON com o campo "refeicoes", cada item com: "nome", "horario" (HH:MM:SS), "ordem" (inteiro), "descricao_ia" (texto amigável com quantidades EXATAS em gramas/ml). Não escreva justificativas longas dentro de descricao_ia — só a montagem da refeição.`;

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