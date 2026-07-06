import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    // Identify the caller (coach)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    // Find the tenant owned by the caller
    const { data: tenant, error: tenantErr } = await admin
      .from("tenants").select("id, slug, nome").eq("owner_user_id", callerId).maybeSingle();
    if (tenantErr || !tenant) {
      return new Response(JSON.stringify({ error: "Você não é dono de nenhum tenant" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const nome = String(body.nome || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const telefone = String(body.telefone || "").trim() || null;
    const planoId = body.plano_id || null;

    if (!nome || !email) {
      return new Response(JSON.stringify({ error: "Nome e email são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Password pattern: primeironome (minusculo, sem acento) + 2026 (ex.: samila2026)
    const firstName = nome
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().trim().split(/\s+/)[0].replace(/[^a-z0-9]/g, "");
    const password = `${firstName || "aluno"}2026`;

    // Check if a user with this email already exists (may already be aluno/coach elsewhere)
    let newUserId: string | null = null;
    let isExisting = false;
    let existingOwnsTenant = false;

    const { data: existingProfile } = await admin
      .from("perfis")
      .select("id, tenant_id")
      .ilike("email", email)
      .maybeSingle();

    if (existingProfile) {
      newUserId = existingProfile.id;
      isExisting = true;

      // If the user owns another tenant, preserve perfis.tenant_id (they stay coach there)
      const { data: ownedTenant } = await admin
        .from("tenants").select("id").eq("owner_user_id", newUserId).maybeSingle();
      existingOwnsTenant = !!ownedTenant;

      // Reset password so the coach can deliver new credentials
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.auth as any).admin.updateUserById(newUserId, { password, email_confirm: true });
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome_completo: nome, tenant_id: tenant.id },
      });

      if (createErr || !created.user) {
        return new Response(JSON.stringify({ error: createErr?.message || "Falha ao criar usuário" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      newUserId = created.user.id;
    }

    // Upsert profile: keep tenant_id if user already owns another tenant, otherwise set to caller's tenant
    const profileUpsert: Record<string, unknown> = {
      id: newUserId,
      email,
      nome_completo: nome,
      telefone,
      onboarding_completo: true,
    };
    if (!existingOwnsTenant) {
      profileUpsert.tenant_id = tenant.id;
    }
    await admin.from("perfis").upsert(profileUpsert, { onConflict: "id" });

    // Aluno role for the caller's tenant (multi-tenant safe)
    await admin.from("user_roles").upsert(
      { user_id: newUserId, role: "aluno", tenant_id: tenant.id },
      { onConflict: "user_id,role,tenant_id" }
    );

    // Subscription active (if plan provided)
    if (planoId) {
      await admin.from("assinaturas").upsert({
        aluno_id: newUserId,
        tenant_id: tenant.id,
        plano_id: planoId,
        status: "active",
        current_period_end: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: "aluno_id,tenant_id" });
    }

    if (isExisting) {
      console.log(`[site-create-aluno] linked existing user ${newUserId} as aluno of tenant ${tenant.id} (ownsTenant=${existingOwnsTenant})`);
    }

    // TEMPORARY BYPASS: domínio alpha-coach.app não verificado no Resend.
    // Envia direto via Resend usando onboarding@resend.dev e redireciona para o admin.
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (!resendKey) throw new Error("RESEND_API_KEY não configurada");

      const ADMIN_INBOX = "alphacoachapp@gmail.com";
      const loginUrl = tenant.slug ? `https://alpha-coach.app/${tenant.slug}/app` : "https://alpha-coach.app/login";

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <div style="background:#fff3cd;border:1px solid #ffeeba;color:#856404;padding:12px;border-radius:6px;margin-bottom:16px;font-size:13px;">
            <strong>[TESTE DE ONBOARDING]</strong> E-mail original do aluno: ${email}
          </div>
          <h1 style="color:#000;">Olá, ${nome}! 💪</h1>
          <p>Seu cadastro foi feito por <strong>${tenant.nome || "seu coach"}</strong>. Agora você tem acesso ao aplicativo.</p>
          <div style="background:#f5f5f5;padding:16px;border-left:4px solid #E50914;margin:20px 0;">
            <p style="font-size:10px;letter-spacing:2px;color:#E50914;font-weight:bold;margin:0 0 8px;">SEUS DADOS DE ACESSO</p>
            <p style="font-family:monospace;margin:4px 0;"><strong>Usuário:</strong> ${email}</p>
            <p style="font-family:monospace;margin:4px 0;"><strong>Senha temporária:</strong> ${password}</p>
          </div>
          <p style="text-align:center;margin:32px 0;">
            <a href="${loginUrl}" style="background:#E50914;color:#fff;padding:14px 28px;text-decoration:none;font-weight:bold;text-transform:uppercase;font-size:13px;letter-spacing:1px;">ENTRAR NO APP</a>
          </p>
          <p style="font-size:12px;color:#999;">Equipe ${tenant.nome || "AlphaCoach"}</p>
        </div>
      `;

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "AlphaCoach <onboarding@resend.dev>",
          to: [ADMIN_INBOX],
          subject: `[TESTE DE ONBOARDING] Credenciais de ${nome} (${email})`,
          html,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error("[site-create-aluno] resend error", resp.status, errText);
        throw new Error(`Falha ao enviar email (${resp.status}): ${errText}`);
      }
      console.log("[site-create-aluno] email de teste enviado para", ADMIN_INBOX, "(aluno original:", email, ")");
    } catch (e) {
      console.error("[site-create-aluno] email error", e);
      throw new Error(String((e as Error).message || e));
    }

    return new Response(JSON.stringify({ ok: true, user_id: newUserId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[site-create-aluno] error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
