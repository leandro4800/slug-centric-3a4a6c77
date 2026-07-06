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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    // Tenant do coach chamador
    const { data: tenant, error: tenantErr } = await admin
      .from("tenants").select("id").eq("owner_user_id", callerId).maybeSingle();
    if (tenantErr || !tenant) {
      return new Response(JSON.stringify({ error: "Você não é dono de nenhum tenant" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const alunoId = String(body.aluno_id || "").trim();
    if (!alunoId) {
      return new Response(JSON.stringify({ error: "aluno_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Nunca deixar o coach se auto-excluir por engano
    if (alunoId === callerId) {
      return new Response(JSON.stringify({ error: "Você não pode excluir sua própria conta por aqui." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Confirma que o aluno pertence a este tenant (via perfis OU user_roles OU assinaturas)
    const [{ data: perfil }, { data: role }, { data: assinatura }] = await Promise.all([
      admin.from("perfis").select("id, tenant_id").eq("id", alunoId).maybeSingle(),
      admin.from("user_roles").select("user_id").eq("user_id", alunoId).eq("tenant_id", tenant.id).eq("role", "aluno").maybeSingle(),
      admin.from("assinaturas").select("id").eq("aluno_id", alunoId).eq("tenant_id", tenant.id).maybeSingle(),
    ]);

    const belongsToTenant = (perfil?.tenant_id === tenant.id) || !!role || !!assinatura;
    if (!belongsToTenant) {
      return new Response(JSON.stringify({ error: "Este aluno não pertence ao seu tenant." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifica se este usuário é dono de outro tenant (ex.: também é coach em outro lugar).
    // Se for, NÃO apagamos o auth user — só desvinculamos deste tenant.
    const { data: ownsOtherTenant } = await admin
      .from("tenants").select("id").eq("owner_user_id", alunoId).maybeSingle();

    // 1) Remover role de aluno neste tenant
    await admin.from("user_roles")
      .delete()
      .eq("user_id", alunoId)
      .eq("tenant_id", tenant.id)
      .eq("role", "aluno");

    // 2) Remover assinaturas neste tenant
    await admin.from("assinaturas")
      .delete()
      .eq("aluno_id", alunoId)
      .eq("tenant_id", tenant.id);

    // 3) Se perfis.tenant_id aponta para este tenant, limpar (só se não for coach de outro tenant)
    if (perfil?.tenant_id === tenant.id) {
      await admin.from("perfis")
        .update({ tenant_id: null, onboarding_completo: false })
        .eq("id", alunoId);
    }

    // 4) Se o usuário NÃO é dono de outro tenant e não tem outros vínculos, apagar conta do auth
    if (!ownsOtherTenant) {
      const { data: otherRoles } = await admin
        .from("user_roles").select("user_id").eq("user_id", alunoId).limit(1);
      const { data: otherSubs } = await admin
        .from("assinaturas").select("id").eq("aluno_id", alunoId).limit(1);

      if ((!otherRoles || otherRoles.length === 0) && (!otherSubs || otherSubs.length === 0)) {
        try {
          // Limpa perfil antes de apagar auth user (evita orfãos)
          await admin.from("perfis").delete().eq("id", alunoId);
          await admin.from("alunos").delete().eq("id", alunoId);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (admin.auth as any).admin.deleteUser(alunoId);
        } catch (e) {
          console.warn("[site-delete-aluno] deleteUser falhou (mantendo dados desvinculados):", e);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, unlinked_only: !!ownsOtherTenant }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[site-delete-aluno] error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
