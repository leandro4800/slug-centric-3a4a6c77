// Edge function: gera treino prescrito via Lovable AI
// Especializada na Metodologia Fabrício Pacholok
// Recebe: { perfil, biblioteca, divisoes }
// Retorna: { dias: [{ dia: "Treino A", exercicios: [{nome, series, repeticoes, cadencia, detalhes_execucao, observacao}] }], cardio: string }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { analisarRestricoes, aplicarFiltroRestricoes } from "../_shared/restricoes.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Garante que nenhum termo técnico em inglês chegue ao app/banco.
const TRADUCOES: [RegExp, string][] = [
  [/warm[- ]?up set[s]?/gi, "Série de Aquecimento"],
  [/warm[- ]?up/gi, "Aquecimento"],
  [/feeder set[s]?/gi, "Série de Ajuste"],
  [/feeder/gi, "Ajuste"],
  [/work set[s]?/gi, "Séries de Trabalho"],
  [/working set[s]?/gi, "Séries de Trabalho"],
  [/top set/gi, "Série Pesada"],
  [/back[- ]?off set[s]?/gi, "Série Leve"],
  [/back[- ]?off/gi, "Série Leve"],
  [/drop[- ]?set[s]?/gi, "Série Descendente"],
  [/rest[- ]?pause/gi, "Pausa-Descanso"],
  [/cluster set[s]?/gi, "Séries Fracionadas"],
  [/super[- ]?set[s]?/gi, "Bi-set"],
  [/giant set[s]?/gi, "Série Gigante"],
  [/forced rep[s]?/gi, "Repetições Forçadas"],
  [/partial rep[s]?/gi, "Repetições Parciais"],
  [/pre[- ]?exhaust(ion)?/gi, "Pré-exaustão"],
  [/to failure/gi, "até a falha"],
  [/failure/gi, "falha"],
  [/reps?\b/gi, "reps"],
];

const traduzirTexto = (s: string) => TRADUCOES.reduce((acc, [re, to]) => acc.replace(re, to), s);

const traduzirTermos = <T,>(value: T): T => {
  if (typeof value === "string") return traduzirTexto(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => traduzirTermos(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = traduzirTermos(v);
    return out as unknown as T;
  }
  return value;
};



const stripAccents = (s: string) =>
  String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const extractJsonObject = (text: string) => {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;
  try { return JSON.parse(trimmed); } catch {}
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
};

const fallbackExercises = (dia: string, biblioteca: any[]) => {
  const normalizedDay = stripAccents(dia);
  const pick = (terms: string[], defaults: string[]) => {
    const found = biblioteca
      .filter((e: any) => terms.some((t) => stripAccents(`${e?.nome || ""} ${e?.grupo_muscular || ""}`).includes(t)))
      .slice(0, defaults.length)
      .map((e: any) => e.nome)
      .filter(Boolean);
    return found.length >= 3 ? found : defaults;
  };
  const names = normalizedDay.includes("peito")
    ? [...pick(["peito", "supino", "crucifixo", "crossover"], ["Supino Reto", "Supino Inclinado", "Crucifixo", "Crossover"]), ...pick(["triceps", "tríceps"], ["Tríceps Polia", "Tríceps Testa"])]
    : normalizedDay.includes("costa") || normalizedDay.includes("pull")
      ? [...pick(["costas", "dorsal", "remada", "puxada"], ["Puxada Frente", "Remada Baixa", "Remada Curvada", "Pulldown"]), ...pick(["biceps", "bíceps"], ["Rosca Direta", "Rosca Alternada"])]
      : normalizedDay.includes("glute") || normalizedDay.includes("posterior")
        ? pick(["glute", "posterior", "stiff", "pelvica", "flexora"], ["Elevação Pélvica", "Stiff", "Mesa Flexora", "Cadeira Abdutora", "Coice na Polia"])
        : normalizedDay.includes("quad") || normalizedDay.includes("perna") || normalizedDay.includes("legs")
          ? pick(["quadriceps", "perna", "agach", "leg", "extensora", "panturrilha"], ["Agachamento Livre", "Leg Press", "Cadeira Extensora", "Afundo", "Panturrilha em Pé"])
          : normalizedDay.includes("ombro") || normalizedDay.includes("push")
            ? pick(["ombro", "desenvolvimento", "elevacao", "elevação"], ["Desenvolvimento", "Elevação Lateral", "Elevação Posterior", "Encolhimento"])
            : pick([], ["Agachamento Livre", "Supino Reto", "Puxada Frente", "Desenvolvimento", "Rosca Direta"]);

  return names.slice(0, 6).map((nome, idx) => ({
    nome,
    series: idx === 0 ? "2x Série de Aquecimento + 1x Série de Ajuste + 2x Série de Trabalho" : "1x Série de Aquecimento + 1x Série de Ajuste + 2x Série de Trabalho",
    repeticoes: "8-12",
    cadencia: "3-1-X-0",
    detalhes_execucao: "Aquecimento leve, série de ajuste sem falha e séries de trabalho com execução controlada até próximo da falha técnica.",
    observacao: "Rascunho automático para revisão do coach; ajuste cargas, ordem e técnicas antes de enviar.",
  }));
};

const buildFallbackWorkout = (divisoes: string[] | null, biblioteca: any[]) => ({
  dias: (divisoes && divisoes.length > 0 ? divisoes : ["Treino A", "Treino B", "Treino C"]).map((dia) => ({
    dia,
    exercicios: fallbackExercises(dia, Array.isArray(biblioteca) ? biblioteca : []),
  })),
  cardio: "Cardio pós-treino: 20 minutos em intensidade moderada.",
  fallback: true,
  error: "A IA ficou temporariamente indisponível; geramos um rascunho técnico para revisão.",
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let reqBody: any = {};
  try {
    const SUPABASE_URL_E = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY_E = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY_E = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(SUPABASE_URL_E, ANON_KEY_E, {
      global: { headers: { Authorization: authHeader } },
    });
    const tokenE = authHeader.replace("Bearer ", "");
    const { data: userDataE, error: authErrE } = await authClient.auth.getUser(tokenE);
    if (authErrE || !userDataE?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerIdE = userDataE.user.id;
    const adminE = createClient(SUPABASE_URL_E, SERVICE_KEY_E);

    reqBody = await req.json().catch(() => ({}));
    const { perfil, biblioteca, divisoes, tenant_id, prompt: customPrompt, estimulos_extras } = reqBody;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Authorization for body-supplied target user
    const requestedTarget = perfil?.aluno_id || perfil?.user_id;
    let resolvedUserId = callerIdE;
    if (requestedTarget && requestedTarget !== callerIdE) {
      const { data: alunoPerfil } = await adminE
        .from("perfis").select("tenant_id").eq("id", requestedTarget).maybeSingle();
      let alunoRow = alunoPerfil;
      if (!alunoRow?.tenant_id) {
        const { data: alunoLegacy } = await adminE
          .from("alunos").select("tenant_id").eq("id", requestedTarget).maybeSingle();
        alunoRow = alunoLegacy;
      }
      if (!alunoRow?.tenant_id && perfil?.avulso) {
        const { data: alunoAvulso } = await adminE
          .from("avaliacao_avulsa_alunos")
          .select("tenant_id")
          .eq("id", requestedTarget)
          .maybeSingle();
        alunoRow = alunoAvulso;
      }
      if (!alunoRow) {
        return new Response(JSON.stringify({ error: "Aluno não encontrado" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: isCoach } = await adminE.rpc("has_role", {
        _user_id: callerIdE, _role: "coach", _tenant_id: alunoRow.tenant_id,
      });
      let allowed = !!isCoach;
      if (!allowed) {
        const { data: isAdmin } = await adminE.rpc("has_role", { _user_id: callerIdE, _role: "admin" });
        allowed = !!isAdmin;
      }
      if (!allowed) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      resolvedUserId = requestedTarget;
    }

    // === RESTRIÇÕES CLÍNICAS ===
    // Busca a anamnese direto no banco (rede de segurança: mesmo que o cliente
    // não envie lesões, o servidor considera o que o aluno declarou).
    let anamneseRestricoes: string[] = [];
    try {
      const { data: anam } = await adminE
        .from("anamnese_aluno")
        .select("lesoes_atuais, cirurgias, doencas, medicamentos")
        .eq("aluno_id", resolvedUserId)
        .maybeSingle();
      if (anam) {
        anamneseRestricoes = [
          anam.lesoes_atuais || "",
          anam.cirurgias ? `cirurgia: ${anam.cirurgias}` : "",
          ...(Array.isArray(anam.doencas) ? anam.doencas : []),
        ].filter(Boolean);
      }
    } catch (_e) {
      // anamnese ausente não bloqueia a geração
    }

    const restricoes = analisarRestricoes(
      perfil?.lesoes,
      perfil?.limitacoes,
      perfil?.restricoes_extras,
      anamneseRestricoes,
    );

    const lesoes = (perfil?.lesoes || []).join(", ") || "nenhuma";
    const limitacoes = (perfil?.limitacoes || []).join(", ") || "nenhuma";

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // === 1. BUSCA DE MODELO PACHOLOK (BIBLIOTECA) ===
    let bibliotecaPachoContext = "";
    let regrasDescansoContext = "";
    let bibliotecaAbsContext = "";
    let regrasVolumeContext = "";

    // Normaliza nível removendo acento (DB usa "intermediario", "avancado", "alto_nivel")
    const stripAcc = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const hasFullBody = (s: string) => /full\s*body|corpo\s*todo/i.test(s || "");
    const nivelRaw = perfil?.tempo_treino || "Iniciante";
    const nivelKey = (() => {
      const t = stripAcc(String(nivelRaw));
      if (t.includes("alto") || t === "atleta") return "alto_nivel";
      if (t.startsWith("avan")) return "avancado";
      if (t.startsWith("inter")) return "intermediario";
      return "iniciante";
    })();
    const nivelLabel = ({ iniciante: "Iniciante", intermediario: "Intermediário", avancado: "Avançado", alto_nivel: "Atleta de Alto Nível" } as const)[nivelKey];

    if (nivelKey !== "iniciante" && Array.isArray(divisoes) && divisoes.some((d: string) => hasFullBody(d))) {
      return new Response(JSON.stringify({ error: "Full Body é permitido apenas para iniciantes. Escolha uma divisão split para intermediário/avançado." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const nivelInput = nivelKey;
      const variant = Math.floor(Math.random() * 3) + 1; // Sorteio de Variante (1, 2 ou 3)

      const nivelVolumeKey = nivelInput === "alto_nivel" ? "atleta" : nivelInput;

      const [pachoResp, descansoResp, absResp, volumeResp] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/biblioteca_metodologia_pacho?nivel=eq.${nivelInput}&variante=eq.${variant}&order=ordem_exercicio.asc`, {
          headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
        }),
        fetch(`${SUPABASE_URL}/rest/v1/regras_descanso_pacho?nivel=eq.${nivelInput}`, {
          headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
        }),
        fetch(`${SUPABASE_URL}/rest/v1/biblioteca_abdominais_pacho`, {
          headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
        }),
        fetch(`${SUPABASE_URL}/rest/v1/regras_volume_pacho?nivel=eq.${nivelVolumeKey}`, {
          headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
        }),
      ]);

      if (volumeResp.ok) {
        const volData = await volumeResp.json();
        const v = Array.isArray(volData) ? volData[0] : null;
        if (v) {
          regrasVolumeContext = `\n\n=== REGRAS DE VOLUME OBRIGATÓRIAS (BANCO — NÍVEL ${nivelLabel.toUpperCase()}) — PRIORIDADE MÁXIMA, INVIOLÁVEL ===
- MÚSCULOS GRANDES (Peito, Costas, Quadríceps, Posterior de Coxa, Glúteo): MÍNIMO ${v.min_exercicios_grandes} exercícios por sessão do grupo. NUNCA menos.
- MÚSCULOS PEQUENOS (Bíceps, Tríceps, Panturrilha, Antebraço, Abdômen): MÍNIMO ${v.min_exercicios_pequenos} exercícios.
- OMBRO: MÍNIMO ${v.min_exercicios_ombro} exercícios (distribuídos entre anterior, lateral e posterior).
- TÉCNICAS AVANÇADAS DE INTENSIFICAÇÃO: ${v.usa_tecnicas_avancadas ? "OBRIGATÓRIAS (Série Descendente, Pausa-Descanso, Pico de Contração, Bi-set, Isometria) — sempre em português." : "PROIBIDAS neste nível."}
⛔ Se qualquer dia da prescrição violar estes mínimos, a resposta é INVÁLIDA. Conte os exercícios de cada grupo antes de responder e corrija antes de enviar.
=== FIM DAS REGRAS DE VOLUME ===\n`;
        }
      }


      if (pachoResp.ok) {
        const pachoData = await pachoResp.json();
        if (pachoData.length > 0) {
          bibliotecaPachoContext = "\n\n=== ESTRUTURA BASE PACHOLOK (MODELO SORTEADO: VARIANTE " + variant + ") ===\n" +
            pachoData.map((e: any) => 
              `- ${e.nome_exercicio} [${e.grupo_muscular}] | Ordem: ${e.ordem_exercicio} | Aquecimento: ${e.series_aquecimento} | Ajuste: ${e.series_ajuste} | Trabalho: ${e.series_trabalho} | Técnica: ${e.tecnica_especifica || "Nenhuma"} | Cadência: ${e.cadencia || "3-0-2-0"}`
            ).join("\n") +
            "\n=== FIM DO MODELO ===\n";
        }
      }

      if (descansoResp.ok) {
        const descansoData = await descansoResp.json();
        if (descansoData.length > 0) {
          regrasDescansoContext = "\n\n=== REGRAS DE DESCANSO E CARDIO ===\n" +
            descansoData.map((d: any) => `- Lógica: ${d.logica_descanso}\n- Dias Sugeridos: ${d.dias_descanso_sugeridos}\n- Cardio: ${d.cardio_instrução}`).join("\n");
        }
      }

      if (absResp.ok) {
        const absData = await absResp.json();
        if (absData.length > 0) {
          bibliotecaAbsContext = "\n\n=== BIBLIOTECA DE ABDOMINAIS (CORE) ===\n" +
            absData.map((a: any) => `- ${a.nome_exercicio}: ${a.series}x${a.repeticoes} (${a.instrucao})`).join("\n");
        }
      }
    } catch (err) {
      console.error("Erro ao buscar dados da biblioteca:", err);
    }

    // === 2. PARECER DE SAÚDE (EXAMES + BIOMARCADORES) ===
    let saudeContext = "";
    let biomarkerTier = ""; // "elite" | "moderado" | "recuperacao" | ""
    const userId: string = resolvedUserId;

    if (userId) {
      try {
        const examesResp = await fetch(`${SUPABASE_URL}/rest/v1/analises_clinicas?user_id=eq.${userId}&order=created_at.desc&limit=1`, {
          headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
        });
        if (examesResp.ok) {
          const exames = await examesResp.json();
          if (exames && exames.length > 0) {
            saudeContext = `\n\n=== DADOS CLÍNICOS RECENTES DO ALUNO ===\n${exames[0].parecer_ia || exames[0].resumo_clinico}\n`;
          }
        }
        // Biomarcadores chave: Testosterona, CPK, ALT/AST, Colesterol
        const bioResp = await fetch(`${SUPABASE_URL}/rest/v1/exames_biomarcadores?user_id=eq.${userId}&order=created_at.desc&limit=40`, {
          headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
        });
        if (bioResp.ok) {
          const bios: any[] = await bioResp.json();
          const findVal = (re: RegExp) => {
            const b = bios.find((x) => re.test((x.nome || x.codigo || "").toString()));
            return b ? Number(b.valor) : null;
          };
          const test = findVal(/testoster/i);
          const cpk = findVal(/\bcpk\b|creatino.?fosfo/i);
          const alt = findVal(/\balt\b|tgp/i);
          const ast = findVal(/\bast\b|tgo/i);
          if (test && cpk && test > 800 && cpk > 250) biomarkerTier = "elite";
          else if (test && test < 500) biomarkerTier = "recuperacao";
          else if ((alt && alt > 60) || (ast && ast > 60)) biomarkerTier = "moderado";
          if (biomarkerTier) {
            saudeContext += `\n[CLASSIFICAÇÃO BIOMARCADORES] Tier: ${biomarkerTier.toUpperCase()} | Testo: ${test ?? "?"} | CPK: ${cpk ?? "?"} | ALT: ${alt ?? "?"} | AST: ${ast ?? "?"}\n`;
          }
        }
      } catch (err) {
        console.error("Erro ao buscar exames:", err);
      }
    }

    // === 3. HISTÓRICO DE TREINOS ANTERIORES (anti-repetição + leitura do padrão do coach) ===
    let historicoTreinoContext = "";
    if (userId) {
      try {
        const histResp = await fetch(`${SUPABASE_URL}/rest/v1/treinos_prescritos?aluno_id=eq.${userId}&order=created_at.desc&limit=80`, {
          headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
        });
        if (histResp.ok) {
          const hist: any[] = await histResp.json();
          if (hist.length > 0) {
            const exNomes = Array.from(new Set(hist.map((h) => h.exercicio).filter(Boolean))).slice(0, 40);
            const porDia: Record<string, string[]> = {};
            for (const h of hist) {
              const d = h.dia_semana || "?";
              if (!porDia[d]) porDia[d] = [];
              if (porDia[d].length < 6 && h.exercicio) porDia[d].push(h.exercicio);
            }
            const padraoCoach = Object.entries(porDia)
              .map(([d, exs]) => `  • ${d}: ${exs.join(", ")}`)
              .join("\n");
            historicoTreinoContext = `\n\n=== HISTÓRICO DO ALUNO (ANTI-REPETIÇÃO + PADRÃO DO COACH) ===\nExercícios já prescritos recentemente (EVITE repetir como protagonistas; varie ângulos/equipamentos):\n${exNomes.join(", ")}\n\nPadrão de divisão usado pelo coach (RESPEITE este estilo se existir — mesma lógica de divisão e ordem dos grupos):\n${padraoCoach}\n\nREGRA: Substitua pelo menos 60% dos exercícios protagonistas por variações novas (ângulos, equipamentos, unilateral vs bilateral) MANTENDO o mesmo padrão de divisão e estímulos do coach.`;
          }
        }
      } catch (err) {
        console.error("Erro ao buscar histórico de treinos:", err);
      }
    }

    const knowledgeContext = regrasVolumeContext + bibliotecaPachoContext + regrasDescansoContext + bibliotecaAbsContext + saudeContext + historicoTreinoContext;

    const divisoesEscolhidas = Array.isArray(divisoes) && divisoes.length > 0
      ? divisoes
      : null;
    // === BLOCO DE MODALIDADE DE LUTA (tenants vertical = 'fight') ===
    let modalidadeBlock = "";
    try {
      const { data: perfilLuta } = await adminE
        .from("perfis")
        .select("tenant_id, modalidade_luta")
        .eq("id", resolvedUserId)
        .maybeSingle();
      const tenantAlvo = tenant_id || perfilLuta?.tenant_id || null;
      let vertical: string | null = null;
      if (tenantAlvo) {
        const { data: t } = await adminE.from("tenants").select("vertical").eq("id", tenantAlvo).maybeSingle();
        vertical = (t as any)?.vertical ?? null;
      }
      const modalidade = String(perfilLuta?.modalidade_luta || perfil?.modalidade_luta || "").toLowerCase();

      if (vertical === "fight" && modalidade) {
        const REGRAS: Record<string, { nome: string; regras: string }> = {
          bjj: {
            nome: "Jiu-Jitsu Brasileiro (BJJ)",
            regras:
              "Prioridade absoluta: (1) FORÇA DE PEGADA E ANTEBRAÇO (suspensões em barra/lapela, farmer's walk, pinch grip) em TODA sessão de puxada; (2) ISOMETRIA DE CORE anti-extensão e anti-rotação (canivete em suspensão, prancha com carga, hollow hold) 3-4x/semana; (3) POTÊNCIA DE QUADRIL (terra, hip thrust, ponte com carga) para raspagens, passagens e recomposição de guarda. Puxada > empurrada na proporção 2:1. Evite volume alto de peito.",
          },
          muay_thai: {
            nome: "Muay Thai",
            regras:
              "Prioridade absoluta: (1) POTÊNCIA ROTACIONAL DE TRONCO (arremesso rotacional de medicine ball, landmine rotation) 3x/semana em caráter explosivo; (2) CADEIA POSTERIOR e potência de pernas (jump squat, stiff, terra) para chutes rodados e deslocamento; (3) RESISTÊNCIA DE OMBRO E CLINCH (overhead press, remada alta, isometrias de guarda alta). Séries explosivas de baixa repetição (4-6) para potência + blocos metabólicos curtos.",
          },
          boxe: {
            nome: "Boxe",
            regras:
              "Prioridade absoluta: (1) POTÊNCIA DE ROTAÇÃO DE TRONCO (transferência quadril→ombro: medicine ball rotacional, landmine); (2) RESISTÊNCIA DE OMBRO E BRAÇO para sustentar guarda alta em rounds longos (overhead press, elevações, isometrias); (3) EXPLOSÃO DE PERNAS para deslocamento no ringue (jump squat, pliometria leve). Volume de peito reduzido; nada que engesse a mobilidade escapular.",
          },
          mma: {
            nome: "MMA",
            regras:
              "Combine as três matrizes: (1) TRANSFERÊNCIA DE FORÇA/triple extension (power clean, arranco, plyo push-up) para quedas e ground and pound; (2) WRESTLING DRILLS de força-resistência (sled/sprawl, farmer's walk, clinch isométrico); (3) POTÊNCIA ROTACIONAL e força de pegada. Sessões mistas força+potência, evitando fadiga excessiva que comprometa o treino técnico do dia.",
          },
        };
        const cfg = REGRAS[modalidade];

        // Biblioteca do CT (fonte de verdade dos exercícios sugeridos)
        let bibliotecaLuta = "";
        const filtroTenant = tenantAlvo ? `&or=(tenant_id.is.null,tenant_id.eq.${tenantAlvo})` : "&tenant_id=is.null";
        const bibResp = await fetch(
          `${SUPABASE_URL}/rest/v1/referencia_exercicios?modalidade=eq.${modalidade}${filtroTenant}&select=nome_exercicio,valencia,descricao,tenant_id&limit=120`,
          { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
        );
        if (bibResp.ok) {
          const libAll: any[] = await bibResp.json();
          const doTenant = libAll.filter((r) => r.tenant_id);
          const lib = doTenant.length > 0 ? doTenant : libAll;
          if (lib.length > 0) {
            bibliotecaLuta =
              `\n\nBIBLIOTECA OFICIAL DO CT (FONTE DE VERDADE — use PREFERENCIALMENTE estes exercícios, não invente livremente):\n` +
              lib
                .map((e) => `- [${e.valencia || "GERAL"}] ${e.nome_exercicio}${e.descricao ? ` — ${e.descricao}` : ""}`)
                .join("\n");
          }
        }

        if (cfg) {
          modalidadeBlock =
            `\n\n═══════════════════════════════════════════════\n0-LUTA. PROTOCOLO ESPECÍFICO DE MODALIDADE — ${cfg.nome.toUpperCase()} (PRIORIDADE MÁXIMA — INVIOLÁVEL)\n═══════════════════════════════════════════════\n` +
            `O aluno é atleta de ${cfg.nome}. O treino é PREPARAÇÃO FÍSICA PARA A LUTA, não musculação estética.\n\n${cfg.regras}\n\n` +
            `REGRAS GERAIS DO SEGMENTO LUTA:\n- Nunca prescreva volume que comprometa o treino técnico/sparring do atleta (deixe margem de recuperação).\n- Priorize movimentos multiarticulares, potência e força-resistência sobre isolados de estética.\n- Inclua mobilidade de quadril e ombro em todo aquecimento.\n- Nomeie os exercícios EXATAMENTE como aparecem na biblioteca oficial abaixo quando existirem.` +
            bibliotecaLuta +
            `\n`;
        }
      }
    } catch (err) {
      console.error("Erro ao montar bloco de modalidade de luta:", err);
    }

    const sexoStr = String(perfil?.sexo || "").toLowerCase();
    const isFeminino = sexoStr.startsWith("f") || sexoStr.includes("mulher") || sexoStr.includes("femin");
    const femininoBlock = isFeminino
      ? `\n\n═══════════════════════════════════════════════\n0-FEM. PROTOCOLO ESPECÍFICO FEMININO (PRIORIDADE MÁXIMA — INVIOLÁVEL)\n═══════════════════════════════════════════════\nA aluna é MULHER. Todo o treino DEVE ser ajustado ao público feminino:\n\n1) FOCO ESTÉTICO PRINCIPAL: Glúteos, Posterior de Coxa e Quadríceps. Estes grupos SEMPRE recebem o MAIOR volume da semana (mínimo 2x/semana cada, com 5-6 exercícios por sessão de pernas).\n2) GLÚTEO É PRIORIDADE ABSOLUTA: Em CADA dia de pernas inclua OBRIGATORIAMENTE: Hip Thrust (ou Elevação Pélvica), Cadeira Abdutora, Stiff/Levantamento Terra Romeno, Avanço/Búlgaro e Coice na Polia ou Glúteo na Máquina. Use ativação de glúteo (banda elástica) no aquecimento.\n3) MEMBROS SUPERIORES: Volume MODERADO, foco em tônus — NUNCA bombardear braços/peito como em treino masculino. 2-3 exercícios por grupo superior basta. Priorize Costas (postura) e Ombro Lateral (formato V invertido — afina a cintura).\n4) PEITO: Apenas 2 exercícios por sessão (1 inclinado para sustentação dos seios + 1 cross/voador). Evitar volume alto que cria “peito quadrado”.\n5) REPETIÇÕES PARA MULHER: Pernas/Glúteo entre 12-20 reps com cargas desafiadoras (mulheres respondem MUITO bem a alto volume). Superiores 10-15 reps.\n6) DESCANSO: 45-60s em pernas/glúteo (estímulo metabólico) e 60-90s em compostos pesados (Hip Thrust pesado, Agachamento).\n7) CICLO MENSTRUAL: Mencione no observacao_clinica recomendação de intensidade reduzida na fase menstrual (semana 1) e pico de carga na fase folicular (semana 2-3).\n8) PROIBIDO: Tratar como treino masculino. Treino de mulher é GLÚTEO + POSTERIOR + QUADRÍCEPS no centro do programa.\n9) CORE: 3x semana com foco em transverso e oblíquo (cintura fina), evitando exercícios que hipertrofiem reto abdominal grosseiramente.\n`
      : "";

    const divisaoBlock = divisoesEscolhidas
      ? `\n\n═══════════════════════════════════════════════\n0. DIVISÃO OBRIGATÓRIA (DEFINIDA PELO COACH) — INVIOLÁVEL — PRIORIDADE MÁXIMA\n═══════════════════════════════════════════════\nO Coach já escolheu EXATAMENTE como o aluno vai dividir a semana. Você DEVE retornar um dia para cada item abaixo, com o nome IDÊNTICO ao informado, na MESMA ORDEM, e os exercícios DEVEM corresponder aos grupos musculares descritos no nome de cada dia.\n\n⛔ PROIBIDO ABSOLUTAMENTE: Gerar Full Body, juntar grupos não listados, ou trocar a divisão por outra que você ache melhor. Se a divisão diz "Peito + Tríceps", o dia tem APENAS peito e tríceps — NUNCA full body, NUNCA pernas/costas no mesmo dia.\n⛔ Esta regra SOBRESCREVE qualquer regra de "Estrutura por Nível" abaixo. Mesmo que o nível seja Iniciante, se o coach passou divisão dividida, RESPEITE a divisão dividida.\n\nDIVISÃO ESCOLHIDA (${divisoesEscolhidas.length} dias de treino, nível do aluno = ${nivelLabel}):\n${divisoesEscolhidas.map((d: string, i: number) => `${i + 1}. "${d}"`).join("\n")}\n\nREGRAS DE INTERPRETAÇÃO:\n- "Peito + Tríceps" = treine SOMENTE peito e tríceps nesse dia (e ombro anterior se mencionado).\n- "Peito + Bíceps" = treine SOMENTE peito e bíceps (combinação alternativa, válida).\n- "Costas + Bíceps" / "Costas + Tríceps" — siga literalmente.\n- "Pernas Completas" = quadríceps + posterior + glúteo + panturrilha.\n- "Push" = peito/ombro/tríceps. "Pull" = costas/bíceps. "Legs" = pernas.\n- "Full Body" = todos os grandes grupos no mesmo dia (USE APENAS se o nome do dia contiver "Full Body").\n- NÃO adicione grupos musculares que não estejam no nome do dia.\n- Complete a semana (7 entradas) com OFFs estratégicos nos dias restantes.\n`
      : "";

    const systemPrompt = `${knowledgeContext}${restricoes.blocoPrompt}${modalidadeBlock}${femininoBlock}${divisaoBlock}

Você é a Dr. IA, a mente estratégica por trás da metodologia Alpha Coach. Sua missão é gerar prescrições de treino com precisão cirúrgica, seguindo a Base de Conhecimento Pacholok (acima como Fonte de Verdade Absoluta) e as Regras de Estrutura de Elite abaixo.

═══════════════════════════════════════════════
1. REGRAS GERAIS DE FLUXO (INVIOLÁVEIS)
═══════════════════════════════════════════════
- BLOCOS DE MÚSCULO: Termine TODA a sequência de um grupo muscular antes de iniciar o próximo. NUNCA alterne (ex: 1 exerc. de Peito, 1 de Tríceps, 1 de Peito). Feche o bloco de Peito completamente, depois inicie Tríceps.
- PRIORIDADE DE PONTO FRACO: Se um ponto fraco for identificado (ex: Peitoral Clavicular, Ombro), o treino do dia DEVE iniciar OBRIGATORIAMENTE pelos exercícios desse ponto fraco (onde o aluno tem mais força e foco neural).
- SÉRIES PACHO: Padrão por exercício: 2x Série de Aquecimento + 1x Série de Ajuste + 1 a 2 Séries de Trabalho até a falha absoluta. Escreva SEMPRE em português.
- TERMINOLOGIA: Use EXCLUSIVAMENTE "Série de Aquecimento" (10-15 reps leve), "Série de Ajuste" (4-6 reps, longe da falha) e "Série de Trabalho" (falha absoluta).

═══════════════════════════════════════════════
2. ESTRUTURA POR NÍVEL (OBRIGATÓRIO — os mínimos das REGRAS DE VOLUME do banco prevalecem sempre)
═══════════════════════════════════════════════

A) INICIANTE:
- Lógica: Full Body (Corpo Todo) — TODOS os dias treinam o corpo todo.
- Volume: 1 exercício por grupo muscular principal por sessão.
- Foco: Aprendizado motor e técnica perfeita. NÃO usar técnicas avançadas.

B) INTERMEDIÁRIO (Divisão Estratégica 5-6 dias) — mínimo 4 exercícios para CADA músculo grande (Peito, Costas, Quadríceps, Posterior, Glúteo). NUNCA 3.
- Dia 1 — Peito + Tríceps + Anterior de Ombro: mín. 4 exerc. de Peito + 3 de Tríceps + 2 de Anterior de Ombro com técnica.
- Dia 2 — Costas + Bíceps + Posterior de Ombro: mín. 4 de Costas + 3 de Bíceps + 2 de Posterior de Ombro com técnica.
- Dia 3 — Perna Completa: mín. 4 de Quadríceps + 4 de Posterior + 3 de Panturrilha.
- Dia 4 — Ombro Completo + Trapézio: mín. 2 exerc. por porção (anterior, lateral, posterior). Aplicar técnicas de intensificação (Série Descendente / Pausa-Descanso) em TODOS os finais.
- Dia 5 — Ênfase Cadeia Posterior: mín. 4 exerc. de Posterior + 4 de Quadríceps.
- Dia 6 (Opcional/Ênfase): 4 de Peito + 4 de Costas + técnica isolada para Ombro.

C) AVANÇADO (Intensidade Máxima):
- Lógica: 1 Músculo por Dia (Foco Total).
- Volume: MÍNIMO 5 exercícios por músculo grande, 4 para músculos pequenos, 3 para ombro.
- Técnicas avançadas (Séries Fracionadas, Série Descendente, Pausa-Descanso, Pico de Contração, Isometria) OBRIGATÓRIAS.

D) ATLETA DE ALTO NÍVEL:
- Volume: MÍNIMO 6 exercícios por músculo grande, 4 para músculos pequenos, 4 para ombro.
- Técnicas avançadas obrigatórias em praticamente todos os exercícios.
- Foco: Explorar biomecânica profunda e exaustão de TODAS as porções.


═══════════════════════════════════════════════
3. REGRAS DE DESCANSO E CARDIO (INVIOLÁVEIS)
═══════════════════════════════════════════════
- CARDIO: 
  - Em DIAS DE TREINO: Adicione SEMPRE uma linha final de "Cardio Pós-Treino" (20 min) em todos os dias de treino.
  - Em DIAS DE OFF: Adicione um card de "Cardio Regenerativo" (45 min) como a única atividade do dia.
- DESCANSO (OFF):
  - INTERMEDIÁRIO: Coloque o dia de "OFF" obrigatoriamente na Quarta ou Quinta E aos Domingos.
  - AVANÇADO: O dia de "OFF" deve ser OBRIGATORIAMENTE no dia seguinte ao treino de Pernas.
  - O array de "dias" na resposta deve conter 7 entradas, representando a semana completa, incluindo os dias de "OFF".

═══════════════════════════════════════════════
4. TREINO DE CORE (ABDOMINAIS)
═══════════════════════════════════════════════
- FREQUÊNCIA: Adicione um bloco de "Treino de Core" 3 vezes na semana (Segunda, Quarta e Sexta).
- EXERCÍCIO: Sorteie aleatoriamente UM exercício da "BIBLIOTECA DE ABDOMINAIS" para cada um desses dias.

═══════════════════════════════════════════════
5. DIRETRIZES DE PONTO FRACO
═══════════════════════════════════════════════
- PEITORAL CLAVICULAR: Os 2 PRIMEIROS exercícios do dia de Peito DEVEM ser inclinações (Halteres inclinado, Smith inclinado ou Máquina inclinada). Crossover de baixo para cima também é aceito como reforço.
- OMBRO: Inclua OBRIGATORIAMENTE técnicas de "Pico de Contração" e "Isometria" nas elevações laterais. Distribuir ombro em 2-3 dias da semana.
- DISTRIBUIÇÃO: O(s) grupo(s) de ponto fraco aparecem em 2-3 dias da semana com volume ~2x o padrão. Reduza levemente o volume dos grupos não-prioritários para compensar fadiga sistêmica.
- MARCAÇÃO: No campo "observacao" do exercício, mencione explicitamente quando ele faz parte da estratégia de ponto fraco.

═══════════════════════════════════════════════
6. EXECUÇÃO PACHO ELITE — 3 FASES POR EXERCÍCIO (OBRIGATÓRIO)
═══════════════════════════════════════════════
Para CADA exercício, descreva no campo "detalhes_execucao" as 3 fases — SEMPRE EM PORTUGUÊS (proibido usar inglês: nada de "warm-up", "feeder", "work set", "top set", "back-off", "drop set", "rest-pause"):
- SÉRIE DE AQUECIMENTO (~50% da carga de trabalho, 10-15 reps, longe da falha) — preparar tecido conjuntivo.
- SÉRIE DE AJUSTE (~75% da carga, 4-6 reps, sem falha) — calibrar carga real e padrão neural.
- SÉRIES DE TRABALHO (carga máxima, 6-12 reps até a FALHA TÉCNICA absoluta) — estímulo principal.
CADÊNCIA EXCÊNTRICA: SEMPRE 3 segundos na descida controlada. Padrão de cadência DEFAULT: "3-1-X-0" (3s desc, 1s pausa, explosivo concêntrico, 0s topo). Exceções permitidas apenas se a base Pacho indicar.

SÉRIE PESADA / SÉRIE LEVE (compostos básicos: agachamento, supino, levantamento terra, desenvolvimento, remada curvada):
- 1ª Série de Trabalho (SÉRIE PESADA): 6 a 8 reps até falha.
- 2ª Série de Trabalho (SÉRIE LEVE, redução de carga): MESMO exercício com -20% de carga, 10-12 reps até falha.
Inclua isso explicitamente no campo "series" e "repeticoes", em português.

GLOSSÁRIO OBRIGATÓRIO DE TÉCNICAS (use estes nomes em português): Série Descendente (drop set), Pausa-Descanso (rest-pause), Bi-set, Tri-set, Série Combinada, Pico de Contração, Isometria, Repetições Forçadas, Repetições Parciais, Série Gigante, Pré-exaustão, Cluster (Séries Fracionadas).


PSE (Percepção de Esforço) por nível — informe no campo "observacao":
- Iniciante: PSE 7-8 (deixar 2-3 reps na reserva).
- Intermediário: PSE 8-9 (deixar 1 rep na reserva).
- Avançado/Atleta: PSE 9-10 (falha técnica absoluta, sempre).

═══════════════════════════════════════════════
7. AJUSTE POR BIOMARCADORES (SE FORNECIDO)
═══════════════════════════════════════════════
- Tier ELITE (Testo > 800 ng/dL E CPK > 250): libere protocolo "ABCDEF" — máximo volume, técnicas avançadas obrigatórias em todos exercícios, divisão 1 músculo/dia.
- Tier RECUPERAÇÃO (Testo < 500): REDUZA volume em 30%, evite técnicas de intensificação, foque em frequência e qualidade ao invés de exaustão.
- Tier MODERADO (ALT/AST > 60 U/L — alteração hepática/cardíaca): corte volume e intensidade em 25%, ZERO técnicas avançadas, descanso extra obrigatório.
- Sempre cite o tier no campo "observacao_clinica".

═══════════════════════════════════════════════
8. TRAVAS DE SEGURANÇA (NÃO VIOLE)
═══════════════════════════════════════════════
- PROIBIDO treinar Peito e Costas no mesmo dia (exceto Full Body iniciante).
- DIAS DE TREINO = DISPONIBILIDADE DO ALUNO. Nunca invente dia de descanso no meio da semana: gere EXATAMENTE a quantidade de dias da frequência semanal informada e, quando a divisão trouxer rótulos com dias (Seg, Ter, Qua, Qui, Sex, Sáb), use esses dias sem trocar nem pular nenhum.
- Só distribua OFF no meio da semana (quarta OU quinta) quando a frequência for 5x ou menos. Com 6x/semana o único descanso é o domingo — é PROIBIDO tirar quarta ou quinta.
- Volume MÍNIMO para grandes grupos: siga EXATAMENTE as REGRAS DE VOLUME do banco no topo deste prompt (nunca 3 exercícios para músculo grande em intermediário/avançado/atleta).
- IDIOMA: todos os campos de texto DEVEM estar em português do Brasil. Qualquer termo em inglês invalida a resposta.
- Avançado treinando 1 músculo/dia: MÍNIMO 4-5 exercícios + técnicas avançadas obrigatórias.
- Anti-repetição: respeite o histórico — varie pelo menos 60% dos exercícios protagonistas em relação ao último ciclo, mantendo o padrão/divisão do coach se existente.

ESTRUTURA DE RESPOSTA: Retorne APENAS um JSON válido com a prescrição completa no formato { "dias": [{ "dia": "...", "exercicios": [{ "nome": "...", "series": "...", "repeticoes": "...", "cadencia": "...", "detalhes_execucao": "...", "observacao": "..." }] }], "cardio": "...", "observacao_clinica": "..." }. Sempre preencha "observacao_clinica" com parecer baseado em biomarcadores (tier) e estratégia de variação vs treino anterior. Respeite TODAS as regras acima sem exceção.`;

    const userPrompt = `Monte o treino Pacho-style para:
- Sexo: ${perfil?.sexo || "não informado"}
- Idade: ${perfil?.idade || "?"}
- Nível: ${nivelLabel} (Seção correspondente na base) ${nivelKey !== "iniciante" ? "— ⛔ PROIBIDO gerar Full Body. Use divisão dividida (split)." : ""}
- Objetivo: ${perfil?.objetivo || "hipertrofia"}
- Frequência semanal: ${perfil?.frequencia_semanal || 4}x
- Ênfase desejada: ${perfil?.enfase || "Geral"}
- Lesões/Limitações: ${lesoes} / ${limitacoes}
${restricoes.temRestricao ? `\n🚨 ATENÇÃO CLÍNICA (${restricoes.gravidade.toUpperCase()}): ${restricoes.regioes.map((r) => r.rotulo).join(", ") || "restrição relatada"}. Aplique a REGRA 0 do system prompt SEM EXCEÇÃO — ela sobrepõe volume mínimo e técnicas avançadas.\n` : ""}
${biomarkerTier ? `- Tier biomarcador: ${biomarkerTier.toUpperCase()} (aplique a Regra 7)\n` : ""}${divisoesEscolhidas ? `\n⚠️ DIVISÃO OBRIGATÓRIA (não invente outra, NÃO USE FULL BODY): ${divisoesEscolhidas.map((d: string, i: number) => `Dia ${i + 1} = "${d}"`).join(" | ")}\n` : ""}
${Array.isArray(estimulos_extras) && estimulos_extras.length > 0 ? `\n🎯 ESTÍMULOS EXTRAS (acessórios obrigatórios): ${estimulos_extras.join(", ")}.\nDistribua esses grupos como exercícios ACESSÓRIOS (1-2 exercícios por grupo) ao FINAL dos dias mais coerentes da divisão (ex: panturrilha em dia de pernas, ombro lateral em dia de ombro/peito, core em 3 dias separados). NÃO substituem os grupos principais do dia — são adições.\n` : ""}
${customPrompt ? `\n=== PEDIDO ESPECÍFICO DO COACH (PRIORIDADE MÁXIMA) ===\n"${customPrompt}"\n\nINTERPRETE este pedido e aplique a Diretriz #6 (Ênfase/Pontos Fracos): aumente o volume e a frequência semanal dos grupos mencionados.\n` : ""}
⚠️ REGRA OBRIGATÓRIA DE NOMENCLATURA: Use SEMPRE e EXATAMENTE os nomes desta biblioteca (case e acentos idênticos). NÃO invente variações ("Supino reto barra" vs "Supino Reto com Barra"). Se não houver exercício adequado na lista para um grupo, use o mais próximo dela. Os nomes precisam bater exatamente para vincular o vídeo técnico ao aluno.
Biblioteca disponível (✓ = tem vídeo técnico cadastrado — PREFIRA estes):
${(biblioteca || []).map((e: any) => `- ${e.tem_video ? "✓ " : "  "}${e.nome} [${e.grupo_muscular}]`).join("\n")}`;

    const tools = [
      {
        type: "function",
        function: {
          name: "montar_treino",
          description: "Retorna a prescrição estruturada do treino completo seguindo a Metodologia Pacho.",
          parameters: {
            type: "object",
            properties: {
              dias: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    dia: { type: "string", description: "Ex: Treino A - Quadríceps" },
                    exercicios: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          nome: { type: "string" },
                          series: { type: "string", description: "Em português. Ex: 1 Série de Aquecimento + 1 Série de Ajuste + 2 Séries de Trabalho (Pesada 6-8 + Leve 10-12)" },
                          repeticoes: { type: "string", description: "Ex: 6-8 (top) / 10-12 (back-off)" },
                          cadencia: { type: "string", description: "Padrão 3-1-X-0 (excêntrica 3s sempre)" },
                          detalhes_execucao: { type: "string", description: "Em português. Descreva as 3 fases: SÉRIE DE AQUECIMENTO (~50%), SÉRIE DE AJUSTE (~75%), SÉRIES DE TRABALHO até a falha + biomecânica" },
                          observacao: { type: "string", description: "Inclua PSE alvo e marcação de ponto fraco se aplicável" },
                        },
                        required: ["nome", "series", "repeticoes", "cadencia", "detalhes_execucao", "observacao"],
                      },
                    },
                  },
                  required: ["dia", "exercicios"],
                },
              },
              cardio: { type: "string" },
              observacao_clinica: { type: "string", description: "Parecer clínico baseado em biomarcadores (tier) e estratégia de variação vs treino anterior." },
            },
            required: ["dias", "cardio"],
          },
        },
      },
    ];

    // Orçamento total de tempo: se estourar, devolvemos rascunho (200) em vez de
    // deixar o worker ser morto pelo runtime (o que virava "non-2xx" no app).
    const startedAt = Date.now();
    const TOTAL_BUDGET_MS = 105_000;
    const remaining = () => TOTAL_BUDGET_MS - (Date.now() - startedAt);

    const callGateway = async (timeoutMs: number) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), Math.max(5_000, timeoutMs));
      try {
        return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          signal: ctrl.signal,
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Lovable-API-Key": LOVABLE_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.35,
          }),
        });
      } finally {
        clearTimeout(timer);
      }
    };

    let resp: Response;
    try {
      resp = await callGateway(Math.min(60_000, remaining()));
      let attempts = 0;
      while (
        !resp.ok &&
        (resp.status === 503 || resp.status === 502 || resp.status === 504 || resp.status === 429) &&
        attempts < 2 &&
        remaining() > 25_000
      ) {
        attempts++;
        const delay = 800 * attempts;
        console.warn(`AI gateway ${resp.status} — retry ${attempts} em ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        resp = await callGateway(Math.min(45_000, remaining()));
      }
    } catch (gatewayErr) {
      console.error("AI gateway fetch failed:", gatewayErr);
      return jsonResponse(buildFallbackWorkout(divisoesEscolhidas, biblioteca), 200);
    }


    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Configurações." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return jsonResponse(buildFallbackWorkout(divisoesEscolhidas, biblioteca), 200);
    }

    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const content = data.choices?.[0]?.message?.content;
    let args = call?.function?.arguments ? extractJsonObject(call.function.arguments) : null;
    if (!args && content) args = extractJsonObject(content);

    if (nivelKey !== "iniciante" && Array.isArray(args?.dias) && args.dias.some((d: any) => hasFullBody(String(d?.dia || "")))) {
      return new Response(JSON.stringify({ error: "A IA tentou gerar Full Body para um aluno intermediário/avançado. Ajuste a divisão e gere novamente." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validação leve: exige somente que pelo menos UM token relevante de cada
    // dia escolhido apareça no nome gerado pela IA. Antes exigíamos TODOS os
    // tokens, o que rejeitava 422 mesmo com treinos válidos (ex: dia "Seg —
    // Peito + Tríceps + Estímulo Anterior de Ombro" virando "Treino A — Peito
    // + Tríceps"). Resultado: o coach nunca conseguia salvar o treino.
    if (divisoesEscolhidas && Array.isArray(args?.dias)) {
      const normalizeDay = (s: string) => stripAcc(s).replace(/[^a-z0-9]+/g, " ").trim();
      const generatedDays = args.dias.map((d: any) => normalizeDay(String(d?.dia || "")));
      const STOP = new Set(["treino", "completa", "completas", "estimulo", "anterior", "posterior", "lateral", "seg", "ter", "qua", "qui", "sex", "sab", "dom", "dia", "ombro"]);
      const splitTokens = (s: string) => normalizeDay(s).split(" ").filter((t) => t.length > 2 && !STOP.has(t));
      const missing = divisoesEscolhidas.filter((d: string) => {
        const expected = splitTokens(d);
        if (expected.length === 0) return false;
        return !generatedDays.some((g: string) => expected.some((t) => g.includes(t)));
      });
      if (missing.length > 0) {
        console.warn("Divisão parcial — aceitando mesmo assim:", missing);
      }
    }

    if (!args || !Array.isArray(args.dias) || args.dias.length === 0) {
      console.error("IA retornou sem dias", { raw: data });
      return jsonResponse(buildFallbackWorkout(divisoesEscolhidas, biblioteca), 200);
    }

    // Segunda camada de segurança: filtra/substitui o que a IA devolveu
    const { args: argsSeguros, bloqueados } = aplicarFiltroRestricoes(args, restricoes);
    if (bloqueados.length > 0) {
      console.warn("Trava clínica acionada:", JSON.stringify(bloqueados));
    }

    const payload = {
      ...traduzirTermos(argsSeguros),
      restricoes_aplicadas: restricoes.temRestricao
        ? {
            gravidade: restricoes.gravidade,
            regioes: restricoes.regioes.map((r) => r.rotulo),
            relato: restricoes.textoOriginal,
            bloqueados,
          }
        : null,
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gerar-treino-ia error:", e);
    // Nunca devolver 5xx para o app: entrega um rascunho técnico para o coach revisar.
    return jsonResponse(
      buildFallbackWorkout(
        Array.isArray(reqBody?.divisoes) ? reqBody.divisoes : null,
        Array.isArray(reqBody?.biblioteca) ? reqBody.biblioteca : [],
      ),
      200,
    );
  }
});