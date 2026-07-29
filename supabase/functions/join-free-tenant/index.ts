// Concede assinatura gratuita ao aluno em um tenant marcado como free_access.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("missing auth");
    const { data: userRes } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userRes?.user;
    if (!user) throw new Error("not authenticated");

    const { tenant_id, tenant_slug } = await req.json();

    // Resolve tenant
    const tq = supabase.from("tenants").select("id, slug, free_access, status").limit(1);
    const { data: tenant } = tenant_id
      ? await tq.eq("id", tenant_id).maybeSingle()
      : await tq.eq("slug", tenant_slug).maybeSingle();

    if (!tenant) throw new Error("tenant not found");
    if (!tenant.free_access) throw new Error("tenant não permite acesso gratuito");
    if (tenant.status !== "approved") throw new Error("tenant não aprovado");

    // Pega um plano ativo qualquer para vincular; se não houver, usa plano placeholder
    const { data: plano } = await supabase
      .from("planos")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .limit(1)
      .maybeSingle();

    const plano_id = plano?.id ?? "11111111-1111-1111-1111-111111111111";

    await supabase.from("assinaturas").upsert(
      {
        aluno_id: user.id,
        tenant_id: tenant.id,
        plano_id,
        status: "active",
        current_period_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 100).toISOString(),
      },
      { onConflict: "aluno_id,tenant_id" }
    );

    await supabase.from("user_roles")
      .upsert({ user_id: user.id, role: "aluno", tenant_id: tenant.id }, { onConflict: "user_id,role,tenant_id" });

    await supabase.from("perfis")
      .update({ tenant_id: tenant.id })
      .eq("id", user.id)
      .is("tenant_id", null);

    return new Response(JSON.stringify({ ok: true, tenant_id: tenant.id, tenant_slug: tenant.slug }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    console.error("[join-free-tenant]", e?.message);
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
