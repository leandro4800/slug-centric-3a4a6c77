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

    // Check if a user with this email already exists (may be aluno of another coach)
    let newUserId: string | null = null;
    let isMigration = false;

    const { data: existingProfile } = await admin
      .from("perfis")
      .select("id, tenant_id")
      .ilike("email", email)
      .maybeSingle();

    if (existingProfile) {
      // Verify there is no ACTIVE subscription in another tenant — student must "encerrar" first
      const { data: activeSubs } = await admin
        .from("assinaturas")
        .select("id, tenant_id, status")
        .eq("aluno_id", existingProfile.id)
        .in("status", ["active", "trialing", "past_due"]);

      const activeElsewhere = (activeSubs || []).filter((s) => s.tenant_id !== tenant.id);
      if (activeElsewhere.length > 0) {
        return new Response(JSON.stringify({
          error: "Este aluno possui uma assinatura ativa com outro coach. Ele precisa encerrar antes de migrar.",
        }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      newUserId = existingProfile.id;
      isMigration = true;

      // Reset password so the coach can deliver new credentials
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.auth as any).admin.updateUserById(newUserId, { password, email_confirm: true });
    } else {
      // Create user (admin)
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

    // Upsert profile with tenant + phone (handle_new_user trigger created basics)
    await admin.from("perfis").upsert({
      id: newUserId,
      email,
      nome_completo: nome,
      telefone,
      tenant_id: tenant.id,
      onboarding_completo: true,
    }, { onConflict: "id" });

    // Aluno role
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

    // Log migration for audit
    if (isMigration) {
      console.log(`[site-create-aluno] migration: user ${newUserId} -> tenant ${tenant.id}`);
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
