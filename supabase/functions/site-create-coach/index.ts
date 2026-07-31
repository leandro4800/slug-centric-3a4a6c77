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

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 40);

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

    // Autorização: apenas o dono do tenant alphateam ou um admin da plataforma
    const { data: ownedTenant } = await admin
      .from("tenants").select("id, slug").eq("owner_user_id", callerId).maybeSingle();
    const { data: adminRole } = await admin
      .from("user_roles").select("id").eq("user_id", callerId).eq("role", "admin").maybeSingle();

    const isPlatformOwner = ownedTenant?.slug === "alphateam" || !!adminRole;
    if (!isPlatformOwner) return json({ error: "Sem permissão" }, 403);

    const body = await req.json();
    const nome = String(body.nome || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const telefone = String(body.telefone || "").trim() || null;
    const slugInput = String(body.slug || "").trim();

    if (!nome || !email) return json({ error: "Nome e email são obrigatórios" }, 400);

    const firstName = nome
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().trim().split(/\s+/)[0].replace(/[^a-z0-9]/g, "");
    const password = `${firstName || "coach"}2026`;

    // slug único
    const base = slugify(slugInput || nome) || `coach${Date.now().toString().slice(-5)}`;
    let slug = base;
    for (let i = 2; i < 50; i++) {
      const { data: exists } = await admin.from("tenants").select("id").eq("slug", slug).maybeSingle();
      if (!exists) break;
      slug = `${base}${i}`;
    }

    // usuário
    let userId: string | null = null;
    let isExisting = false;
    const { data: existingProfile } = await admin
      .from("perfis").select("id").ilike("email", email).maybeSingle();

    if (existingProfile) {
      userId = existingProfile.id;
      isExisting = true;
      await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { nome_completo: nome },
      });
      if (createErr || !created.user) return json({ error: createErr?.message || "Falha ao criar usuário" }, 400);
      userId = created.user.id;
    }

    // tenant já existente do coach?
    const { data: coachTenant } = await admin
      .from("tenants").select("id, slug").eq("owner_user_id", userId).maybeSingle();

    let tenantId = coachTenant?.id as string | undefined;
    let tenantSlug = coachTenant?.slug as string | undefined;

    if (tenantId) {
      await admin.from("tenants").update({
        is_partner: true, free_access: true, status: "approved",
      }).eq("id", tenantId);
    } else {
      const { data: newTenant, error: tErr } = await admin.from("tenants").insert({
        nome, slug,
        owner_user_id: userId,
        status: "approved",
        is_partner: true,
        free_access: true,
      }).select("id, slug").single();
      if (tErr || !newTenant) return json({ error: tErr?.message || "Falha ao criar tenant" }, 400);
      tenantId = newTenant.id;
      tenantSlug = newTenant.slug;
    }

    await admin.from("perfis").upsert({
      id: userId, email, nome_completo: nome, telefone,
      tenant_id: tenantId, onboarding_completo: true,
    }, { onConflict: "id" });

    await admin.from("user_roles").upsert(
      { user_id: userId, role: "coach", tenant_id: tenantId },
      { onConflict: "user_id,role,tenant_id" },
    );

    // email de boas-vindas (best-effort)
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const painelUrl = "https://alpha-coach.app/site/login";
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h1 style="color:#000;">Bem-vindo(a), ${nome}! 🔥</h1>
            <p>Sua conta de <strong>coach parceiro</strong> no Alpha Coach Pro está ativa.</p>
            <div style="background:#f5f5f5;padding:16px;border-left:4px solid #E50914;margin:20px 0;">
              <p style="font-family:monospace;margin:4px 0;"><strong>Usuário:</strong> ${email}</p>
              <p style="font-family:monospace;margin:4px 0;"><strong>Senha:</strong> ${password}</p>
              <p style="font-family:monospace;margin:4px 0;"><strong>Seu link:</strong> https://alpha-coach.app/${tenantSlug}</p>
            </div>
            <p style="text-align:center;margin:32px 0;">
              <a href="${painelUrl}" style="background:#E50914;color:#fff;padding:14px 28px;text-decoration:none;font-weight:bold;text-transform:uppercase;font-size:13px;letter-spacing:1px;">ACESSAR PAINEL</a>
            </p>
            <p style="font-size:12px;color:#999;">Equipe Alpha Coach Pro</p>
          </div>`;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Alpha Coach Pro <suporte@alpha-coach.app>",
            to: [email],
            subject: "Seu acesso de coach parceiro — Alpha Coach Pro",
            html,
          }),
        });
      }
    } catch (e) {
      console.error("[site-create-coach] email error", e);
    }

    return json({ ok: true, user_id: userId, tenant_id: tenantId, slug: tenantSlug, password, existing: isExisting });
  } catch (e) {
    console.error("[site-create-coach] error", e);
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
