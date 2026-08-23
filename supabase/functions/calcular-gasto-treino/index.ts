// Edge function: calcula o gasto calórico estimado (fórmula MET, determinística)
// de uma sessão de treino concluída e gera uma mensagem amigável via IA.
// Salva gasto_calorico_kcal e mensagem_gasto_calorico em sessoes_treino.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

function mensagemFallback(kcal: number, intensidade: string, deltaPct: number | null): string {
  const base = `Você queimou aproximadamente ${kcal} kcal hoje! Sessão de intensidade ${intensidade}.`;
  if (deltaPct === null) return base;
  if (Math.abs(deltaPct) < 5) return `${base} Dentro da sua média recente nesse treino.`;
  return `${base} ${Math.abs(deltaPct)}% ${deltaPct > 0 ? "acima" : "abaixo"} da sua média recente nesse treino.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { sessao_id } = await req.json();
    if (!sessao_id || typeof sessao_id !== "string") {
      return json({ error: "sessao_id é obrigatório" }, 400);
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Valida o chamador: precisa ser o dono da sessão ou coach/admin do tenant.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData } = await supa.auth.getUser(token);
    const user = userData?.user;
    if (!user) return json({ error: "Não autenticado" }, 401);

    const { data: sessao, error: errSessao } = await supa
      .from("sessoes_treino")
      .select("id, aluno_id, tenant_id, dia_semana, duracao_min, data_treino")
      .eq("id", sessao_id)
      .maybeSingle();
    if (errSessao || !sessao) return json({ error: "Sessão não encontrada" }, 404);

    if (sessao.aluno_id !== user.id) {
      const { data: papel } = await supa
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq("tenant_id", sessao.tenant_id)
        .in("role", ["coach", "admin"])
        .maybeSingle();
      if (!papel) return json({ error: "Sem permissão para esta sessão" }, 403);
    }

    // Volume total da sessão (series_executadas.volume_kg é coluna gerada)
    const { data: series } = await supa
      .from("series_executadas")
      .select("volume_kg")
      .eq("sessao_id", sessao_id);
    const volumeTotal = (series ?? []).reduce((s, r) => s + (Number(r.volume_kg) || 0), 0);

    const duracaoMin = Math.max(Number(sessao.duracao_min) || 60, 1);

    // Peso corporal mais recente (fallback 75kg)
    const { data: pesoRow } = await supa
      .from("peso_diario")
      .select("peso")
      .eq("aluno_id", sessao.aluno_id)
      .order("data", { ascending: false })
      .limit(1)
      .maybeSingle();
    const pesoKg = Number(pesoRow?.peso) > 0 ? Number(pesoRow.peso) : 75;

    // MET pela densidade da sessão (volume kg por minuto)
    const densidade = volumeTotal / duracaoMin;
    const met = densidade > 40 ? 7 : densidade >= 15 ? 5 : 3.5;
    const intensidade = met === 7 ? "intensa" : met === 5 ? "moderada" : "leve";
    const kcal = Math.round(met * pesoKg * (duracaoMin / 60));

    // Média recente do aluno nesse mesmo dia de treino
    let deltaPct: number | null = null;
    if (sessao.dia_semana) {
      const { data: hist } = await supa
        .from("sessoes_treino")
        .select("gasto_calorico_kcal")
        .eq("aluno_id", sessao.aluno_id)
        .eq("dia_semana", sessao.dia_semana)
        .neq("id", sessao.id)
        .not("gasto_calorico_kcal", "is", null)
        .order("data_treino", { ascending: false })
        .limit(10);
      const vals = (hist ?? [])
        .map((h) => Number(h.gasto_calorico_kcal))
        .filter((v) => v > 0);
      if (vals.length > 0) {
        const media = vals.reduce((a, b) => a + b, 0) / vals.length;
        if (media > 0) deltaPct = Math.round(((kcal - media) / media) * 100);
      }
    }

    // Mensagem amigável via IA (só texto — o cálculo é determinístico)
    let mensagem = mensagemFallback(kcal, intensidade, deltaPct);
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (apiKey) {
      try {
        const prompt =
          `Escreva UMA frase curta, amigável e motivadora em português (máx 160 caracteres) para um aluno de academia que acabou de concluir um treino.\n` +
          `Dados: gasto estimado de ${kcal} kcal, intensidade ${intensidade}, duração ${duracaoMin} min` +
          (deltaPct !== null
            ? `, ${Math.abs(deltaPct)}% ${deltaPct >= 0 ? "acima" : "abaixo"} da média recente dele nesse mesmo treino`
            : ", primeiro registro de gasto calórico desse treino") +
          `.\nSem markdown, sem aspas, no máximo 1 emoji. Responda APENAS a frase.`;
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          const content = String(data?.choices?.[0]?.message?.content ?? "").trim();
          if (content && content.length <= 300) mensagem = content;
        }
      } catch (e) {
        console.warn("[calcular-gasto-treino] IA falhou, usando fallback:", e);
      }
    }

    const { error: errUpd } = await supa
      .from("sessoes_treino")
      .update({ gasto_calorico_kcal: kcal, mensagem_gasto_calorico: mensagem })
      .eq("id", sessao_id);
    if (errUpd) return json({ error: `Erro ao salvar: ${errUpd.message}` }, 500);

    return json({
      ok: true,
      gasto_calorico_kcal: kcal,
      mensagem_gasto_calorico: mensagem,
      met,
      intensidade,
      densidade: Math.round(densidade * 10) / 10,
      delta_pct: deltaPct,
    });
  } catch (e) {
    console.error("[calcular-gasto-treino] erro", e);
    return json({ error: (e as Error).message }, 500);
  }
});
