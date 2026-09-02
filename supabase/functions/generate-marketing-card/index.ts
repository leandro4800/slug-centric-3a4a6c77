// ============================================================================
// Edge function: generate-marketing-card
//
// Gera a ARTE COMPLETA (imagem + textos) dos cards de divulgação do coach via
// IA, clonando o layout de uma imagem de referência por template.
// Mesmo padrão de gerar-card-treino: auth do próprio usuário, admin client
// com service role, _shared/image-generation.ts (Lovable AI Gateway).
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  generateImage,
  ImageGenerationError,
  type ReferenceImage,
} from "../_shared/image-generation.ts";
import {
  MARKETING_TEMPLATES,
  buildTemplatePrompt,
  pickVariation,
} from "../_shared/marketing-templates.ts";

// Limite de gerações NOVAS por coach por mês.
// (No futuro pode virar env var ou depender do plano do coach.)
const MONTHLY_GENERATION_LIMIT = 8;

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const templateId: string = (body.template_id ?? "").toString();
    const force: boolean = Boolean(body.force);

    const template = MARKETING_TEMPLATES[templateId];
    if (!template) return json({ error: "Template inválido." }, 400);

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

    // ---- Dados do coach (antes do cache: a foto define a validade do cache) ----
    const [{ data: cfg }, { data: perfil }] = await Promise.all([
      admin
        .from("coach_marketing_config")
        .select("photo_url, instagram_handle, phone")
        .eq("user_id", userId)
        .maybeSingle(),
      admin
        .from("perfis")
        .select("nome_completo, avatar_url, tenant_id")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    const fotoCoach: string | null = cfg?.photo_url || perfil?.avatar_url || null;
    const tenantId: string | null = (perfil as { tenant_id?: string } | null)?.tenant_id ?? null;

    // ---- Cache ----
    const { data: cached } = await admin
      .from("coach_marketing_cards")
      .select("*")
      .eq("user_id", userId)
      .eq("template_id", templateId)
      .maybeSingle();

    // Só reaproveita o card se a foto de origem for exatamente a mesma.
    const mesmaFoto =
      (cached?.source_photo_url ?? null) === (fotoCoach ?? null);

    if (!force && mesmaFoto && cached?.image_url && cached.status === "ready") {
      return json({ card_url: cached.image_url, cached: true });
    }


    // ---- Quota mensal ----
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const { count } = await admin
      .from("coach_marketing_generation_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", monthStart.toISOString());

    if ((count ?? 0) >= MONTHLY_GENERATION_LIMIT) {
      const next = new Date(monthStart);
      next.setUTCMonth(next.getUTCMonth() + 1);
      const dia = next.toLocaleDateString("pt-BR");
      return json(
        {
          error: `Limite de ${MONTHLY_GENERATION_LIMIT} gerações neste mês atingido. Volta dia ${dia}.`,
          quota_used: count ?? 0,
          quota_limit: MONTHLY_GENERATION_LIMIT,
        },
        429,
      );
    }

    // ---- Dados do coach ----
    const [{ data: cfg }, { data: perfil }] = await Promise.all([
      admin
        .from("coach_marketing_config")
        .select("photo_url, instagram_handle, phone")
        .eq("user_id", userId)
        .maybeSingle(),
      admin
        .from("perfis")
        .select("nome_completo, avatar_url, tenant_id")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    const fotoCoach: string | null = cfg?.photo_url || perfil?.avatar_url || null;
    const tenantId: string | null = (perfil as { tenant_id?: string } | null)?.tenant_id ?? null;

    const prompt = buildTemplatePrompt(templateId, {
      coach_nome: (perfil?.nome_completo || "COACH").toString().toUpperCase(),
      telefone: (cfg?.phone || "").toString(),
      instagram: (cfg?.instagram_handle || "").toString(),
      variation: pickVariation(templateId),
    });

    // Ordem obrigatória: 1ª = identidade do coach, 2ª = referência de estilo.
    const refs: ReferenceImage[] = [];
    if (fotoCoach) refs.push({ url: fotoCoach, role: "identity" });
    if (template.referenceImageUrl) {
      refs.push({ url: template.referenceImageUrl, role: "style" });
    }

    await admin.from("coach_marketing_cards").upsert(
      {
        user_id: userId,
        template_id: templateId,
        status: "generating",
        source_photo_url: fotoCoach,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,template_id" },
    );

    let dataUrl: string;
    try {
      dataUrl = await generateImage({
        prompt,
        referenceImages: refs,
        aspectRatio: "9:16",
      });
    } catch (err) {
      await admin
        .from("coach_marketing_cards")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("template_id", templateId);
      throw err;
    }

    // ---- Upload ----
    const base64 = dataUrl.split(",")[1];
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const path = `marketing-cards/${tenantId ?? "global"}/${userId}-${templateId}.png`;
    const { error: upErr } = await admin.storage
      .from("avatars")
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    if (upErr) throw upErr;
    const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);
    const cardUrl = `${pub.publicUrl}?v=${Date.now()}`;

    const nowIso = new Date().toISOString();
    await admin.from("coach_marketing_cards").upsert(
      {
        user_id: userId,
        template_id: templateId,
        image_url: cardUrl,
        source_photo_url: fotoCoach,
        status: "ready",
        generated_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "user_id,template_id" },
    );

    await admin
      .from("coach_marketing_generation_log")
      .insert({ user_id: userId, template_id: templateId });

    return json({
      card_url: cardUrl,
      cached: false,
      quota_used: (count ?? 0) + 1,
      quota_limit: MONTHLY_GENERATION_LIMIT,
    });
  } catch (e) {
    console.error("generate-marketing-card error:", e);
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
