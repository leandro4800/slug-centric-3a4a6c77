// ============================================================================
// Edge function: generate-coach-hero
//
// Gera a FOTO DE TOPO do painel do coach (banner horizontal) usando o MESMO
// padrão de prompt do gerador de templates de divulgação:
//   - 1ª referência = foto do coach (identidade travada, sem alterar rosto)
//   - 2ª referência = logo do coach (aparece atrás dele, estilo backdrop)
//   - nome do coach estampado na camisa
//
// Cache/estado reaproveita a tabela coach_marketing_cards com
// template_id = "painel-hero" (nenhuma mudança de schema).
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  generateImage,
  ImageGenerationError,
  type ReferenceImage,
} from "../_shared/image-generation.ts";

const TEMPLATE_ID = "painel-hero";

// Logo padrão Alpha Coach Pro (aplicada no peito esquerdo da camisa de todos os tenants)
const ALPHA_LOGO_URL =
  "https://alpha-coach.app/__l5e/assets-v1/ee4283bc-8129-4970-8609-86f336684075/alpha-coach-pro-emblem.jpg";

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

const buildPrompt = (nome: string, temLogo: boolean) => `ABSOLUTE FACE PRESERVATION (HIGHEST PRIORITY — DO NOT VIOLATE): The face of the person in the FIRST reference image MUST be preserved with PHOTOGRAPHIC IDENTITY ACCURACY. Treat that face as a locked reference. DO NOT alter, reshape, slim, widen, smooth, beautify, age, de-age or stylize the face in any way. Preserve EXACTLY: nose shape and width, nostrils, mouth shape, lip thickness, philtrum, jawline, chin, cheekbones, eye shape and spacing, eyebrows, ears, skin tone, freckles, moles, scars, tattoos, facial hair pattern and density, hairline and haircut. IF THE PERSON IS SMILING IN THE REFERENCE PHOTO, KEEP THE EXACT SAME SMILE AND EXPRESSION — never change the facial expression. Keep their real body type and build.

TASK: Create a WIDE HORIZONTAL 16:9 cinematic dashboard hero banner for the fitness coach ${nome}.

COMPOSITION:
- The coach from the FIRST reference image stands on the RIGHT side of the frame, cropped from mid-thigh/waist up, arms crossed, direct gaze at camera, cinematic rim lighting.
- He/she wears a plain fitted dark athletic t-shirt with NO name and NO text printed on it. The SECOND reference image is the ALPHA COACH PRO logo (silver/red triangular "AC" emblem with the words ALPHA COACH PRO): render that exact logo SMALL and DISCREET on the LEFT CHEST of the t-shirt (viewer's right side of the chest), like an embroidered team crest — correct proportions, correct letters, subtly following the fabric folds and lighting. Do not put any other text on the shirt.
- BACKGROUND: a moody dark gym / studio with dramatic light beams, subtle haze and deep shadows.${temLogo ? `\n- The THIRD reference image is the COACH'S OWN LOGO. Render that exact logo VERY LARGE just behind and slightly ABOVE the coach's shoulder, emerging from behind his/her body on the upper-left of the subject, like a monumental 3D metallic brand emblem mounted on the back wall, glowing with rim light. The coach's body partially occludes the lower-right part of the logo. Keep the logo's exact shapes, letters and proportions — do not redesign it.` : ""}
- The LEFT third of the frame must stay visually calm and darker (empty negative space) so that UI text can be overlaid on top of it.
- Smooth dark gradient fading on the left and bottom edges so the banner blends into a dark interface.

STYLE: premium, cinematic, high-contrast, sharp photographic realism, editorial fitness campaign look. No extra text, no watermarks, no captions, no logos other than the Alpha Coach Pro chest crest and the coach's own logo, no borders.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const force: boolean = Boolean(body.force);

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

    const [{ data: cfg }, { data: perfil }] = await Promise.all([
      admin
        .from("coach_marketing_config")
        .select("photo_url")
        .eq("user_id", userId)
        .maybeSingle(),
      admin
        .from("perfis")
        .select("nome_completo, avatar_url, tenant_id")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    const fotoCoach: string | null = cfg?.photo_url || perfil?.avatar_url || null;
    if (!fotoCoach) {
      return json({ error: "Envie sua foto primeiro para gerar a arte do painel." }, 400);
    }
    const tenantId: string | null = (perfil as { tenant_id?: string } | null)?.tenant_id ?? null;

    let logoUrl: string | null = null;
    let nomeTenant: string | null = null;
    if (tenantId) {
      const { data: t } = await admin
        .from("tenants")
        .select("logo_url, nome")
        .eq("id", tenantId)
        .maybeSingle();
      logoUrl = (t as { logo_url?: string } | null)?.logo_url ?? null;
      nomeTenant = (t as { nome?: string } | null)?.nome ?? null;
    }

    const nome = (perfil?.nome_completo || nomeTenant || "COACH").toString().toUpperCase();

    const { data: cached } = await admin
      .from("coach_marketing_cards")
      .select("*")
      .eq("user_id", userId)
      .eq("template_id", TEMPLATE_ID)
      .maybeSingle();

    const mesmaFoto = (cached?.source_photo_url ?? null) === fotoCoach;
    if (!force && mesmaFoto && cached?.image_url && cached.status === "ready") {
      return json({ hero_url: cached.image_url, cached: true });
    }

    const refs: ReferenceImage[] = [{ url: fotoCoach, role: "identity" }];
    if (logoUrl) refs.push({ url: logoUrl, role: "style" });

    await admin.from("coach_marketing_cards").upsert(
      {
        user_id: userId,
        template_id: TEMPLATE_ID,
        status: "generating",
        source_photo_url: fotoCoach,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,template_id" },
    );

    let dataUrl: string;
    try {
      dataUrl = await generateImage({
        prompt: buildPrompt(nome, Boolean(logoUrl)),
        referenceImages: refs,
        aspectRatio: "16:9",
      });
    } catch (err) {
      await admin
        .from("coach_marketing_cards")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("template_id", TEMPLATE_ID);
      throw err;
    }

    const base64 = dataUrl.split(",")[1];
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const path = `painel-hero/${tenantId ?? "global"}/${userId}-${Date.now()}.png`;
    const { error: upErr } = await admin.storage
      .from("avatars")
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    if (upErr) throw upErr;
    const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);
    const heroUrl = `${pub.publicUrl}?v=${Date.now()}`;

    const nowIso = new Date().toISOString();
    await admin.from("coach_marketing_cards").upsert(
      {
        user_id: userId,
        template_id: TEMPLATE_ID,
        image_url: heroUrl,
        source_photo_url: fotoCoach,
        status: "ready",
        generated_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "user_id,template_id" },
    );

    return json({ hero_url: heroUrl, cached: false });
  } catch (e) {
    console.error("generate-coach-hero error:", e);
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
