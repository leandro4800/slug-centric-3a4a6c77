// Cria a conta do aluno pela landing do coach SEM passar pelo e-mail de
// confirmação do GoTrue (que tem rate limit baixo). Usa service role para
// criar o usuário já confirmado e dispara o e-mail de credenciais via Resend.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

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
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const nome = String(body.nome || "").trim();
    const slug = String(body.slug || "").trim();
    const password = String(body.password || "").trim();

    if (!email || !nome || !slug || password.length < 6) {
      return json({ error: "dados incompletos" }, 400);
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: "e-mail inválido" }, 400);
    }

    const { data: tenant } = await admin
      .from("tenants")
      .select("id, slug, nome, free_access, status")
      .eq("slug", slug)
      .maybeSingle();
    if (!tenant || !tenant.free_access || tenant.status !== "approved") {
      return json({ error: "tenant inválido ou sem acesso gratuito" }, 400);
    }

    // Já existe conta com esse e-mail?
    const { data: perfilExistente } = await admin
      .from("perfis")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    let userId = perfilExistente?.id as string | undefined;
    let created = false;

    if (!userId) {
      const { data: createdUser, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nome_completo: nome,
          tenant_id: tenant.id,
          tenant_slug: tenant.slug,
          signup_source: "tenant_landing",
        },
      });
      if (createErr) {
        // conta pode existir sem perfil
        if (/already/i.test(createErr.message)) {
          return json({ ok: true, existing: true, message: "conta já existe" });
        }
        return json({ error: createErr.message }, 400);
      }
      userId = createdUser.user!.id;
      created = true;
    }

    if (created) {
      await admin.from("perfis").upsert(
        { id: userId, nome_completo: nome, email, tenant_id: tenant.id },
        { onConflict: "id" },
      );
      await admin.from("user_roles").upsert(
        { user_id: userId, role: "aluno", tenant_id: tenant.id },
        { onConflict: "user_id,role,tenant_id" },
      );
    }

    // E-mail de boas-vindas (só faz sentido para conta recém-criada).
    let emailed = false;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (created && resendKey) {
      const loginUrl = `https://alpha-coach.app/${tenant.slug}/login`;
      const resetUrl = `https://alpha-coach.app/forgot-password`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <h1 style="color:#000;">Olá, ${nome.split(" ")[0]}! 💪</h1>
          <p>Sua conta em <strong>${tenant.nome || "Alpha Coach Pro"}</strong> foi criada com sucesso.</p>
          <div style="background:#f5f5f5;padding:16px;border-left:4px solid #E50914;margin:20px 0;">
            <p style="font-size:10px;letter-spacing:2px;color:#E50914;font-weight:bold;margin:0 0 8px;">SEUS DADOS DE ACESSO</p>
            <p style="font-family:monospace;margin:4px 0;"><strong>Usuário:</strong> ${email}</p>
            <p style="font-family:monospace;margin:4px 0;"><strong>Senha:</strong> ${password}</p>
          </div>
          <p style="text-align:center;margin:32px 0;">
            <a href="${loginUrl}" style="background:#E50914;color:#fff;padding:14px 28px;text-decoration:none;font-weight:bold;text-transform:uppercase;font-size:13px;letter-spacing:1px;">ENTRAR NO APP</a>
          </p>
          <p style="font-size:13px;color:#555;">Quer trocar a senha? <a href="${resetUrl}" style="color:#E50914;">Redefina aqui</a> ou no app em <strong>Perfil → Trocar senha</strong>.</p>
        </div>`;
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Alpha Coach Pro <suporte@alpha-coach.app>",
          to: [email],
          subject: `Bem-vindo(a) à ${tenant.nome || "Alpha Coach Pro"} — seus dados de acesso`,
          html,
        }),
      });
      emailed = resp.ok;
      if (!resp.ok) console.error("[landing-signup] resend", resp.status, await resp.text());
    }

    return json({ ok: true, created, existing: !created, emailed });
  } catch (e) {
    console.error("[landing-signup]", e);
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
