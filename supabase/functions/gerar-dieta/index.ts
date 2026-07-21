import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const parseJsonContent = (content: string) => {
  try {
    return JSON.parse(content || "{}");
  } catch {
    const m = String(content || "").match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  }
};

type TacoFood = {
  nome: string;
  energia_kcal: number | null;
  proteina_g: number | null;
  carboidrato_g: number | null;
  lipideos_g: number | null;
};

type MacroTotals = {
  kcal: number;
  proteina_g: number;
  carboidrato_g: number;
  lipideos_g: number;
};

const emptyTotals = (): MacroTotals => ({ kcal: 0, proteina_g: 0, carboidrato_g: 0, lipideos_g: 0 });

const addTotals = (a: MacroTotals, b: MacroTotals): MacroTotals => ({
  kcal: a.kcal + b.kcal,
  proteina_g: a.proteina_g + b.proteina_g,
  carboidrato_g: a.carboidrato_g + b.carboidrato_g,
  lipideos_g: a.lipideos_g + b.lipideos_g,
});

const roundTotals = (t: MacroTotals): MacroTotals => ({
  kcal: Math.round(t.kcal),
  proteina_g: Math.round(t.proteina_g),
  carboidrato_g: Math.round(t.carboidrato_g),
  lipideos_g: Math.round(t.lipideos_g),
});

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const STOP_WORDS = new Set([
  "de", "da", "do", "das", "dos", "com", "sem", "para", "por", "em", "no", "na", "um", "uma", "e", "ou",
  "cozido", "cozida", "cozidos", "cozidas", "grelhado", "grelhada", "desfiado", "desfiada", "inteiro", "inteira",
  "media", "medio", "grande", "pequeno", "baixo", "menor", "teor", "acucar", "tempero", "temperar", "recheio",
]);

const FOOD_ALIASES: Array<{ terms: string[]; target: string }> = [
  { terms: ["pao de forma", "paes de forma"], target: "pao de forma" },
  { terms: ["pao frances", "frances"], target: "pao frances" },
  { terms: ["goma de tapioca", "tapioca"], target: "tapioca" },
  { terms: ["cuscuz"], target: "cuscuz de milho" },
  { terms: ["banana nanica", "banana"], target: "banana nanica" },
  { terms: ["mamao papaia", "mamao"], target: "mamao" },
  { terms: ["abacate"], target: "abacate" },
  { terms: ["laranja"], target: "laranja" },
  { terms: ["mexerica", "tangerina"], target: "tangerina" },
  { terms: ["uva"], target: "uva" },
  { terms: ["ameixa"], target: "ameixa" },
  { terms: ["ovo mexido", "ovos mexidos", "ovo", "ovos"], target: "ovo de galinha inteiro cozido" },
  { terms: ["queijo branco", "queijo minas", "minas frescal", "queijo"], target: "queijo minas frescal" },
  { terms: ["arroz branco", "arroz"], target: "arroz branco cozido" },
  { terms: ["feijao carioca", "feijao"], target: "feijao carioca cozido" },
  { terms: ["peito de frango", "frango desfiado", "frango"], target: "frango peito grelhado" },
  { terms: ["carne magra", "carne bovina", "patinho"], target: "patinho grelhado" },
  { terms: ["azeite", "azeite de oliva"], target: "azeite de oliva" },
  { terms: ["doce de leite"], target: "doce de leite" },
  { terms: ["iogurte grego"], target: "iogurte grego natural" },
  { terms: ["iogurte", "iogurte natural"], target: "iogurte natural desnatado" },
  { terms: ["granola"], target: "granola" },
];

const tokenize = (value: string) => normalizeText(value).split(" ").filter((t) => t.length > 2 && !STOP_WORDS.has(t));

const scoreFoodMatch = (query: string, foodName: string) => {
  const q = normalizeText(query);
  const f = normalizeText(foodName);
  if (!q || !f) return 0;
  if (f === q) return 100;
  if (f.includes(q) || q.includes(f)) return 85;
  const qTokens = tokenize(q);
  const fTokens = new Set(tokenize(f));
  if (!qTokens.length) return 0;
  const hits = qTokens.filter((t) => fTokens.has(t)).length;
  return (hits / qTokens.length) * 70 + hits;
};

const findTacoFood = (rawName: string, foods: TacoFood[]) => {
  const normalized = normalizeText(rawName);
  if (!normalized) return null;
  const alias = FOOD_ALIASES.find((a) => a.terms.some((term) => normalized.includes(normalizeText(term))));
  const query = alias?.target || rawName;
  let best: { food: TacoFood; score: number } | null = null;
  for (const food of foods) {
    const score = scoreFoodMatch(query, food.nome);
    if (!best || score > best.score) best = { food, score };
  }
  return best && best.score >= 30 ? best.food : null;
};

const parseNumber = (value: string) => Number(String(value || "").replace(",", "."));

const defaultQuantityFor = (line: string) => {
  const n = normalizeText(line);
  if (n.includes("a vontade")) return null;
  if (n.includes("pao frances")) return 50;
  if (n.includes("pao de forma")) return 50;
  if (n.includes("banana")) return 86;
  if (n.includes("laranja") || n.includes("mexerica") || n.includes("tangerina") || n.includes("uva") || n.includes("ameixa") || /^1\s+fruta/.test(n)) return 100;
  if (n.includes("iogurte")) return 170;
  if (n.includes("granola")) return 30;
  if (n.includes("tapioca") || n.includes("goma")) return 100;
  if (n.includes("cuscuz")) return 100;
  if (n.includes("frango") || n.includes("carne")) return 100;
  if (n.includes("queijo")) return 30;
  return null;
};

const inferQuantityGrams = (line: string) => {
  const normalized = normalizeText(line);
  const explicitG = line.match(/(\d+(?:[,.]\d+)?)\s*(?:g|gramas?)\b/i);
  if (explicitG) return parseNumber(explicitG[1]);
  const explicitMl = line.match(/(\d+(?:[,.]\d+)?)\s*ml\b/i);
  if (explicitMl) return parseNumber(explicitMl[1]);
  const fatias = normalized.match(/(\d+(?:[,.]\d+)?)\s+fatias?/);
  if (fatias) {
    const unit = normalized.includes("queijo") ? 20 : 25;
    return parseNumber(fatias[1]) * unit;
  }
  const ovos = normalized.match(/(\d+(?:[,.]\d+)?)\s+ovos?/);
  if (ovos) return parseNumber(ovos[1]) * 50;
  const colheres = normalized.match(/(\d+(?:[,.]\d+)?)?\s*colher(?:es)?\s*(?:de)?\s*sopa/);
  if (colheres) {
    const count = colheres[1] ? parseNumber(colheres[1]) : 1;
    const unit = normalized.includes("azeite") ? 13 : normalized.includes("granola") ? 15 : normalized.includes("doce de leite") ? 20 : 15;
    return count * unit;
  }
  const copos = normalized.match(/(\d+(?:[,.]\d+)?)\s+copos?/);
  if (copos) return parseNumber(copos[1]) * 200;
  return defaultQuantityFor(line);
};

const cleanFoodName = (line: string) => {
  let s = String(line || "")
    .replace(/^[•\-+\s]+/, "")
    .replace(/^[0-9]{1,2}[:h][0-9]{0,2}\s*[–-]?\s*/i, "")
    .replace(/^(sobremesa|recheio)\s*:?\s*/i, "")
    .replace(/\([^)]*\b\d+(?:[,.]\d+)?\s*(?:g|ml|gramas?)\b[^)]*\)/gi, "")
    .replace(/\b\d+(?:[,.]\d+)?\s*(?:g|ml|gramas?)\b/gi, "")
    .replace(/\b\d+(?:[,.]\d+)?\s*(?:fatias?|unidades?|colheres?|colher|copos?)\b/gi, "")
    .replace(/\b(?:de|da|do)?\s*sopa\b/gi, "")
    .replace(/\b(?:copo|unidade|unidades)\b/gi, "")
    .replace(/^[\s–—-]+/, "")
    .trim();

  const parentheticalFoods = String(line || "").match(/\(([^)]*(?:banana|mam[aã]o|abacate|laranja|uva|ameixa|frango|ovos?)[^)]*)\)/i);
  if (/vitamina de fruta|\bfruta\b/i.test(s) && parentheticalFoods?.[1]) s = parentheticalFoods[1];
  s = s.split(/\s+ou\s+|\s*\/\s*/i)[0].split(",")[0].trim();
  return s;
};

const shouldIgnoreDietLine = (line: string) => {
  const n = normalizeText(line);
  return !n || /^opcao\s*[0-9a-z]*$/.test(n) || ["recheio", "sobremesa"].includes(n) || n.includes("estrategias") || n.includes("consumir de") || n.includes("processo de") || n.includes("duvida") || n.includes("abraco");
};

const splitMealOptions = (description: string) => {
  const lines = String(description || "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const hasOptionMarkers = lines.some((l) => /^op[cç][aã]o\s*[0-9a-z]*/i.test(l));
  if (!hasOptionMarkers) return [{ nome: "Base", lines }];
  const groups: Array<{ nome: string; lines: string[] }> = [];
  let current: { nome: string; lines: string[] } | null = null;
  for (const line of lines) {
    if (/^op[cç][aã]o\s*[0-9a-z]*/i.test(line)) {
      current = { nome: line.replace(/[:–—-]+$/, "").trim(), lines: [] };
      groups.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  return groups.length ? groups : [{ nome: "Base", lines }];
};

const calculateDietFromTaco = (refeicoesIn: Array<{ nome: string; descricao: string }>, foods: TacoFood[]) => {
  const refeicoes = refeicoesIn.map((ref, mealIndex) => {
    const optionGroups = splitMealOptions(ref.descricao || "");
    const opcoes = optionGroups.map((group) => {
      const itens: any[] = [];
      let totals = emptyTotals();
      for (const rawLine of group.lines) {
        if (shouldIgnoreDietLine(rawLine)) continue;
        const quantidade_g = inferQuantityGrams(rawLine);
        const alimentoBuscado = cleanFoodName(rawLine);
        const alimentoTaco = findTacoFood(alimentoBuscado, foods);
        if (!quantidade_g || !alimentoTaco) {
          itens.push({ linha: rawLine, alimento: alimentoBuscado, quantidade_g: quantidade_g || null, calculado: false });
          continue;
        }
        const factor = quantidade_g / 100;
        const itemTotals: MacroTotals = {
          kcal: Number(alimentoTaco.energia_kcal || 0) * factor,
          proteina_g: Number(alimentoTaco.proteina_g || 0) * factor,
          carboidrato_g: Number(alimentoTaco.carboidrato_g || 0) * factor,
          lipideos_g: Number(alimentoTaco.lipideos_g || 0) * factor,
        };
        totals = addTotals(totals, itemTotals);
        itens.push({
          linha: rawLine,
          alimento: alimentoBuscado,
          taco_nome: alimentoTaco.nome,
          quantidade_g: Math.round(quantidade_g),
          ...roundTotals(itemTotals),
          calculado: true,
        });
      }
      return { nome: group.nome, ...roundTotals(totals), itens };
    });
    const selected = opcoes.find((o) => /op[cç][aã]o\s*1/i.test(o.nome)) || opcoes[0] || { ...emptyTotals(), nome: "Base", itens: [] };
    return {
      nome: ref.nome || `Refeição ${mealIndex + 1}`,
      kcal: selected.kcal,
      proteina_g: selected.proteina_g,
      carboidrato_g: selected.carboidrato_g,
      lipideos_g: selected.lipideos_g,
      opcao_usada_no_total: selected.nome,
      opcoes,
    };
  });
  const totais = roundTotals(refeicoes.reduce((acc, ref) => addTotals(acc, {
    kcal: ref.kcal,
    proteina_g: ref.proteina_g,
    carboidrato_g: ref.carboidrato_g,
    lipideos_g: ref.lipideos_g,
  }), emptyTotals()));
  return { refeicoes, totais };
};

interface DietRequest {
  mode?: "generate" | "refine" | "recalc";
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
  avulso?: boolean;
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
    let targetIsAvulso = false;
    let targetTenantId: string | null = null;

    if (body.aluno_id && body.aluno_id !== user.id) {
      let { data: alunoRow } = await supabase
        .from("perfis").select("id, tenant_id").eq("id", body.aluno_id).maybeSingle();
      if (!alunoRow && body.avulso) {
        const { data: avulsoRow } = await supabase
          .from("avaliacao_avulsa_alunos")
          .select("id, tenant_id")
          .eq("id", body.aluno_id)
          .maybeSingle();
        if (avulsoRow) {
          alunoRow = avulsoRow;
          targetIsAvulso = true;
        }
      }
      if (!alunoRow) {
        return new Response(JSON.stringify({ error: "Aluno não encontrado" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetTenantId = alunoRow.tenant_id;
      // AuthZ: caller precisa ser admin global, coach do tenant do aluno, ou owner do tenant
      const [{ data: isAdmin }, { data: isCoach }, { data: tenantRow }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
        alunoRow.tenant_id
          ? supabase.rpc("has_role", { _user_id: user.id, _role: "coach", _tenant_id: alunoRow.tenant_id })
          : Promise.resolve({ data: false } as any),
        alunoRow.tenant_id
          ? supabase.from("tenants").select("owner_user_id").eq("id", alunoRow.tenant_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      const isOwner = tenantRow?.owner_user_id === user.id;
      if (!isAdmin && !isCoach && !isOwner) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetUserId = body.aluno_id;
    }

    // AuthZ: se dieta_id foi enviado, valida que pertence ao targetUserId
    if (body.dieta_id) {
      const { data: dietaRow } = await supabase
        .from("dietas").select("id, user_id").eq("id", body.dieta_id).maybeSingle();
      if (!dietaRow || dietaRow.user_id !== targetUserId) {
        return new Response(JSON.stringify({ error: "Dieta não encontrada ou sem permissão" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (mode === "recalc") {
      const refeicoesIn = body.refeicoes || [];
      if (refeicoesIn.length === 0) {
        return new Response(JSON.stringify({ error: "Nenhuma refeição para recalcular." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Carrega tabela TACO para o cálculo determinístico (fonte oficial de macros).
      // Importante: a IA NÃO faz a conta aqui, pois isso causava variação entre tentativas.
      const { data: tacoRows } = await supabase
        .from("alimentos_taco")
        .select("nome, energia_kcal, proteina_g, carboidrato_g, lipideos_g")
        .limit(2000);

      const parsed = calculateDietFromTaco(refeicoesIn, (tacoRows || []) as TacoFood[]);
      const totais = parsed.totais || { kcal: 0, proteina_g: 0, carboidrato_g: 0, lipideos_g: 0 };

      if (body.dieta_id) {
        await supabase.from("dietas").update({
          kcal_alvo: Math.round(Number(totais.kcal) || 0),
          macros_alvo: {
            proteina_g: Math.round(Number(totais.proteina_g) || 0),
            carboidrato_g: Math.round(Number(totais.carboidrato_g) || 0),
            lipideos_g: Math.round(Number(totais.lipideos_g) || 0),
            badge: "Calculado pela TACO",
          },
        }).eq("id", body.dieta_id);
      }

      return new Response(JSON.stringify({
        success: true,
        refeicoes: parsed.refeicoes || [],
        totais,
        kcal_alvo: Math.round(Number(totais.kcal) || 0),
        macros_alvo: {
          proteina_g: Math.round(Number(totais.proteina_g) || 0),
          carboidrato_g: Math.round(Number(totais.carboidrato_g) || 0),
          lipideos_g: Math.round(Number(totais.lipideos_g) || 0),
          badge: "Calculado pela TACO",
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "refine") {
      const kcalAlvo = body.kcal_alvo || 2500;
      const macros = body.macros_alvo || { proteina_g: 200, carboidrato_g: 250, lipideos_g: 60 };
      const refeicoesTxt = (body.refeicoes || []).map(r => `Refeição: ${r.nome}\nDescrição atual: ${r.descricao}`).join("\n\n");
      const coachPrompt = (body.prompt || "").trim();

      // Anamnese + perfil (peso/bf) para decisões de cutting/hipertrofia
      const [{ data: anamneseRef }, { data: perfilRef }, { data: avalRef }] = await Promise.all([
        supabase.from("anamnese_aluno")
          .select("alimentos_ama, alimentos_evita, restricoes_alimentares")
          .eq("aluno_id", targetUserId).maybeSingle(),
        supabase.from("perfis")
          .select("peso_kg, altura_cm, idade, sexo")
          .eq("id", targetUserId).maybeSingle(),
        supabase.from("avaliacoes_fisicas")
          .select("peso_kg, percentual_gordura, massa_magra_kg")
          .eq("aluno_id", targetUserId)
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      const amaR = anamneseRef?.alimentos_ama?.trim() || "";
      const evitaR = anamneseRef?.alimentos_evita?.trim() || "";
      const restR = (anamneseRef?.restricoes_alimentares || []).join(", ");
      const pesoAtual = Number(avalRef?.peso_kg || perfilRef?.peso_kg || body.peso_kg || 75);
      const bfAtual = Number(avalRef?.percentual_gordura || body.bf_pct || 0);
      const sexoAtual = (perfilRef?.sexo || body.sexo || "M").toUpperCase();

      // Detecta intenção do comando do coach
      const promptLower = coachPrompt.toLowerCase();
      const querReduzirKcal = /diminu|reduz|baix|menos calor|cut|emagrec|perder gordura|perder peso/.test(promptLower);
      const querManterProteina = /mant[eê].*prote|prote[ií]na.*mant|sem mexer.*prote/.test(promptLower) || querReduzirKcal;
      const querMaisVolume = /volume|saciedade|encher|mais comida|vegetal|legume|salada/.test(promptLower);

      // Recalcula alvos quando o coach pede cutting/redução
      let novoKcal = kcalAlvo;
      let novaProt = Number(macros.proteina_g) || Math.round(pesoAtual * 2);
      let novoCarbo = Number(macros.carboidrato_g) || 250;
      let novaGord = Number(macros.lipideos_g) || 60;

      if (querReduzirKcal) {
        // Travas: proteína em 2.0–2.4g/kg (preserva massa magra), kcal -15% a -20%, gordura mínima 0.8g/kg
        const protAlvo = Math.round(pesoAtual * 2.2);
        const gordAlvo = Math.max(Math.round(pesoAtual * 0.8), 50);
        const kcalReduzido = Math.round(kcalAlvo * 0.82); // -18%
        const carboAlvo = Math.max(Math.round((kcalReduzido - protAlvo * 4 - gordAlvo * 9) / 4), 120);
        novoKcal = protAlvo * 4 + carboAlvo * 4 + gordAlvo * 9;
        novaProt = protAlvo;
        novoCarbo = carboAlvo;
        novaGord = gordAlvo;
      } else if (querManterProteina) {
        novaProt = Math.max(novaProt, Math.round(pesoAtual * 2));
      }

      const temComando = coachPrompt.length > 0;

      const systemPrompt = `Você é um nutricionista esportivo. Sua tarefa é AJUSTAR as refeições aplicando integralmente o COMANDO DO COACH e respeitando a ANAMNESE. Se houver comando, SEMPRE faça mudanças concretas nos alimentos e/ou quantidades — NÃO devolva as mesmas descrições.

PERFIL ATUAL DO ALUNO:
- Sexo: ${sexoAtual === "M" ? "Masculino" : "Feminino"} | Peso: ${pesoAtual}kg${bfAtual ? ` | %Gordura: ${bfAtual}%` : ""}

COMANDO DO COACH (PRIORIDADE MÁXIMA — OBRIGATÓRIO APLICAR):
"${coachPrompt || "Sem comando explícito — apenas equilibrar quantidades para bater os macros."}"

${temComando ? `INSTRUÇÃO CRÍTICA: O coach DEU um comando acima. Você DEVE refletir esse comando nas refeições retornadas. É PROIBIDO devolver as mesmas descrições. Interprete o pedido (trocar alimentos, adicionar/remover itens, mudar quantidades, ajustar horários de carbo, aumentar volume, reduzir kcal, mudar fontes proteicas, alinhar com a anamnese, etc.) e APLIQUE em cada refeição que faça sentido.` : ""}

INTENÇÃO DETECTADA (heurística — só reforça, não substitui o comando acima):
${querReduzirKcal ? "- REDUZIR CALORIAS / CUTTING: macros recalculados (kcal -18%, proteína travada)." : ""}
${querManterProteina ? "- MANTER PROTEÍNA: não reduza fontes proteicas." : ""}
${querMaisVolume ? "- MAIS VOLUME: adicione legumes de baixa densidade (abobrinha, cenoura, abóbora, brócolis, couve-flor, chuchu, berinjela, vagem, espinafre, alface, tomate, pepino)." : ""}

META DE MACROS ${querReduzirKcal ? "(RECALCULADA)" : "(REFERÊNCIA)"}:
${novoKcal} kcal | Proteína: ${novaProt}g | Carbo: ${novoCarbo}g | Gordura: ${novaGord}g

ANAMNESE (RESPEITAR SEMPRE — se algum item das refeições atuais violar, TROQUE):
${amaR ? `Ama (priorize): ${amaR}` : ""}
${evitaR ? `Evita / NÃO usar (REMOVA se aparecer): ${evitaR}` : ""}
${restR ? `Restrições: ${restR}` : ""}

REGRAS:
1. Aplique o COMANDO DO COACH literalmente. Se ele pediu trocar X por Y, troque. Se pediu adicionar legumes, adicione. Se pediu alinhar à anamnese, substitua os itens conflitantes por equivalentes que o aluno aceita.
2. Bate os macros alvo. Se houve redução de kcal, ENTREGUE refeições com menos kcal.
3. PROTEÍNA é a última coisa a ser cortada — ajuste gramas para bater ${novaProt}g/dia.
4. Para reduzir kcal mantendo o prato cheio: SUBSTITUA parte do arroz/massa por legumes.
5. Almoço e jantar SEMPRE com pelo menos uma porção de vegetal cozido em cutting.
6. FIBRA: máximo 35g/dia. AVEIA: variável, nunca fixar 100g. Sem castanhas. Sem creme de arroz salvo se já existia.
7. FORMATO OBRIGATÓRIO do campo "descricao_ia" (DUAS PARTES separadas por UMA linha em branco):
   PARTE 1 — RESUMO (lista, uma linha por alimento, começando com "• "):
   • 100g de arroz branco cozido
   • 150g de abobrinha refogada
   • 120g de peito de frango grelhado

   PARTE 2 — DETALHE (parágrafo amigável com modo de preparo/contexto).
8. Retorne JSON:
{
  "refeicoes": [ { "nome": "...", "descricao_ia": "..." } ],
  "totais": { "kcal": ${novoKcal}, "proteina_g": ${novaProt}, "carboidrato_g": ${novoCarbo}, "lipideos_g": ${novaGord} }
}
na MESMA ORDEM recebida.`;

      const userPrompt = `Refeições atuais:\n\n${refeicoesTxt}`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Lovable-API-Key": LOVABLE_API_KEY || "", "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
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
      const plano = parseJsonContent(content);

      const totais = plano.totais || { kcal: novoKcal, proteina_g: novaProt, carboidrato_g: novoCarbo, lipideos_g: novaGord };

      // Persiste os novos totais sempre que a dieta foi ajustada por IA.
      if (body.dieta_id) {
        await supabase.from("dietas").update({
          kcal_alvo: Math.round(Number(totais.kcal) || novoKcal),
          macros_alvo: {
            proteina_g: Math.round(Number(totais.proteina_g) || novaProt),
            carboidrato_g: Math.round(Number(totais.carboidrato_g) || novoCarbo),
            lipideos_g: Math.round(Number(totais.lipideos_g) || novaGord),
            badge: "Ajustado pela IA",
          },
        }).eq("id", body.dieta_id);
      }

      return new Response(JSON.stringify({
        success: true,
        refeicoes: plano.refeicoes,
        totais,
        kcal_alvo: Math.round(Number(totais.kcal) || novoKcal),
        macros_alvo: {
          proteina_g: Math.round(Number(totais.proteina_g) || novaProt),
          carboidrato_g: Math.round(Number(totais.carboidrato_g) || novoCarbo),
          lipideos_g: Math.round(Number(totais.lipideos_g) || novaGord),
        },
        recalculado: querReduzirKcal,
      }), {
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

    // === FIGHT VERTICAL: detecta tenant e fase ativa ===
    const perfilFight = targetTenantId
      ? { tenant_id: targetTenantId }
      : (await supabase.from("perfis").select("tenant_id").eq("id", targetUserId).maybeSingle()).data;
    let fightVertical = false;
    let faseAtiva: any = null;
    if (perfilFight?.tenant_id) {
      const { data: tenantRow } = await supabase
        .from("tenants").select("vertical").eq("id", perfilFight.tenant_id).maybeSingle();
      fightVertical = tenantRow?.vertical === "fight";
      if (fightVertical && !targetIsAvulso) {
        const hoje = new Date().toISOString().slice(0, 10);
        const { data: fase } = await supabase
          .from("fight_nutrition_fases")
          .select("fase, kcal_meta, proteina_g, carboidrato_g, lipideos_g, peso_meta_kg, data_inicio, data_fim, observacoes")
          .eq("aluno_id", targetUserId)
          .lte("data_inicio", hoje).gte("data_fim", hoje)
          .order("data_inicio", { ascending: false }).limit(1).maybeSingle();
        faseAtiva = fase || null;
      }
    }

    // Override de macros pela fase ativa (mantém regra de proteção)
    let kcalFinal = kcalAlvo;
    let protFinal = proteinaG;
    let carboFinal = carboG;
    let gordFinal = gorduraG;
    let fightBadge: string | null = null;
    let fightBlock = "";

    if (fightVertical) {
      const faseNome = faseAtiva?.fase || "off_season";
      const faseLabel: Record<string, string> = {
        off_season: "Off-Season / Foco em Força e Hipertrofia Limpa",
        pre_camp: "Pré-Camp / Foco em Performance Energética",
        weight_cut: "Weight Cut / Corte de Peso Guiado",
        fight_day: "Fight Day / Combustível de Alta Digestibilidade",
      };
      fightBadge = `Fase: ${faseLabel[faseNome] || faseNome}`;

      // Override de cálculo por fase (usa valores do coach quando existirem)
      let fatorFase = 1.0;
      if (faseNome === "off_season") fatorFase = 1.08;
      else if (faseNome === "pre_camp") fatorFase = 0.93;
      else if (faseNome === "weight_cut") fatorFase = 0.83;
      else if (faseNome === "fight_day") fatorFase = 0.95;

      const kcalManutencao = Math.round(tmb * fa);
      kcalFinal = faseAtiva?.kcal_meta ?? Math.round(kcalManutencao * fatorFase);

      // Travas de macros para lutadores
      const protMinKg = 2.2, protMaxKg = 2.6, gordMinKg = 0.8;
      protFinal = faseAtiva?.proteina_g ?? Math.min(Math.max(Math.round(peso * 2.4), Math.round(peso * protMinKg)), Math.round(peso * protMaxKg));
      gordFinal = faseAtiva?.lipideos_g ?? Math.max(Math.round(peso * gordMinKg), 50);
      carboFinal = faseAtiva?.carboidrato_g ?? Math.max(Math.round((kcalFinal - protFinal * 4 - gordFinal * 9) / 4), 80);

      fightBlock = `

==== CONTEXTO DE COMBATE E ALTA PERFORMANCE DE LUTAS (PRIORIDADE ABSOLUTA) ====
Atleta de esportes de combate. Fase ATIVA: ${faseNome.toUpperCase()} (${faseAtiva?.data_inicio || "?"} → ${faseAtiva?.data_fim || "?"}).
${faseAtiva?.peso_meta_kg ? `Meta de peso: ${faseAtiva.peso_meta_kg}kg.` : ""}
${faseAtiva?.observacoes ? `Observações do técnico: ${faseAtiva.observacoes}` : ""}

1. DIRETRIZES DA FASE (OVERRIDE):
- off_season: superávit leve (+8%). Força/hipertrofia limpa. Creatina 5g/dia.
- pre_camp: manutenção/déficit leve (-5% a -10%). 60% do carbo total do dia CONCENTRADO na janela peri-treino (pré + pós).
- weight_cut: déficit controlado (-15% a -18%). ZERE lactose e fibras insolúveis (feijão, aveia em excesso, cascas, crucíferos como brócolis/couve-flor/repolho). Reduza sódio nos últimos 3 dias. Remova creatina se <2 semanas da pesagem.
- fight_day: alimentos de altíssimo IG e digestão fácil (creme de arroz, mel, banana madura, frutas sem casca), baixíssima fibra, whey isolado.

2. TRAVAS DE MACROS PARA LUTADORES:
- Proteína: 2.2 a 2.6 g/kg (preservação de massa magra em déficit).
- Gordura: nunca abaixo de 0.8 g/kg (saúde hormonal e SNC).
- Carboidrato: preenche o restante, priorizando performance energética.

3. TIMING DE REFEIÇÃO (CRÍTICO — luta tem pancada/queda/compressão):
- Refeição PRÉ-treino/sparring: agende SEMPRE entre 90 e 120 minutos ANTES da atividade principal. Carbo de rápida absorção + proteína leve. ZERO fibras densas. Se a refeição contém sólidos, respeite os 90–120min rigorosamente.
- Refeição PÓS-treino/sparring (janela de recuperação): carbo simples + whey isolado/concentrado em até 30 minutos após o término.
- Distribua os "horario" das refeições coerentemente com essa janela (assuma treino principal 17:00–19:00 se não houver info).

4. ALIMENTOS BANIDOS na fase weight_cut (NÃO INCLUIR): feijão, lentilha, grão-de-bico, aveia >30g, brócolis, couve-flor, repolho, cascas, farelos, leite/queijo/iogurte (lactose), refrigerante, ultraprocessados. Sódio reduzido.

5. TAG CLÍNICA (obrigatório retornar):
No JSON, inclua o campo "tag_clinica" no nível raiz com EXATAMENTE: "${fightBadge}"`;
    }

    // 1. Anamnese do aluno (PRIORIDADE MÁXIMA na escolha de alimentos)
    const { data: anamnese } = targetIsAvulso
      ? ({ data: null } as any)
      : await supabase
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

META DE MACROS (calculada a partir do perfil acima${fightVertical ? " + fase de combate ativa" : ""}):
${kcalFinal} kcal | Proteína: ${protFinal}g | Carboidrato: ${carboFinal}g | Gordura: ${gordFinal}g
${fightBlock}

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
Retorne JSON com o campo "refeicoes", cada item com: "nome", "horario" (HH:MM:SS), "ordem" (inteiro), "descricao_ia".

FORMATO OBRIGATÓRIO de "descricao_ia" — SEMPRE em DUAS PARTES separadas por UMA linha em branco:

PARTE 1 — RESUMO (lista enxuta dos alimentos, uma linha por item, iniciada por "• ", apenas quantidade + alimento, sem modo de preparo):
• 150g de arroz branco
• 120g de peito de frango
• 80g de feijão carioca

PARTE 2 — DETALHE (parágrafo amigável explicando a montagem, modo de preparo e dicas — como você já faria).

Não escreva justificativas longas; o resumo deve ser direto para o aluno objetivo, e o detalhe atende ao aluno que quer contexto.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Lovable-API-Key": LOVABLE_API_KEY || "", "Content-Type": "application/json" },
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
    const plano = parseJsonContent(aiData.choices?.[0]?.message?.content || "{}");

    if (targetIsAvulso) {
      return new Response(JSON.stringify({
        success: true,
        avulso: true,
        refeicoes: plano.refeicoes || [],
        kcal_alvo: kcalFinal,
        macros_alvo: {
          proteina_g: protFinal,
          carboidrato_g: carboFinal,
          lipideos_g: gordFinal,
          ...(fightBadge ? { badge: fightBadge, fase: faseAtiva?.fase || null } : {}),
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: dieta, error: dietaErr } = await supabase
      .from("dietas")
      .insert({
        user_id: targetUserId,
        objetivo,
        kcal_alvo: kcalFinal,
        macros_alvo: {
          proteina_g: protFinal,
          carboidrato_g: carboFinal,
          lipideos_g: gordFinal,
          ...(fightBadge ? { badge: fightBadge, fase: faseAtiva?.fase || null } : {}),
        },
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