// ============================================================================
// Edge function: gerar-card-treino
//
// Gera o BACKGROUND CINEMATOGRÁFICO do card de "Treino Concluído" via IA
// (cenário premium + atleta com identidade preservada). A camada de texto
// (nome, estatísticas, datas, logo) NÃO é gerada pela IA — é renderizada
// pelo React por cima da imagem, garantindo dados 100% corretos.
//
// Arquitetura:
//   - Motor de geração: _shared/image-generation.ts (provider/model
//     configuráveis via env CARD_IMAGE_MODEL, default google/gemini-3-pro-image)
//   - Referência 1 (identity): avatar do atleta (cartas_atleta / perfis)
//   - Referência 2 (style): imagem cinematográfica de direção de arte,
//     enviada pelo client em base64 (design_ref)
//   - Cache: perfis.card_bg_url / card_bg_meta (regenera só se mudar avatar,
//     cor primária do tenant ou modo). Storage: bucket público "avatars".
//
// Modos:
//   - full:     IA gera cenário + atleta (identidade preservada)
//   - scenario: IA gera só o cenário; o app compõe o avatar original por cima
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  generateImage,
  ImageGenerationError,
  type ReferenceImage,
} from "../_shared/image-generation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Mode = "full" | "scenario";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));

    const tenantId: string | null =
      typeof body.tenant_id === "string" && body.tenant_id ? body.tenant_id : null;
    const tenantNome: string = (body.tenant_nome ?? "").toString().trim().slice(0, 80);
    // Cor primária do tenant (hex preferido; hsl aceito). Nunca fixa vermelho.
    const primaryHex: string = (body.primary_hex ?? "").toString().trim().slice(0, 20);
    const primaryHsl: string = (body.primary ?? "").toString().trim().slice(0, 40);
    const primary = primaryHex || primaryHsl || "#E50914";
    const designRef: string | null =
      typeof body.design_ref === "string" && body.design_ref.startsWith("data:image")
        ? body.design_ref
        : null;
    const scenarioOnly: boolean = Boolean(body.scenario_only);
    const force: boolean = Boolean(body.force);

    // ---- Auth: somente o próprio usuário gera o próprio card ----
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return json({ error: "não autenticado" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // ---- Resolve avatar (identidade) + sexo (uniforme) + cache ----
    const [{ data: carta }, { data: perfil }] = await Promise.all([
      admin
        .from("cartas_atleta")
        .select("avatar_carta_url, foto_original_url")
        .eq("aluno_id", userId)
        .maybeSingle(),
      admin
        .from("perfis")
        .select("sexo, avatar_url, card_bg_url, card_bg_meta")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    const avatarUrl: string | null =
      carta?.avatar_carta_url || carta?.foto_original_url || perfil?.avatar_url || null;

    const mode: Mode = scenarioOnly || !avatarUrl ? "scenario" : "full";
    const cacheKeyAvatar = avatarUrl ?? "none";

    // ---- Cache: reutiliza a arte se nada relevante mudou ----
    const meta = (perfil?.card_bg_meta ?? null) as Record<string, unknown> | null;
    if (
      !force &&
      perfil?.card_bg_url &&
      meta?.v === 3 &&
      meta?.mode === mode &&
      meta?.tenant_id === tenantId &&
      meta?.primary === primary &&
      meta?.avatar === cacheKeyAvatar
    ) {
      return json({ card_url: perfil.card_bg_url, cached: true, mode });
    }

    // ---- Monta o prompt cinematográfico ----
    const isFem = (perfil?.sexo ?? "").toLowerCase().startsWith("f");
    const uniforme = isFem
      ? "a fitted black short-sleeve training rash guard and black gym leggings"
      : "a fitted black short-sleeve training rash guard and black training shorts ending above the knee";

    const identityPart =
      mode === "full"
        ? `Use the FIRST reference image as the athlete identity reference. Preserve the exact facial identity, face shape, hairstyle, beard, tattoos, skin tone, body characteristics, proportions and overall appearance of this person — the athlete must remain clearly and recognizably the SAME person. Do NOT replace the face, do NOT invent a different character. Dress the athlete in ${uniforme}.`
        : "";

    const stylePart = designRef
      ? `The ${mode === "full" ? "SECOND" : "FIRST"} reference image is ONLY art direction: use it to guide composition, framing, lighting, depth, atmosphere and visual hierarchy. Do NOT copy its text, typography, logos, numbers, or the person in it.`
      : "";

    // Zona segura vertical: o atleta inteiro fica entre 15% e 75% da altura,
    // com respiro acima da cabeça e abaixo dos pés — nunca encostado nas bordas.
    const subjectPart =
      mode === "full"
        ? "Place the athlete as the central protagonist, FULL BODY visible from head to feet, perfectly centered horizontally, standing in a confident powerful pose, looking at the camera. SAFE ZONE (critical): the entire body must fit between 15% and 75% of the image height — the top of the head below the 15% line and the soles of the feet above the 75% line, with clear breathing room above the head and below the feet. NEVER crop or cut the head, hair, hands or feet; never let any body part touch the top or bottom edge of the frame. Keep the surrounding space dark and clean because a UI overlay will be rendered over the top and bottom areas."
        : "Compose the scene WITHOUT any person: an empty protagonist spot in the vertical center (between 15% and 75% of the image height) where the light converges — a person will be composited there later. Keep the top 15% and bottom 25% dark and clean.";

    const prompt = `Cinematic premium fitness campaign photograph, vertical 9:16 composition. ${identityPart} ${stylePart} ${subjectPart} Setting: a dark premium professional gym at night, equipment blurred deep in the background, shallow depth of field. Behind the central subject, a large glowing geometric hexagonal portal structure made of light in the brand color ${primary}, with depth, inner glow and volumetric light rays. Strong rim light using the brand color ${primary}, dramatic studio lighting, volumetric lighting, subtle atmospheric smoke, floating dust particles catching the light, realistic wet reflective floor with light reflections, deep shadows, high cinematic contrast. CRITICAL: absolutely NO text, NO letters, NO numbers, NO typography, NO logos, NO watermarks anywhere in the image. Keep the top 22% and the bottom 32% of the frame darker and clean (soft vignette) because a UI overlay will be rendered there. High-end fitness advertising aesthetic, professional commercial photography, realistic skin texture, natural anatomy, extremely detailed, photorealistic, sharp focus.${tenantNome ? ` Brand context: team/gym "${tenantNome}".` : ""}`;

    // ---- Referências: 1) avatar (identity) 2) design cinematográfico (style) ----
    const refs: ReferenceImage[] = [];
    if (mode === "full" && avatarUrl) refs.push({ url: avatarUrl, role: "identity" });
    if (designRef) refs.push({ url: designRef, role: "style" });

    const dataUrl = await generateImage({
      prompt,
      referenceImages: refs,
      aspectRatio: "9:16",
    });

    // ---- Upload no bucket público "avatars" (cache de cards) ----
    const base64 = dataUrl.split(",")[1];
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const path = `cards/${tenantId ?? "global"}/${userId}-${mode}.png`;
    const { error: upErr } = await admin.storage
      .from("avatars")
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    if (upErr) throw upErr;
    const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);
    const cardUrl = `${pub.publicUrl}?v=${Date.now()}`;

    // ---- Atualiza cache no perfil ----
    await admin
      .from("perfis")
      .update({
        card_bg_url: cardUrl,
        card_bg_meta: {
          v: 2,
          mode,
          tenant_id: tenantId,
          primary,
          avatar: cacheKeyAvatar,
          generated_at: new Date().toISOString(),
        },
      })
      .eq("id", userId);

    return json({ card_url: cardUrl, cached: false, mode });
  } catch (e) {
    console.error("gerar-card-treino error:", e);
    if (e instanceof ImageGenerationError) {
      const friendly =
        e.status === 429
          ? "Limite de geração atingido, tente em instantes."
          : e.status === 402
            ? "Créditos da IA esgotados."
            : e.message;
      return json({ error: friendly }, e.status);
    }
    return json({ error: e instanceof Error ? e.message : "erro" }, 500);
  }
});
