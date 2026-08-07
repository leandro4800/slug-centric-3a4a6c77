// Envia o e-mail de boas-vindas com as credenciais para alunos que se cadastram
// pela landing page do coach (fluxo "Entrar grátis").
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

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const nome = String(body.nome || "").trim();
    const slug = String(body.slug || "").trim();
    const password = String(body.password || "").trim();

    if (!email || !slug || !password) return json({ error: "dados incompletos" }, 400);

    // Só permite envio para tenants com acesso gratuito liberado (evita abuso).
    const { data: tenant } = await admin
      .from("tenants")
      .select("id, slug, nome, free_access, status")
      .eq("slug", slug)
      .maybeSingle();
    if (!tenant || !tenant.free_access || tenant.status !== "approved") {
      return json({ error: "tenant inválido" }, 400);
    }

    // Só envia se a conta realmente existe (foi criada agora no cadastro).
    const { data: perfil } = await admin
      .from("perfis")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (!perfil) return json({ error: "conta não encontrada" }, 404);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "RESEND_API_KEY não configurada" }, 500);

    const loginUrl = `https://alpha-coach.app/${tenant.slug}/login`;
    const resetUrl = `https://alpha-coach.app/forgot-password`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h1 style="color:#000;">Olá${nome ? `, ${nome}` : ""}! 💪</h1>
        <p>Sua conta em <strong>${tenant.nome || "Alpha Coach Pro"}</strong> foi criada com sucesso.</p>
        <div style="background:#f5f5f5;padding:16px;border-left:4px solid #E50914;margin:20px 0;">
          <p style="font-size:10px;letter-spacing:2px;color:#E50914;font-weight:bold;margin:0 0 8px;">SEUS DADOS DE ACESSO</p>
          <p style="font-family:monospace;margin:4px 0;"><strong>Usuário:</strong> ${email}</p>
          <p style="font-family:monospace;margin:4px 0;"><strong>Senha:</strong> ${password}</p>
        </div>
        <p style="text-align:center;margin:32px 0;">
          <a href="${loginUrl}" style="background:#E50914;color:#fff;padding:14px 28px;text-decoration:none;font-weight:bold;text-transform:uppercase;font-size:13px;letter-spacing:1px;">ENTRAR NO APP</a>
        </p>
        <p style="font-size:13px;color:#555;">
          Quer trocar a senha? Você pode <a href="${resetUrl}" style="color:#E50914;">redefinir sua senha aqui</a>
          ou alterar depois no app em <strong>Perfil → Trocar senha</strong>.
        </p>
        <p style="font-size:12px;color:#999;">Equipe ${tenant.nome || "Alpha Coach Pro"}</p>
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
    if (!resp.ok) {
      const t = await resp.text();
      console.error("[landing-welcome-email] resend error", resp.status, t);
      return json({ error: `falha ao enviar (${resp.status})` }, 502);
    }

    return json({ ok: true });
  } catch (e) {
    console.error("[landing-welcome-email]", e);
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
