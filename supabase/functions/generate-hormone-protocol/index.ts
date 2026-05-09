import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Authenticate caller
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
    const { data: userData, error: authErr } = await authClient.auth.getUser(token);
    if (authErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const { alunoId } = await req.json();
    if (!alunoId) throw new Error("ID do aluno é obrigatório");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // 2. Authorization: caller must be the student themselves OR a coach in the student's tenant
    const { data: aluno } = await admin
      .from("alunos")
      .select("id, nome, tenant_id, nivel_experiencia, objetivo")
      .eq("id", alunoId)
      .maybeSingle();

    if (!aluno) {
      return new Response(JSON.stringify({ error: "Aluno não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let allowed = callerId === alunoId;
    if (!allowed) {
      const { data: hasRole } = await admin.rpc("has_role", {
        _user_id: callerId,
        _role: "coach",
        _tenant_id: aluno.tenant_id,
      });
      allowed = !!hasRole;
      if (!allowed) {
        const { data: isAdmin } = await admin.rpc("has_role", {
          _user_id: callerId,
          _role: "admin",
        });
        allowed = !!isAdmin;
      }
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: anamnesisData } = await admin
      .from("anamnese_aluno")
      .select("*")
      .eq("aluno_id", alunoId)
      .maybeSingle();
    const anamnese: any = anamnesisData || {};

    // Buscar exames recentes para contexto clínico
    const { data: ultimaAnalise } = await admin
      .from("analises_clinicas")
      .select("resumo_clinico, parecer_ia, score_performance")
      .eq("user_id", alunoId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: biomarcadores } = await admin
      .from("exames_biomarcadores")
      .select("nome, valor, unidade, classificacao")
      .eq("user_id", alunoId)
      .order("created_at", { ascending: false })
      .limit(40);

    const bioRelevantes = (biomarcadores || []).filter((b: any) =>
      /testoster|estradiol|lh|fsh|hematócrito|hemoglobina|alt|ast|tgp|tgo|gama|ggt|colesterol|ldl|hdl|triglic|psa|prolactina|tsh|t4/i.test(b.nome || "")
    ).slice(0, 25);

    const examesContext = bioRelevantes.length > 0
      ? `\nEXAMES CHAVE:\n${bioRelevantes.map((b: any) => `- ${b.nome}: ${b.valor} ${b.unidade || ""} (${b.classificacao || "ref"})`).join("\n")}`
      : "\nEXAMES: Sem exames hormonais/hepáticos recentes — RECOMENDAR painel pré-ciclo.";

    const studentContext = `
Nome: ${aluno.nome || 'Atleta'}
Sexo: ${anamnese.sexo || 'M'}
Idade: ${anamnese.idade || 'Não informado'}
Nível: ${anamnese.nivel_experiencia || aluno.nivel_experiencia || 'Não informado'}
Objetivo: ${aluno.objetivo || 'Não informado'}
Peso: ${anamnese.peso_kg || 'Não informado'} kg
Anos de Treino: ${anamnese.anos_treino || '0'}
Uso de Ergogênicos: ${anamnese.faz_uso_ergogenicos ? 'Sim' : 'Não (FIRST CYCLE)'}
Detalhes/Objetivo Ergogênicos: ${anamnese.detalhes_ergogenicos || 'Nenhum'}
Medicamentos em uso: ${anamnese.medicamentos || 'Nenhum'}
Doenças: ${anamnese.doencas ? anamnese.doencas.join(', ') : 'Nenhuma'}
Resumo clínico: ${ultimaAnalise?.resumo_clinico || 'Sem análise prévia'}
${examesContext}
`;

    const systemPrompt = `# ROLE: MÉDICO DO ESPORTE & CONSULTOR DE PERFORMANCE DE ELITE
Você é a inteligência clínica da Alpha Coach, o "Dr. IA". Sua especialidade é farmacologia esportiva, endocrinologia de performance e periodização hormonal para atletas de alto rendimento. Linguagem direta, técnica, assertiva, centrada em performance e redução de danos.

# BASE DE CONHECIMENTO
1. Metodologia Alpha Coach — resultados reais guiados por biomarcadores.
2. Anabolismo Total — diretrizes sobre EAAs, protetores, Insulina e GH.
3. Pacholok Methodology — o treinamento dita a intensidade do protocolo.
4. Referências de saúde (zonas críticas): Hematócrito >52%, HDL <20, TGP >70, Creatinina >1.5.
5. Literatura de apoio: Dudu Haluch ("Hormônios no Fisiculturismo") e William Llewellyn ("Anabolics").

# OBJETIVOS / ESTRATÉGIAS
- BULK: volume, síntese proteica, força. Stack aromatizável + IA controlado.
- CUT: densidade, queima, preservação magra. Bases secas (Masteron/Primo/Tren avançado), orais finais (Winstrol/Oxandrolona).
- CRUISE: dose fisiológica/manutenção para estabilizar biomarcadores entre blasts.

# REGRAS DE OURO
1. SEGURANÇA PRIMEIRO — Se biomarcadores em zona crítica (Hto>52, HDL<20, TGP>70, Creat>1.5, ALT/AST>60), NÃO sugira ciclo. Prescreva "RESET/DETOX" (Cruise TRT ou Off-Drugs) com NAC, Silimarina, TUDCA, Ômega 3, Berberina.
2. DURAÇÃO: 8 a 16 semanas (blast); cruise 8-12 semanas.
3. ESTRUTURA: substância → dose (mg/sem) → frequência → via → duração.
4. PROTETORES OBRIGATÓRIOS: suporte HPTA (HCG/SERM), perfil lipídico (ômega 3, berberina), hepático (TUDCA, Silimarina, NAC), cardiovascular (telmisartana se PA alta).

# ESTRATÉGIA POR NÍVEL
- INICIANTE / FIRST CYCLE: SOMENTE Testosterona (Cipionato/Enantato 250-500mg/sem) por 12-16 sem. ZERO orais. TPC clássica (Tamox+Clomid).
- INTERMEDIÁRIO: Testo base + 1 secundário (Bold/Deca/Primo/Masteron). Possível 1 oral curto (4-6 sem).
- AVANÇADO/ATLETA: Stack 2-3 compostos + orais estratégicos + GH/Insulina (se aplicável). TPC robusta ou cruise.

# REGRAS TÉCNICAS INEGOCIÁVEIS
- Relação Testo/E2: Anastrozol APENAS se sensibilidade ou proporção <20:1. Não usar IA profilático em doses TRT.
- Hematócrito >52%: incluir SANGRIA TERAPÊUTICA + hidratação 5L+/dia + reduzir dose; evitar Boldenona/Trembolona.
- Orais 17-aa: máx 4-6 semanas por hepatotoxicidade. ALT/AST>60 → PROIBIDOS. Sempre com TUDCA 500mg/dia.
- LDL alto / HDL baixo: evitar orais e Trembolona; priorizar Testo+Primo. Berberina + Ômega 3 EPA/DHA 3g/dia.
- Estradiol prévio alto: Anastrozol 0.5mg E3D desde semana 1.
- Termogênicos (CUT): sinergia Cafeína/Efedrina/Ioimbina respeitando PA e FC de repouso.
- Sem exames recentes: protocolo é GENÉRICO — exija exames basais antes de iniciar.
- Mulheres: jamais sugerir testosterona/trembolona/orais androgênicos pesados (virilização). Apenas Oxandrolona micro-dose se objetivo competitivo + acompanhamento médico.

# ESTRUTURA DE SAÍDA (preencher TODOS os campos do tool)
- on_cycle: drogas, ésteres, meias-vidas, dose semanal, frequência (E2D/E3D), via (IM/SC/Oral), semanas.
- auxiliares: IA, HCG, suporte hepático/lipídico/cardiovascular, com dose e finalidade.
- tpc: cronograma semanal Tamox + Clomid (+HCG se aplicável), 4-6 sem, início baseado na meia-vida do éster mais longo.
- monitoramento: exames a repetir na semana 6, fim do ciclo e na TPC (hormonal completo, hepático, lipídico, hemograma, PSA se >35a).
- sinais_alerta: ginecomastia, HAS, queda libido, alteração humor, dor abdominal, urina escura — quando interromper.
- ajustes_clinicos_aplicados: explique o que foi adaptado pelos exames do aluno.

# AVISO INEGOCIÁVEL DE SEGURANÇA
Inclua no INÍCIO e no FINAL do "resumo_executivo":
"⚠️ CONTEÚDO EDUCACIONAL. O uso de substâncias sem supervisão médica envolve riscos graves à saúde. Baseado em literatura esportiva (Haluch/Llewellyn). DEVE ser avaliado por Médico Endocrinologista. NÃO inicie sem exames basais."

Use terminologia técnica: ésteres, aromatização, virilização, shutdown HPTA, recovery, AI, SERM, blast & cruise, recomp.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "montar_protocolo_hormonal",
          description: "Retorna protocolo hormonal estruturado.",
          parameters: {
            type: "object",
            properties: {
              tier_protocolo: { type: "string", enum: ["iniciante", "intermediario", "avancado", "atleta_alto_nivel"] },
              objetivo_ciclo: { type: "string" },
              duracao_total_semanas: { type: "integer" },
              resumo_executivo: { type: "string", description: "Visão geral do protocolo, com avisos de segurança no início e fim." },
              on_cycle: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    droga: { type: "string" },
                    ester: { type: "string" },
                    meia_vida: { type: "string" },
                    dose_semanal: { type: "string" },
                    frequencia: { type: "string", description: "Ex: E3D, 2x/semana" },
                    via: { type: "string", enum: ["IM", "SC", "Oral"] },
                    semanas: { type: "string", description: "Ex: 1-12" },
                    observacao: { type: "string" },
                  },
                  required: ["droga", "dose_semanal", "frequencia", "via", "semanas"],
                },
              },
              auxiliares: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    item: { type: "string", description: "Ex: Anastrozol, HCG, TUDCA" },
                    dose: { type: "string" },
                    frequencia: { type: "string" },
                    finalidade: { type: "string" },
                  },
                  required: ["item", "dose", "finalidade"],
                },
              },
              tpc: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    semana: { type: "string", description: "Ex: Semana 1, Semana 2-4" },
                    droga: { type: "string" },
                    dose: { type: "string" },
                  },
                  required: ["semana", "droga", "dose"],
                },
              },
              monitoramento: {
                type: "array",
                items: { type: "string" },
                description: "Exames a repetir e quando.",
              },
              sinais_alerta: {
                type: "array",
                items: { type: "string" },
              },
              ajustes_clinicos_aplicados: {
                type: "string",
                description: "O que foi adaptado do protocolo padrão por causa dos exames do aluno.",
              },
            },
            required: ["tier_protocolo", "duracao_total_semanas", "resumo_executivo", "on_cycle", "auxiliares", "tpc", "monitoramento", "sinais_alerta"],
          },
        },
      },
    ];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Gere o protocolo para:\n${studentContext}` }
        ],
        tools,
        tool_choice: { type: "function", function: { name: "montar_protocolo_hormonal" } },
      }),
    });

    if (!aiResponse.ok) {
      const t = await aiResponse.text();
      console.error("AI gateway:", aiResponse.status, t);
      throw new Error("Falha na IA");
    }

    const aiData = await aiResponse.json();
    const call = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const protocolo = call?.function?.arguments ? JSON.parse(call.function.arguments) : null;

    // Renderizar texto markdown a partir do JSON estruturado para compatibilidade com UI atual
    const md = protocolo ? renderProtocolMarkdown(protocolo) : "Erro ao gerar protocolo.";

    return new Response(JSON.stringify({ protocol: md, structured: protocolo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function renderProtocolMarkdown(p: any): string {
  const lines: string[] = [];
  lines.push(`# Protocolo Hormonal — Tier: ${p.tier_protocolo?.toUpperCase()}`);
  if (p.objetivo_ciclo) lines.push(`**Objetivo:** ${p.objetivo_ciclo}`);
  lines.push(`**Duração:** ${p.duracao_total_semanas} semanas\n`);
  lines.push(`## Resumo Executivo\n${p.resumo_executivo}\n`);
  if (p.ajustes_clinicos_aplicados) lines.push(`## Ajustes Clínicos Aplicados\n${p.ajustes_clinicos_aplicados}\n`);
  lines.push(`## On-Cycle`);
  for (const d of p.on_cycle || []) {
    lines.push(`- **${d.droga}**${d.ester ? ` (${d.ester})` : ""} — ${d.dose_semanal}, ${d.frequencia}, ${d.via}, semanas ${d.semanas}${d.meia_vida ? ` | meia-vida: ${d.meia_vida}` : ""}${d.observacao ? `\n  > ${d.observacao}` : ""}`);
  }
  lines.push(`\n## Auxiliares (IA, HCG, suporte)`);
  for (const a of p.auxiliares || []) {
    lines.push(`- **${a.item}** — ${a.dose}${a.frequencia ? ` (${a.frequencia})` : ""} → ${a.finalidade}`);
  }
  lines.push(`\n## TPC (Terapia Pós-Ciclo)`);
  for (const t of p.tpc || []) {
    lines.push(`- ${t.semana}: **${t.droga}** ${t.dose}`);
  }
  lines.push(`\n## Monitoramento (Exames)`);
  for (const m of p.monitoramento || []) lines.push(`- ${m}`);
  lines.push(`\n## Sinais de Alerta`);
  for (const s of p.sinais_alerta || []) lines.push(`- ⚠️ ${s}`);
  return lines.join("\n");
}
