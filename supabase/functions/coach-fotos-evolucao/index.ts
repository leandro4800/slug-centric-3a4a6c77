import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const TIPOS = ["foto_frente_url", "foto_costas_url", "foto_lado_url"] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Não autenticado" }, 401);
    const callerId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: tenant } = await admin
      .from("tenants").select("id").eq("owner_user_id", callerId).maybeSingle();
    if (!tenant) return json({ error: "Você não é dono de nenhum tenant" }, 403);

    const body = await req.json().catch(() => ({}));
    const alunoId = String(body.aluno_id || "").trim();
    const action = String(body.action || "list");
    if (!alunoId) return json({ error: "aluno_id é obrigatório" }, 400);

    // Confirma vínculo do aluno com o tenant do coach
    const [{ data: perfil }, { data: role }] = await Promise.all([
      admin.from("perfis").select("id, nome_completo, tenant_id").eq("id", alunoId).maybeSingle(),
      admin.from("user_roles").select("user_id").eq("user_id", alunoId).eq("tenant_id", tenant.id).maybeSingle(),
    ]);
    const vinculado = (perfil?.tenant_id === tenant.id) || !!role || alunoId === callerId;
    if (!vinculado) return json({ error: "Aluno não pertence ao seu tenant" }, 403);

    const { data: checkins } = await admin
      .from("evolucao_checkins")
      .select("id, data_checkin, peso_kg, bf_percentual, foto_frente_url, foto_costas_url, foto_lado_url")
      .eq("user_id", alunoId)
      .order("data_checkin", { ascending: true })
      .limit(60);

    const lista = (checkins || []).filter((c: any) => TIPOS.some((t) => c[t]));

    if (action === "list") {
      const out = [];
      for (const c of lista) {
        const fotos: { angulo: string; url: string }[] = [];
        for (const t of TIPOS) {
          const path = (c as any)[t];
          if (!path) continue;
          const { data: signed } = await admin.storage.from("evolucao-fotos").createSignedUrl(path, 3600);
          if (signed?.signedUrl) fotos.push({ angulo: t.replace("foto_", "").replace("_url", ""), url: signed.signedUrl });
        }
        out.push({
          id: c.id,
          data_checkin: c.data_checkin,
          peso_kg: c.peso_kg,
          bf_percentual: c.bf_percentual,
          fotos,
        });
      }
      return json({ checkins: out });
    }

    if (action === "analisar") {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY ausente" }, 500);

      const antesId = body.antes_id ? String(body.antes_id) : lista[0]?.id;
      const depoisId = body.depois_id ? String(body.depois_id) : lista[lista.length - 1]?.id;
      const antes = lista.find((c: any) => c.id === antesId);
      const depois = lista.find((c: any) => c.id === depoisId);
      if (!antes || !depois) return json({ error: "Selecione dois check-ins com fotos" }, 400);

      const imagens: { role: string; angulo: string; dataUrl: string }[] = [];
      for (const c of [{ obj: antes, tag: "antes" }, { obj: depois, tag: "depois" }]) {
        for (const t of TIPOS) {
          const path = (c.obj as any)[t];
          if (!path) continue;
          const { data: file } = await admin.storage.from("evolucao-fotos").download(path);
          if (!file) continue;
          const buf = new Uint8Array(await file.arrayBuffer());
          let bin = "";
          for (let i = 0; i < buf.length; i += 0x8000) {
            bin += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + 0x8000)));
          }
          imagens.push({
            role: c.tag,
            angulo: t.replace("foto_", "").replace("_url", ""),
            dataUrl: `data:image/jpeg;base64,${btoa(bin)}`,
          });
        }
      }
      if (!imagens.length) return json({ error: "Nenhuma foto disponível para análise" }, 400);

      const deltaPeso = (Number(depois.peso_kg) - Number(antes.peso_kg)).toFixed(1);
      const deltaBF = depois.bf_percentual && antes.bf_percentual
        ? (Number(depois.bf_percentual) - Number(antes.bf_percentual)).toFixed(1)
        : null;

      const dadosTxt = `ATLETA: ${perfil?.nome_completo || "—"}
DADOS REAIS (use exatamente estes valores, não invente):
ANTES (${antes.data_checkin}): peso ${antes.peso_kg}kg${antes.bf_percentual ? `, BF ${antes.bf_percentual}%` : ""}
DEPOIS (${depois.data_checkin}): peso ${depois.peso_kg}kg${depois.bf_percentual ? `, BF ${depois.bf_percentual}%` : ""}
VARIAÇÃO PESO: ${deltaPeso}kg${deltaBF ? ` | VARIAÇÃO BF: ${deltaBF}%` : ""}

FOTOS ENVIADAS (em ordem):
${imagens.map((i, idx) => `${idx + 1}. ${i.role.toUpperCase()} - ${i.angulo}`).join("\n")}`;

      const systemPrompt = `Você é um Coach especialista em composição corporal e estética, analisando fotos de evolução para o coach responsável.
REGRAS:
1. Baseie-se EXCLUSIVAMENTE no que observa nas fotos e nos números fornecidos. Não invente dados.
2. Se as fotos tiverem baixa qualidade ou ângulos ruins, diga isso.
3. Compare ANTES vs DEPOIS por ângulo: definição, retenção, gordura abdominal/flancos, simetria, postura.
4. Cruze com a variação numérica de peso/BF e aponte hipóteses em caso de discrepância.
5. Linguagem técnica de coach, direta.
6. Estruture em: VEREDITO VISUAL, PONTOS FORTES, PONTOS A CORRIGIR, RECOMENDAÇÃO TÁTICA, PRÓXIMO CHECK-IN. Títulos em CAIXA ALTA, linha em branco entre parágrafos.`;

      const userContent: any[] = [{ type: "text", text: dadosTxt }];
      for (const img of imagens) {
        userContent.push({ type: "text", text: `--- ${img.role.toUpperCase()} / ${img.angulo} ---` });
        userContent.push({ type: "image_url", image_url: { url: img.dataUrl } });
      }

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) return json({ error: "Limite de requisições atingido. Tente em instantes." }, 429);
        if (aiResp.status === 402) return json({ error: "Créditos de IA insuficientes." }, 402);
        console.error("AI error", aiResp.status, await aiResp.text());
        return json({ error: "Erro na IA" }, 500);
      }

      const aiJson = await aiResp.json();
      return json({
        analise: aiJson.choices?.[0]?.message?.content ?? "",
        meta: { fotos_analisadas: imagens.length, delta_peso: deltaPeso, delta_bf: deltaBF },
      });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e: any) {
    console.error(e);
    return json({ error: e?.message || "Erro interno" }, 500);
  }
});
