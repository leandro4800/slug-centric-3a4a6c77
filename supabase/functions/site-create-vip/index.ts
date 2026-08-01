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
    const observacao = String(body.observacao || "").trim() || null;

    if (!nome || !email) return json({ error: "Nome e email são obrigatórios" }, 400);

    const firstName = nome
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().trim().split(/\s+/)[0].replace(/[^a-z0-9]/g, "");
    const password = `${firstName || "vip"}2026`;

    const { data: alphateam } = await admin
      .from("tenants").select("id").eq("slug", "alphateam").maybeSingle();
    if (!alphateam) return json({ error: "Tenant alphateam não encontrado" }, 400);
    const tenantId = alphateam.id;

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
        user_metadata: { nome_completo: nome, tenant_id: tenantId },
      });
      if (createErr || !created.user) return json({ error: createErr?.message || "Falha ao criar usuário" }, 400);
      userId = created.user.id;
    }

    // perfil vinculado ao alphateam (não sobrescreve quem já é dono de outro tenant)
    const { data: ownsTenant } = await admin
      .from("tenants").select("id").eq("owner_user_id", userId).maybeSingle();

    await admin.from("perfis").upsert({
      id: userId,
      email,
      nome_completo: nome,
      telefone,
      tenant_id: ownsTenant?.id ?? tenantId,
      onboarding_completo: true,
    }, { onConflict: "id" });

    await admin.from("user_roles").upsert(
      { user_id: userId, role: "aluno", tenant_id: tenantId },
      { onConflict: "user_id,role,tenant_id" },
    );

    await admin.from("alunos").upsert(
      { id: userId, nome, tenant_id: tenantId },
      { onConflict: "id" },
    );

    // acesso livre (assinatura vitalícia) no alphateam
    const { data: plano } = await admin
      .from("planos").select("id").eq("tenant_id", tenantId).order("created_at").limit(1).maybeSingle();

    if (plano?.id) {
      await admin.from("assinaturas").upsert({
        aluno_id: userId,
        tenant_id: tenantId,
        plano_id: plano.id,
        status: "active",
        current_period_end: new Date(Date.now() + 100 * 365 * 24 * 3600 * 1000).toISOString(),
      }, { onConflict: "aluno_id,tenant_id" });
    }

    // registro do VIP
    const { data: vipRow } = await admin.from("vips_plataforma").upsert({
      user_id: userId,
      tenant_id: tenantId,
      nome, email, telefone, observacao,
      ativo: true,
      created_by: callerId,
    }, { onConflict: "email" }).select("id").maybeSingle();

    // email de boas-vindas (best-effort)
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h1 style="color:#000;">Bem-vindo(a), ${nome}! 🔥</h1>
            <p>Você recebeu um <strong>acesso VIP</strong> ao Alpha Coach Pro — acesso livre no time Alphateam.</p>
            <div style="background:#f5f5f5;padding:16px;border-left:4px solid #E50914;margin:20px 0;">
              <p style="font-family:monospace;margin:4px 0;"><strong>Usuário:</strong> ${email}</p>
              <p style="font-family:monospace;margin:4px 0;"><strong>Senha:</strong> ${password}</p>
              <p style="font-family:monospace;margin:4px 0;"><strong>Seu link:</strong> https://alpha-coach.app/alphateam</p>
            </div>
            <p style="text-align:center;margin:32px 0;">
              <a href="https://alpha-coach.app/alphateam/login" style="background:#E50914;color:#fff;padding:14px 28px;text-decoration:none;font-weight:bold;text-transform:uppercase;font-size:13px;letter-spacing:1px;">ACESSAR O APP</a>
            </p>
            <p style="font-size:12px;color:#999;">Equipe Alpha Coach Pro</p>
          </div>`;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Alpha Coach Pro <suporte@alpha-coach.app>",
            to: [email],
            subject: "Seu acesso VIP — Alpha Coach Pro",
            html,
          }),
        });
      }
    } catch (e) {
      console.error("[site-create-vip] email error", e);
    }

    return json({ ok: true, user_id: userId, vip_id: vipRow?.id, password, existing: isExisting });
  } catch (e) {
    console.error("[site-create-vip] error", e);
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
