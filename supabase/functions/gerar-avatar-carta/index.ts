// Edge function: gera avatar estilo EA FC a partir da foto do atleta
// usando Lovable AI (Nano Banana). Variantes: carta (default), treinando, celebracao.
// Faz cache: se já existir o avatar dessa variante no perfil, retorna sem gastar IA.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Variant = "carta" | "treinando" | "celebracao";

const VARIANT_FIELD: Record<Variant, string> = {
  carta: "avatar_url",
  treinando: "avatar_treinando_url",
  celebracao: "avatar_celebracao_url",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const foto_url: string | undefined = body.foto_url;
    const sexo: string | undefined = body.sexo;
    const variant: Variant = (["carta", "treinando", "celebracao"].includes(body.variant) ? body.variant : "carta");
    const force: boolean = Boolean(body.force);

    if (!foto_url) {
      return new Response(JSON.stringify({ error: "foto_url obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Cache: se já existe avatar da variante e não foi pedido force, retorna direto
    const field = VARIANT_FIELD[variant];
    if (!force) {
      const { data: perfilExist } = await admin
        .from("perfis")
        .select(field)
        .eq("id", userId)
        .maybeSingle();
      const cached = (perfilExist as any)?.[field];
      if (cached) {
        return new Response(JSON.stringify({ avatar_url: cached, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const isFem = (sexo ?? "").toLowerCase().startsWith("f");

    // Uniforme padrão (igual em todas as variantes): rash guard preta
    // + short de treino preto (acima do joelho para homens) / legging preta para mulheres
    const uniforme = isFem
      ? "vestindo rash guard preta justa de manga curta e legging preta de academia"
      : "vestindo rash guard preta justa de manga curta e short de treino preto que termina ACIMA DO JOELHO";

    // Pose conforme variante
    let pose = "";
    let extraMood = "";
    if (variant === "treinando") {
      pose = "em pose dinâmica de treino: executando uma rosca com halteres ou flexão isométrica, expressão concentrada, músculos contraídos";
      extraMood = " Atmosfera de academia premium ao fundo (desfocada), iluminação dramática lateral.";
    } else if (variant === "celebracao") {
      pose = "em pose vitoriosa de comemoração: braços erguidos para cima em V, punhos cerrados, sorriso confiante de conquista, olhando para o alto";
      extraMood = " Confetes dourados/prateados caindo ao fundo, raios de luz cinematográficos, vibe de campeão pós-conquista.";
    } else {
      pose = "em pose atlética de musculação em pé, mostrando da cabeça aos pés";
    }

    // Busca o nome do tenant para estampar na camisa/top
    let teamName = "";
    try {
      const { data: perfil } = await admin
        .from("perfis")
        .select("tenant_id")
        .eq("id", userId)
        .maybeSingle();
      if (perfil?.tenant_id) {
        const { data: tenant } = await admin
          .from("tenants")
          .select("nome")
          .eq("id", perfil.tenant_id)
          .maybeSingle();
        teamName = (tenant?.nome ?? "").toUpperCase().trim();
      }
    } catch (e) {
      console.warn("não foi possível obter nome do tenant:", e);
    }

    const estampa = teamName
      ? ` A frente da rash guard preta deve ter APENAS o texto "${teamName}" estampado em letras grandes, centralizadas, em branco com leve relevo, tipografia esportiva moderna sans-serif (estilo jersey de time), bem legível e nítido, sem distorções, sem outros símbolos, sem erros ortográficos.`
      : "";

    const prompt = `Gere um avatar 3D realista de CORPO INTEIRO estilo EA FC / FIFA Ultimate Team da pessoa nesta foto, mantendo fielmente o rosto, traços e tom de pele. A pessoa deve estar ${uniforme}, ${pose}. Fundo neutro escuro com leve glow dourado/prata cinematográfico. Iluminação AAA PS5, enquadramento vertical 3:5, corpo inteiro centralizado, sem cortes nas pernas ou cabeça.${extraMood}${estampa}`;

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: foto_url } },
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
      }
    );

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      if (aiResp.status === 429)
        return new Response(JSON.stringify({ error: "Limite atingido, tente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (aiResp.status === 402)
        return new Response(JSON.stringify({ error: "Créditos da IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      throw new Error("Falha na geração do avatar");
    }

    const data = await aiResp.json();
    const dataUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl) throw new Error("Avatar não retornado pela IA");

    // Upload para o bucket avatars
    const base64 = dataUrl.split(",")[1];
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const path = `${userId}/${variant}-${Date.now()}.png`;
    const { error: upErr } = await admin.storage
      .from("avatars")
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    if (upErr) throw upErr;
    const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    // Cacheia no perfil (campo correspondente à variante)
    await admin
      .from("perfis")
      .update({ [field]: publicUrl })
      .eq("id", userId);

    return new Response(JSON.stringify({ avatar_url: publicUrl, cached: false, variant }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gerar-avatar-carta error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
