import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await authClient.auth.getUser(authHeader.replace("Bearer ", ""));
    const callerId = u?.user?.id;
    if (!callerId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { aluno_id } = await req.json();
    if (!aluno_id) {
      return new Response(JSON.stringify({ error: "aluno_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Authz: aluno, owner do tenant, coach do tenant ou admin
    const { data: perfil } = await sb.from("perfis")
      .select("nome_completo, sexo, tenant_id").eq("id", aluno_id).maybeSingle();
    if (!perfil) {
      return new Response(JSON.stringify({ error: "Atleta não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let allowed = callerId === aluno_id;
    if (!allowed && perfil.tenant_id) {
      const { data: tenant } = await sb.from("tenants").select("owner_user_id").eq("id", perfil.tenant_id).maybeSingle();
      if (tenant?.owner_user_id === callerId) allowed = true;
      if (!allowed) {
        const { data: isCoach } = await sb.rpc("has_role", { _user_id: callerId, _role: "coach", _tenant_id: perfil.tenant_id });
        if (isCoach) allowed = true;
      }
    }
    if (!allowed) {
      const { data: isAdmin } = await sb.rpc("has_role", { _user_id: callerId, _role: "admin" });
      if (isAdmin) allowed = true;
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Coleta TUDO em paralelo
    const [
      checkins, avaliacoes, cargas, anamnese, dieta, treinos, perfilTreino, carta,
    ] = await Promise.all([
      sb.from("evolucao_checkins").select("data_checkin,peso_kg,bf_percentual,massa_magra_kg,massa_gorda_kg,observacoes")
        .eq("user_id", aluno_id).order("data_checkin", { ascending: false }).limit(20),
      sb.from("avaliacoes_fisicas").select("*")
        .eq("aluno_id", aluno_id).order("data", { ascending: false }).limit(10),
      sb.from("historico_cargas").select("exercicio_nome,carga_kg,repeticoes_feitas,data_treino")
        .eq("user_id", aluno_id).order("data_treino", { ascending: false }).limit(300),
      sb.from("anamnese_aluno").select("*").eq("aluno_id", aluno_id).maybeSingle(),
      sb.from("dietas").select("objetivo,kcal_alvo,macros_alvo,observacoes_clinicas,created_at")
        .eq("user_id", aluno_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      sb.from("treinos_prescritos").select("dia_semana,exercicio,series,repeticoes,observacao")
        .eq("aluno_id", aluno_id).order("dia_semana").order("ordem").limit(200),
      sb.from("perfis_treino").select("*").eq("aluno_id", aluno_id).maybeSingle(),
      sb.from("cartas_atleta").select("posicao,nivel,atributos,estilo_dominante,estilo_secundario")
        .eq("aluno_id", aluno_id).maybeSingle(),
    ]);

    const contexto = {
      atleta: { nome: perfil.nome_completo, sexo: perfil.sexo },
      perfil_treino: perfilTreino.data,
      carta: carta.data,
      anamnese: anamnese.data,
      check_ins_recentes: checkins.data,
      avaliacoes_fisicas: avaliacoes.data,
      historico_cargas: cargas.data,
      dieta_atual: dieta.data,
      treino_prescrito: treinos.data,
    };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um analista 360° de performance de atletas (musculação, hipertrofia e composição corporal). Recebe TODO o histórico do atleta no app: anamnese, check-ins, avaliações, cargas, dieta e treino prescrito. Gere uma síntese precisa, objetiva e profissional, em PT-BR.

REGRAS:
- NÃO forneça recomendações de saúde, condutas médicas, sugestões de medicamentos ou suplementos.
- Em "pontos_atencao", liste observações descritivas — sem orientar ações terapêuticas.

Responda APENAS JSON válido com a estrutura:
{
  "score_geral": number (0-100),
  "resumo": string (2-3 frases),
  "evolucao_corporal": string,
  "performance_treino": string,
  "aderencia": string,
  "pontos_fortes": string[],
  "pontos_atencao": string[]
}
Seja específico citando números reais (kg, %, exercícios). Sem emojis. Sem markdown.`
          },
          {
            role: "user",
            content: `Dados do atleta:\n${JSON.stringify(contexto).slice(0, 60000)}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", t);
      throw new Error(`IA: ${aiResp.status}`);
    }
    const aiJson = await aiResp.json();
    const sintese = JSON.parse(aiJson.choices[0].message.content);

    return new Response(JSON.stringify({ sintese, contexto_resumo: {
      check_ins: checkins.data?.length ?? 0,
      avaliacoes: avaliacoes.data?.length ?? 0,
      cargas: cargas.data?.length ?? 0,
      treinos: treinos.data?.length ?? 0,
      biomarcadores: 0,
      analises: 0,
    }}), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("painel-360-sintese:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
