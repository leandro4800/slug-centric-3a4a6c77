// Libera acesso manual de um aluno em um tenant (uso administrativo pontual).
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const TARGETS = [
  { email: "tiago.1905@hotmail.com", password: "tiago2026", nome: "Tiago", slug: "metodojackson" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const results: any[] = [];

  for (const t of TARGETS) {
    try {
      const { data: tenant } = await supa
        .from("tenants")
        .select("id, slug")
        .eq("slug", t.slug)
        .maybeSingle();
      if (!tenant) throw new Error("tenant não encontrado");

      const { data: list } = await supa.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users?.find(
        (u) => (u.email ?? "").toLowerCase() === t.email.toLowerCase(),
      );

      let userId: string;
      if (existing) {
        const { error } = await supa.auth.admin.updateUserById(existing.id, {
          password: t.password,
          email_confirm: true,
        });
        if (error) throw error;
        userId = existing.id;
      } else {
        const { data, error } = await supa.auth.admin.createUser({
          email: t.email,
          password: t.password,
          email_confirm: true,
          user_metadata: { nome_completo: t.nome },
        });
        if (error) throw error;
        userId = data.user!.id;
      }

      await supa.from("perfis").upsert(
        { id: userId, nome_completo: t.nome, email: t.email, tenant_id: tenant.id },
        { onConflict: "id" },
      );

      await supa.from("user_roles").upsert(
        { user_id: userId, role: "aluno", tenant_id: tenant.id },
        { onConflict: "user_id,role,tenant_id" },
      );

      const { data: plano } = await supa
        .from("planos")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .order("ordem", { ascending: true })
        .limit(1)
        .maybeSingle();

      await supa.from("assinaturas").upsert(
        {
          aluno_id: userId,
          tenant_id: tenant.id,
          plano_id: plano?.id ?? "11111111-1111-1111-1111-111111111111",
          status: "active",
          current_period_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 100).toISOString(),
        },
        { onConflict: "aluno_id,tenant_id" },
      );

      results.push({ email: t.email, user_id: userId, tenant: tenant.slug, ok: true });
    } catch (e: any) {
      results.push({ email: t.email, error: e?.message || String(e) });
    }
  }

  return new Response(JSON.stringify({ ok: true, results }, null, 2), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
