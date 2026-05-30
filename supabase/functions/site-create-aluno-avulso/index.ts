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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: tenant, error: tenantErr } = await admin
      .from("tenants")
      .select("id, slug, nome")
      .eq("owner_user_id", callerId)
      .maybeSingle();
    if (tenantErr || !tenant) {
      return new Response(JSON.stringify({ error: "Você não é dono de nenhum tenant" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const nome = String(body.nome || "").trim();
    if (!nome) {
      return new Response(JSON.stringify({ error: "Nome é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sexo = body.sexo ? String(body.sexo) : null;
    const data_nascimento = body.data_nascimento ? String(body.data_nascimento) : null;
    const telefone = body.telefone ? String(body.telefone) : null;
    const email = body.email ? String(body.email).trim().toLowerCase() : null;

    // Gera UUID novo (sem auth user) — perfis.id é livre
    const newId = crypto.randomUUID();

    const { error: insertErr } = await admin.from("perfis").insert({
      id: newId,
      nome_completo: nome,
      sexo,
      data_nascimento,
      telefone,
      email,
      tenant_id: tenant.id,
      onboarding_completo: true,
    });

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, aluno_id: newId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[site-create-aluno-avulso] error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
