// Registra o primeiro acesso do aluno e avisa o admin da plataforma por e-mail.
// Idempotente: só dispara quando perfis.primeiro_acesso_em ainda está nulo.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "alphacoachapp@gmail.com";

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

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json({ error: "missing auth" }, 401);

    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    const user = userRes?.user;
    if (userErr || !user) return json({ error: "not authenticated" }, 401);

    const now = new Date();

    // Marca o primeiro acesso de forma atômica: só atualiza se ainda for nulo.
    const { data: updated, error: updErr } = await admin
      .from("perfis")
      .update({ primeiro_acesso_em: now.toISOString() })
      .eq("id", user.id)
      .is("primeiro_acesso_em", null)
      .select("id, nome_completo, email, tenant_id")
      .maybeSingle();

    if (updErr) {
      console.error("[notify-first-access] update", updErr.message);
      return json({ error: updErr.message }, 500);
    }
    if (!updated) return json({ ok: true, first: false });

    let tenantNome = "—";
    let tenantSlug = "";
    if (updated.tenant_id) {
      const { data: tenant } = await admin
        .from("tenants")
        .select("nome, slug")
        .eq("id", updated.tenant_id)
        .maybeSingle();
      tenantNome = tenant?.nome || "—";
      tenantSlug = tenant?.slug || "";
    }

    const nome = updated.nome_completo || user.user_metadata?.nome_completo || "—";
    const email = updated.email || user.email || "—";
    const quando = now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.warn("[notify-first-access] RESEND_API_KEY ausente");
      return json({ ok: true, first: true, emailed: false });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <p style="font-size:10px;letter-spacing:2px;color:#E50914;font-weight:bold;margin:0 0 8px;">ALPHA COACH PRO</p>
        <h1 style="color:#000;font-size:20px;margin:0 0 16px;">Primeiro acesso de aluno</h1>
        <div style="background:#f5f5f5;padding:16px;border-left:4px solid #E50914;margin:20px 0;">
          <p style="margin:4px 0;"><strong>Aluno:</strong> ${nome}</p>
          <p style="margin:4px 0;"><strong>E-mail:</strong> ${email}</p>
          <p style="margin:4px 0;"><strong>Coach / Tenant:</strong> ${tenantNome}${tenantSlug ? ` (/${tenantSlug})` : ""}</p>
          <p style="margin:4px 0;"><strong>Primeiro acesso:</strong> ${quando} (horário de Brasília)</p>
        </div>
      </div>`;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Alpha Coach Pro <suporte@alpha-coach.app>",
        to: [ADMIN_EMAIL],
        subject: `Primeiro acesso: ${nome} — ${tenantNome}`,
        html,
      }),
    });
    if (!resp.ok) {
      console.error("[notify-first-access] resend", resp.status, await resp.text());
      return json({ ok: true, first: true, emailed: false });
    }

    return json({ ok: true, first: true, emailed: true });
  } catch (e) {
    console.error("[notify-first-access]", e);
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
