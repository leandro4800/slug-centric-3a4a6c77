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

// O gateway às vezes não consegue baixar URLs de referência (assinadas, CDN,
// redirects) e responde 400 URL_REJECTED. Baixamos aqui e enviamos em base64.
async function toDataUrl(url: string): Promise<string | null> {
  if (url.startsWith("data:")) return url;
  try {
    const r = await fetch(url);
    if (!r.ok) {
      console.error("ref image fetch falhou", r.status, url);
      return null;
    }
    const buf = new Uint8Array(await r.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) {
      bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    }
    const mime = r.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    return `data:${mime};base64,${btoa(bin)}`;
  } catch (e) {
    console.error("ref image erro", url, e);
    return null;
  }
}

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Cola a logo original do coach (bytes reais, sem IA) sobre o banner gerado.
// Blend "lighten" (max por canal) para o fundo preto da logo sumir na parede escura.
async function overlayLogo(
  heroBytes: Uint8Array,
  logoDataUrl: string,
): Promise<Uint8Array> {
  const { Image, decode } = await import(
    "https://deno.land/x/imagescript@1.2.17/mod.ts"
  );
  const hero = (await decode(heroBytes)) as InstanceType<typeof Image>;
  const logoBytes = Uint8Array.from(
    atob(logoDataUrl.split(",")[1]),
    (c) => c.charCodeAt(0),
  );
  const logoRaw = (await decode(logoBytes)) as InstanceType<typeof Image>;

  const target = Math.round(hero.height * 0.6);
  const logo = logoRaw.clone().resize(
    logoRaw.width >= logoRaw.height ? target : Image.RESIZE_AUTO,
    logoRaw.width >= logoRaw.height ? Image.RESIZE_AUTO : target,
  );

  const offX = Math.round(hero.width * 0.34 - logo.width / 2);
  const offY = Math.round(hero.height * 0.44 - logo.height / 2);

  for (let y = 0; y < logo.height; y++) {
    const hy = offY + y;
    if (hy < 0 || hy >= hero.height) continue;
    for (let x = 0; x < logo.width; x++) {
      const hx = offX + x;
      if (hx < 0 || hx >= hero.width) continue;
      const [r, g, b, a] = Image.colorToRGBA(logo.getPixelAt(x + 1, y + 1));
      if (a === 0) continue;
      const [hr, hg, hb] = Image.colorToRGBA(hero.getPixelAt(hx + 1, hy + 1));
      hero.setPixelAt(
        hx + 1,
        hy + 1,
        Image.rgbaToColor(
          Math.max(hr, r),
          Math.max(hg, g),
          Math.max(hb, b),
          255,
        ),
      );
    }
  }
  return await hero.encode(1);
}

const buildPrompt = (nome: string, temLogo: boolean) => `ABSOLUTE FACE PRESERVATION (HIGHEST PRIORITY — DO NOT VIOLATE): The face of the person in the FIRST reference image MUST be preserved with PHOTOGRAPHIC IDENTITY ACCURACY. Treat that face as a locked reference. DO NOT alter, reshape, slim, widen, smooth, beautify, age, de-age or stylize the face in any way. Preserve EXACTLY: nose shape and width, nostrils, mouth shape, lip thickness, philtrum, jawline, chin, cheekbones, eye shape and spacing, eyebrows, ears, skin tone, freckles, moles, scars, tattoos, facial hair pattern and density, hairline and haircut. IF THE PERSON IS SMILING IN THE REFERENCE PHOTO, KEEP THE EXACT SAME SMILE AND EXPRESSION — never change the facial expression. Keep their real body type and build.

TASK: Create a WIDE HORIZONTAL 16:9 cinematic dashboard hero banner for the fitness coach ${nome}.

COMPOSITION:
- The coach from the FIRST reference image is anchored at the FAR RIGHT EDGE of the frame, directly below the download icon area, LARGE and PROMINENT (cropped from mid-thigh/waist up), arms crossed, direct gaze at camera, cinematic rim lighting. Shift the coach horizontally to the RIGHT so the body occupies the far-right empty space; do not place the coach in the center or extend the body toward the left. Keep the coach's existing size unchanged. POSITION THE COACH LOW IN THE FRAME: the coach's body sits in the LOWER portion of the banner so it appears directly above the bottom edge of the hero (right above the UI row that reads "x/4 concluidos" just below this banner). Do NOT push the coach up to the top edge — keep the head well below the top of the frame so the coach is never hidden behind the dashboard's top text and stat cards. The coach must be fully visible IN FRONT of the dashboard's stat cards, never hidden behind them.
- He/she wears a plain fitted dark athletic t-shirt with NO name and NO text printed on it. The SECOND reference image is the ALPHA COACH PRO logo (silver/red triangular "AC" emblem with the words ALPHA COACH PRO): render that exact logo SMALL and DISCREET on the LEFT CHEST of the t-shirt (viewer's right side of the chest), like an embroidered team crest — correct proportions, correct letters, subtly following the fabric folds and lighting. Do not put any other text on the shirt.
- BACKGROUND: a moody dark gym / studio with dramatic light beams, subtle haze and deep shadows.${temLogo ? `\n- IMPORTANT: leave the back wall on the LEFT-CENTER area, immediately behind the coach's head and shoulders, as a CLEAN, EMPTY, DARK wall surface (no posters, no signs, no letters, no emblems, no equipment) — a real logo will be placed there afterwards. Do NOT draw, invent or render ANY logo, badge, circle emblem or brand mark anywhere in the background.` : ""}
- NEVER place the ALPHA COACH PRO logo on the wall or anywhere in the background — the Alpha Coach Pro emblem appears ONLY as the small crest on the coach's chest.
- Only the LEFT EDGE of the frame (a narrow vertical strip) must stay visually calm and darker (negative space) so that UI text can be overlaid on top of it.
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

    const [fotoData, alphaData, logoData] = await Promise.all([
      toDataUrl(fotoCoach),
      toDataUrl(ALPHA_LOGO_URL),
      logoUrl ? toDataUrl(logoUrl) : Promise.resolve(null),
    ]);
    if (!fotoData) {
      return json({ error: "Não consegui ler sua foto. Envie a foto novamente." }, 400);
    }
    const refs: ReferenceImage[] = [{ url: fotoData, role: "identity" }];
    if (alphaData) refs.push({ url: alphaData, role: "style" });
    // A logo do coach NÃO vai como referência: a IA sempre redesenha o desenho
    // interno. Ela é colada pixel a pixel na imagem final (overlayLogo).


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
        prompt: buildPrompt(nome, Boolean(logoData)),
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
    let bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    // Cola a logo REAL do coach (cópia fiel, sem IA) na parede ao fundo.
    if (logoData) {
      try {
        bytes = await overlayLogo(bytes, logoData);
      } catch (e) {
        console.error("overlay logo falhou", e);
      }
    }
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
