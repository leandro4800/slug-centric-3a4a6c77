// Redefine a senha para o padrão "primeironome2026" e reenvia o e-mail de
// boas-vindas para alunos que se cadastraram pela landing de um coach com
// acesso gratuito, mas não receberam as credenciais.
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

const senhaPadrao = (nome: string, email: string) => {
  const base = (nome || email.split("@")[0] || "aluno")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .split(/\s+/)[0]
    .replace(/[^a-z0-9]/g, "");
  return `${base || "aluno"}2026`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const body = await req.json().catch(() => ({}));
    const slug = String(body.slug || "").trim();
    const emails: string[] = Array.isArray(body.emails)
      ? body.emails.map((e: unknown) => String(e).trim().toLowerCase()).filter(Boolean)
      : [];

    if (!slug) return json({ error: "slug obrigatório" }, 400);

    const { data: tenant } = await admin
      .from("tenants")
      .select("id, slug, nome, free_access, status, owner_user_id")
      .eq("slug", slug)
      .maybeSingle();
    if (!tenant || !tenant.free_access || tenant.status !== "approved") {
      return json({ error: "tenant inválido ou sem acesso gratuito" }, 400);
    }

    let query = admin
      .from("perfis")
      .select("id, email, nome_completo")
      .eq("tenant_id", tenant.id);
    if (emails.length) query = query.in("email", emails);

    const { data: perfis, error: perfisErr } = await query;
    if (perfisErr) return json({ error: perfisErr.message }, 500);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "RESEND_API_KEY não configurada" }, 500);

    const loginUrl = `https://alpha-coach.app/${tenant.slug}/login`;
    const resetUrl = `https://alpha-coach.app/forgot-password`;
    const results: unknown[] = [];

    for (const p of perfis ?? []) {
      const email = (p.email || "").toLowerCase();
      if (!email) continue;
      // Nunca mexe na conta do próprio coach.
      if (p.id === (tenant as { owner_user_id?: string }).owner_user_id) continue;

      try {
        const password = senhaPadrao(p.nome_completo || "", email);
        const { error: updErr } = await admin.auth.admin.updateUserById(p.id, {
          password,
          email_confirm: true,
        });
        if (updErr) throw updErr;

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h1 style="color:#000;">Olá${p.nome_completo ? `, ${p.nome_completo.split(" ")[0]}` : ""}! 💪</h1>
            <p>Sua conta em <strong>${tenant.nome || "Alpha Coach Pro"}</strong> está ativa. Segue seu acesso:</p>
            <div style="background:#f5f5f5;padding:16px;border-left:4px solid #E50914;margin:20px 0;">
              <p style="font-size:10px;letter-spacing:2px;color:#E50914;font-weight:bold;margin:0 0 8px;">SEUS DADOS DE ACESSO</p>
              <p style="font-family:monospace;margin:4px 0;"><strong>Usuário:</strong> ${email}</p>
              <p style="font-family:monospace;margin:4px 0;"><strong>Senha:</strong> ${password}</p>
            </div>
            <p style="text-align:center;margin:32px 0;">
              <a href="${loginUrl}" style="background:#E50914;color:#fff;padding:14px 28px;text-decoration:none;font-weight:bold;text-transform:uppercase;font-size:13px;letter-spacing:1px;">ENTRAR NO APP</a>
            </p>
            <p style="font-size:13px;color:#555;">
              Você pode <a href="${resetUrl}" style="color:#E50914;">trocar a senha aqui</a> ou depois no app em <strong>Perfil → Trocar senha</strong>.
            </p>
            <p style="font-size:12px;color:#999;">Equipe ${tenant.nome || "Alpha Coach Pro"}</p>
          </div>`;

        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Alpha Coach Pro <suporte@alpha-coach.app>",
            to: [email],
            subject: `Seu acesso à ${tenant.nome || "Alpha Coach Pro"}`,
            html,
          }),
        });
        if (!resp.ok) throw new Error(`resend ${resp.status}: ${await resp.text()}`);

        results.push({ email, ok: true });
      } catch (e) {
        results.push({ email, error: String((e as Error).message || e) });
      }
    }

    return json({ ok: true, tenant: tenant.slug, results });
  } catch (e) {
    console.error("[resend-landing-credentials]", e);
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
