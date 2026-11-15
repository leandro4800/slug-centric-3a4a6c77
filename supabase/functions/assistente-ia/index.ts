// IA do Assistente do coach:
//  - acao "mensagem": escreve uma mensagem de WhatsApp para um alerta, usando o
//    mínimo de dados do aluno (primeiro nome, dias sem treinar, treinos recentes
//    e variação de peso). O coach sempre revisa e envia; nada vai sozinho.
//  - acao "pergunta": responde perguntas sobre o negócio chamando apenas
//    funções prontas, sempre filtradas pelo CT do coach (a IA não escreve SQL).
// Cota mensal por CT na tabela assistente_uso.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { z } from "npm:zod@3.23.8";
import { generateResponse, GatewayError } from "npm:@lovable.dev/ai-gateway@0.1.11";
import { riscoCancelamento } from "../_shared/assistente-risco.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export const LIMITE_MENSAL = 30;
const MODEL = "openai/gpt-6-astra" as const;

const Body = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("uso"), tenant_id: z.string().uuid() }),
  z.object({ acao: z.literal("mensagem"), tenant_id: z.string().uuid(), alerta_id: z.string().uuid() }),
  z.object({
    acao: z.literal("pergunta"),
    tenant_id: z.string().uuid(),
    pergunta: z.string().trim().min(2).max(500),
    historico: z
      .array(z.object({ papel: z.enum(["coach", "assistente"]), texto: z.string().max(2000) }))
      .max(10)
      .optional(),
  }),
]);

const hojeBR = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
const primeiroNome = (n?: string | null) => (n ?? "").trim().split(/\s+/)[0] || "Aluno";
const reais = (c: number) => Math.round(c) / 100;
const diasEntre = (iso: string | null) => {
  if (!iso) return null;
  const a = new Date(iso.slice(0, 10) + "T00:00:00Z").getTime();
  const b = new Date(hojeBR() + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400_000);
};

function textoDaResposta(resp: any): string {
  if (typeof resp?.output_text === "string" && resp.output_text) return resp.output_text;
  const partes: string[] = [];
  for (const item of resp?.output ?? []) {
    if (item?.type === "message") for (const c of item.content ?? []) if (c?.type === "output_text") partes.push(c.text);
  }
  return partes.join("\n").trim();
}

// ---------- Ferramentas seguras (sempre com tenant_id do coach) ----------
async function resumoFinanceiro(admin: SupabaseClient, tenant: string, mes: string) {
  const { data, error } = await admin.rpc("assistente_financeiro_mes", { p_tenant: tenant, p_mes: `${mes}-01` });
  if (error) throw error;
  const f = (data as any)?.[0] ?? {};
  const receita = Number(f.receita ?? 0);
  const despesas = Number(f.despesas ?? 0);
  return {
    mes,
    receita_bruta_reais: reais(Number(f.receita_bruta ?? 0)),
    recebido_sem_taxas_reais: reais(receita),
    despesas_reais: reais(despesas),
    lucro_reais: reais(receita - despesas),
    pagamentos: Number(f.pagos ?? 0),
    ticket_medio_reais: reais(Number(f.ticket ?? 0)),
    gasto_captacao_reais: reais(Number(f.captacao ?? 0)),
  };
}

async function alunosAtivos(admin: SupabaseClient, tenant: string) {
  const { data } = await admin
    .from("assinaturas")
    .select("aluno_id, origem, current_period_end")
    .eq("tenant_id", tenant)
    .in("status", ["active", "trialing"]);
  return data ?? [];
}

async function nomesETreino(admin: SupabaseClient, tenant: string, ids: string[]) {
  const nomes = new Map<string, string>();
  const ultimo = new Map<string, string | null>();
  for (let i = 0; i < ids.length; i += 150) {
    const part = ids.slice(i, i + 150);
    const [p, s] = await Promise.all([
      admin.from("perfis").select("id, nome_completo").in("id", part),
      admin.from("stats_treino_aluno").select("aluno_id, ultimo_treino").eq("tenant_id", tenant).in("aluno_id", part),
    ]);
    for (const x of p.data ?? []) nomes.set(x.id, primeiroNome(x.nome_completo));
    for (const x of s.data ?? []) ultimo.set(x.aluno_id, x.ultimo_treino);
  }
  return { nomes, ultimo };
}

async function alunosSumindo(admin: SupabaseClient, tenant: string, diasMin: number) {
  const ativos = await alunosAtivos(admin, tenant);
  const ids = [...new Set(ativos.map((a) => a.aluno_id))];
  const { nomes, ultimo } = await nomesETreino(admin, tenant, ids);
  const sumidos = ids
    .map((id) => ({ nome: nomes.get(id) ?? "Aluno", dias_sem_treinar: diasEntre(ultimo.get(id) ?? null) }))
    .filter((x) => x.dias_sem_treinar !== null && x.dias_sem_treinar >= diasMin)
    .sort((a, b) => (b.dias_sem_treinar ?? 0) - (a.dias_sem_treinar ?? 0));
  const nunca = ids.filter((id) => !ultimo.get(id)).length;
  return { total: sumidos.length, alunos: sumidos.slice(0, 25), ainda_nao_treinaram: nunca };
}

async function riscoLista(admin: SupabaseClient, tenant: string) {
  const ativos = await alunosAtivos(admin, tenant);
  const ids = [...new Set(ativos.map((a) => a.aluno_id))];
  const [{ nomes, ultimo }, venc, queda] = await Promise.all([
    nomesETreino(admin, tenant, ids),
    admin.from("pagamentos").select("aluno_id").eq("tenant_id", tenant).eq("status", "vencido"),
    admin.from("assistente_alertas").select("aluno_id").eq("tenant_id", tenant).eq("tipo", "queda_frequencia").in("estado", ["novo", "visto", "adiado"]),
  ]);
  const atrasados = new Set((venc.data ?? []).map((x) => x.aluno_id));
  const caindo = new Set((queda.data ?? []).map((x) => x.aluno_id));
  const lista = ids
    .map((id) => {
      const dias = diasEntre(ultimo.get(id) ?? null);
      const nivel = riscoCancelamento({ diasSemTreino: dias, atrasado: atrasados.has(id), quedaFrequencia: caindo.has(id) });
      return { nome: nomes.get(id) ?? "Aluno", risco: nivel, dias_sem_treinar: dias, pagamento_atrasado: atrasados.has(id), treinando_menos: caindo.has(id) };
    })
    .filter((x) => x.risco)
    .sort((a, b) => (a.risco === b.risco ? 0 : a.risco === "alto" ? -1 : 1));
  return { regra: "dias sem treino (10+ = 1 ponto, 20+ = 2) + pagamento atrasado (2) + treinando menos (1); 3+ alto, 2 médio", total: lista.length, alunos: lista.slice(0, 25) };
}

async function renovacoes(admin: SupabaseClient, tenant: string, dias: number) {
  const ate = new Date(Date.now() + dias * 86400_000).toISOString();
  const { data } = await admin
    .from("assinaturas")
    .select("aluno_id, current_period_end")
    .eq("tenant_id", tenant)
    .in("status", ["active", "trialing"])
    .neq("origem", "gratuito")
    .gte("current_period_end", new Date().toISOString())
    .lte("current_period_end", ate);
  const ids = (data ?? []).map((a) => a.aluno_id);
  const { nomes } = await nomesETreino(admin, tenant, ids);
  return { total: ids.length, alunos: (data ?? []).map((a) => ({ nome: nomes.get(a.aluno_id) ?? "Aluno", renova_em: String(a.current_period_end).slice(0, 10) })) };
}

async function atrasados(admin: SupabaseClient, tenant: string) {
  const { data } = await admin.from("pagamentos").select("aluno_nome, valor_bruto_centavos, data_vencimento").eq("tenant_id", tenant).eq("status", "vencido");
  return {
    total: data?.length ?? 0,
    valor_total_reais: reais((data ?? []).reduce((s, p) => s + (Number(p.valor_bruto_centavos) || 0), 0)),
    pagamentos: (data ?? []).slice(0, 25).map((p) => ({ nome: primeiroNome(p.aluno_nome), valor_reais: reais(Number(p.valor_bruto_centavos) || 0), venceu_em: p.data_vencimento })),
  };
}

async function contagemAlunos(admin: SupabaseClient, tenant: string, mes: string) {
  const ativos = await alunosAtivos(admin, tenant);
  const ini = `${mes}-01T03:00:00Z`;
  const [y, m] = mes.split("-").map(Number);
  const fim = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1, 3)).toISOString();
  const { data: evs } = await admin.from("assinatura_eventos").select("tipo, aluno_id").eq("tenant_id", tenant).gte("ocorreu_em", ini).lt("ocorreu_em", fim);
  const ids = new Set(ativos.map((a) => a.aluno_id));
  const gratuitos = new Set(ativos.filter((a) => a.origem === "gratuito").map((a) => a.aluno_id));
  return {
    mes,
    ativos_hoje: ids.size,
    gratuitos_hoje: gratuitos.size,
    pagantes_hoje: ids.size - gratuitos.size,
    entraram_no_mes: new Set((evs ?? []).filter((e) => e.tipo === "entrou").map((e) => e.aluno_id)).size,
    sairam_no_mes: new Set((evs ?? []).filter((e) => e.tipo === "saiu").map((e) => e.aluno_id)).size,
    voltaram_no_mes: new Set((evs ?? []).filter((e) => e.tipo === "voltou").map((e) => e.aluno_id)).size,
  };
}

const mesSchema = { type: "string", description: "Mês no formato AAAA-MM" };
const TOOLS = [
  { type: "function", name: "resumo_financeiro", description: "Receita, recebido sem taxas, despesas, lucro, ticket médio e gasto com captação de um mês.", parameters: { type: "object", properties: { mes: mesSchema }, required: ["mes"], additionalProperties: false }, strict: true },
  { type: "function", name: "contagem_alunos", description: "Alunos ativos, pagantes e gratuitos hoje, e quantos entraram, saíram e voltaram no mês.", parameters: { type: "object", properties: { mes: mesSchema }, required: ["mes"], additionalProperties: false }, strict: true },
  { type: "function", name: "alunos_sumindo", description: "Alunos ativos sem treinar há pelo menos N dias (padrão 10) e quantos ainda não fizeram o primeiro treino.", parameters: { type: "object", properties: { dias_minimo: { type: "integer" } }, required: ["dias_minimo"], additionalProperties: false }, strict: true },
  { type: "function", name: "risco_cancelamento", description: "Alunos com risco de cancelar, por regras simples.", parameters: { type: "object", properties: {}, required: [], additionalProperties: false }, strict: true },
  { type: "function", name: "renovacoes_proximas", description: "Assinaturas pagas que renovam nos próximos N dias.", parameters: { type: "object", properties: { dias: { type: "integer" } }, required: ["dias"], additionalProperties: false }, strict: true },
  { type: "function", name: "pagamentos_atrasados", description: "Pagamentos em atraso e valor total.", parameters: { type: "object", properties: {}, required: [], additionalProperties: false }, strict: true },
] as const;

async function executarFerramenta(admin: SupabaseClient, tenant: string, nome: string, args: any) {
  const mesOk = (m: unknown) => (typeof m === "string" && /^\d{4}-\d{2}$/.test(m) ? m : hojeBR().slice(0, 7));
  const intOk = (n: unknown, def: number, max: number) => Math.min(max, Math.max(1, Number.isFinite(Number(n)) ? Math.round(Number(n)) : def));
  switch (nome) {
    case "resumo_financeiro": return resumoFinanceiro(admin, tenant, mesOk(args?.mes));
    case "contagem_alunos": return contagemAlunos(admin, tenant, mesOk(args?.mes));
    case "alunos_sumindo": return alunosSumindo(admin, tenant, intOk(args?.dias_minimo, 10, 365));
    case "risco_cancelamento": return riscoLista(admin, tenant);
    case "renovacoes_proximas": return renovacoes(admin, tenant, intOk(args?.dias, 7, 60));
    case "pagamentos_atrasados": return atrasados(admin, tenant);
    default: return { erro: "ferramenta desconhecida" };
  }
}

// ---------- Mensagem para um alerta ----------
async function dadosMinimosAluno(admin: SupabaseClient, tenant: string, alunoId: string) {
  const desde30 = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const desde60 = new Date(Date.now() - 60 * 86400_000).toISOString().slice(0, 10);
  const [perfil, stats, sess, pesos] = await Promise.all([
    admin.from("perfis").select("nome_completo").eq("id", alunoId).maybeSingle(),
    admin.from("stats_treino_aluno").select("ultimo_treino, treinos_total").eq("tenant_id", tenant).eq("aluno_id", alunoId).maybeSingle(),
    admin.from("sessoes_treino").select("data_treino").eq("tenant_id", tenant).eq("aluno_id", alunoId).gte("data_treino", desde30),
    admin.from("peso_diario").select("peso, data").eq("tenant_id", tenant).eq("aluno_id", alunoId).gte("data", desde60).order("data"),
  ]);
  const p = pesos.data ?? [];
  const variacao = p.length >= 2 ? Math.round((Number(p[p.length - 1].peso) - Number(p[0].peso)) * 10) / 10 : null;
  return {
    primeiro_nome: primeiroNome(perfil.data?.nome_completo),
    dias_sem_treinar: diasEntre(stats.data?.ultimo_treino ?? null),
    treinos_ultimos_30_dias: new Set((sess.data ?? []).map((s) => s.data_treino)).size,
    treinos_total: stats.data?.treinos_total ?? 0,
    variacao_peso_kg_60_dias: variacao,
  };
}

const OBJETIVO_TIPO: Record<string, string> = {
  sumindo: "o aluno parou de treinar; convide a voltar sem cobrar nem culpar",
  queda_frequencia: "o aluno está treinando menos que o normal; pergunte como está e ofereça ajustar o treino",
  pagamento_vencido: "o pagamento está atrasado; lembre com gentileza e ofereça ajuda, sem ameaçar",
  renovacao_proxima: "a renovação está chegando; valorize a evolução e confirme a continuidade",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const bearer = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!bearer) return json({ error: "não autenticado" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${bearer}` } } });
    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u.user) return json({ error: "não autenticado" }, 401);

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "dados inválidos", detalhes: parsed.error.flatten().fieldErrors }, 400);
    const body = parsed.data;
    const tenant = body.tenant_id;

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const [{ data: dono }, { data: isAdmin }] = await Promise.all([
      admin.from("tenants").select("id, nome").eq("id", tenant).eq("owner_user_id", u.user.id).maybeSingle(),
      admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" }),
    ]);
    if (!dono && !isAdmin) return json({ error: "sem permissão" }, 403);

    const mes = `${hojeBR().slice(0, 7)}-01`;
    const { data: usoRow } = await admin.from("assistente_uso").select("mensagens").eq("tenant_id", tenant).eq("mes", mes).maybeSingle();
    const usadas = usoRow?.mensagens ?? 0;
    if (body.acao === "uso") return json({ usadas, limite: LIMITE_MENSAL });
    if (usadas >= LIMITE_MENSAL) return json({ error: "limite_mensal", usadas, limite: LIMITE_MENSAL }, 429);

    const registrarUso = async () => {
      await admin.from("assistente_uso").upsert({ tenant_id: tenant, mes, mensagens: usadas + 1 }, { onConflict: "tenant_id,mes" });
    };

    if (body.acao === "mensagem") {
      const { data: alerta } = await admin.from("assistente_alertas").select("tipo, aluno_id, detalhe").eq("id", body.alerta_id).eq("tenant_id", tenant).maybeSingle();
      if (!alerta?.aluno_id) return json({ error: "alerta não encontrado" }, 404);
      const dados = await dadosMinimosAluno(admin, tenant, alerta.aluno_id);
      const { data: coach } = await admin.from("perfis").select("nome_completo").eq("id", u.user.id).maybeSingle();
      const extra = alerta.tipo === "pagamento_vencido" ? { valor_reais: reais(Number((alerta.detalhe as any)?.valor_centavos ?? 0)) } : {};
      const resp = await generateResponse({
        model: MODEL,
        instructions:
          "Você escreve mensagens curtas de WhatsApp de um personal trainer para o aluno, em português do Brasil. " +
          "Tom próximo, positivo e respeitoso, 2 a 4 frases, no máximo um emoji. Use o primeiro nome. " +
          "Não invente fatos, não fale de saúde/diagnóstico, não mencione peso se a variação for nula, não cite dados sensíveis. " +
          "Responda só com o texto da mensagem, sem aspas.",
        input: [
          {
            role: "user",
            content: JSON.stringify({ objetivo: OBJETIVO_TIPO[alerta.tipo] ?? "falar com o aluno", aluno: dados, coach: primeiroNome(coach?.nome_completo), ...extra }),
          },
        ],
      });
      const texto = textoDaResposta(resp);
      if (!texto) return json({ error: "a IA não devolveu texto" }, 502);
      await registrarUso();
      return json({ mensagem: texto, usadas: usadas + 1, limite: LIMITE_MENSAL });
    }

    // Pergunta sobre o negócio
    const input: any[] = [];
    for (const h of body.historico ?? []) {
      input.push({ role: h.papel === "coach" ? "user" : "assistant", content: h.texto });
    }
    input.push({ role: "user", content: body.pergunta });
    const instructions =
      `Você é o assistente de negócios de um personal trainer no app Alpha Coach. Hoje é ${hojeBR()}. ` +
      "Responda em português do Brasil, curto e direto, com valores em R$ no formato brasileiro. " +
      "Use somente os dados das ferramentas; se não houver dados, diga isso. Nunca invente números. " +
      "Alunos gratuitos não entram em contas de dinheiro. Você não envia mensagens a alunos.";

    let resposta = "";
    for (let rodada = 0; rodada < 4; rodada++) {
      const resp: any = await generateResponse({ model: MODEL, instructions, input, tools: TOOLS as any });
      const chamadas = (resp?.output ?? []).filter((i: any) => i?.type === "function_call");
      if (chamadas.length === 0) {
        resposta = textoDaResposta(resp);
        break;
      }
      for (const item of resp.output ?? []) if (item?.type === "function_call" || item?.type === "reasoning") input.push(item);
      for (const c of chamadas) {
        let args: unknown = {};
        try { args = JSON.parse(c.arguments || "{}"); } catch { /* argumentos inválidos */ }
        let saida: unknown;
        try { saida = await executarFerramenta(admin, tenant, c.name, args); } catch (e) { saida = { erro: String((e as Error).message ?? e) }; }
        input.push({ type: "function_call_output", call_id: c.call_id, output: JSON.stringify(saida) });
      }
    }
    if (!resposta) resposta = "Não consegui responder agora. Tente reformular a pergunta.";
    await registrarUso();
    return json({ resposta, usadas: usadas + 1, limite: LIMITE_MENSAL });
  } catch (e) {
    if (e instanceof GatewayError) {
      console.error("[assistente-ia] gateway", e.code, e.httpStatus, e.message);
      const status = e.httpStatus === 402 ? 402 : e.httpStatus === 429 ? 429 : 502;
      return json({ error: status === 402 ? "sem_creditos_ia" : status === 429 ? "ia_ocupada" : "falha_ia" }, status);
    }
    console.error("[assistente-ia]", e);
    return json({ error: "erro interno" }, 500);
  }
});
