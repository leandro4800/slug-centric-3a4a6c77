import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function randomPassword(len = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

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

    // Generate password
    const password = randomPassword(10);

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

    // Send email with credentials via transactional email
    try {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "aluno-credenciais",
          recipientEmail: email,
          idempotencyKey: `aluno-cred-${newUserId}`,
          templateData: {
            nome,
            email,
            password,
            coachNome: tenant.nome,
            slug: tenant.slug,
          },
        },
      });
    } catch (e) {
      console.error("[site-create-aluno] email error", e);
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
