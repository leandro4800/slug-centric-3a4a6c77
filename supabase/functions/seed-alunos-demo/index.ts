import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TENANT_SLUG = "demo";

const ALUNOS = [
  { email: "samila.demo@coach.app", nome: "Samila Dias", sexo: "F", idade: 28, peso: 62.5, altura: 168, bf: 22, objetivo: "Hipertrofia" },
  { email: "marcus.demo@coach.app", nome: "Marcus Silva", sexo: "M", idade: 32, peso: 84, altura: 178, bf: 18, objetivo: "Força" },
  { email: "jonas.demo@coach.app", nome: "Jonas Toek", sexo: "M", idade: 24, peso: 75, altura: 175, bf: 14, objetivo: "Definição" },
  { email: "execution.demo@coach.app", nome: "Execution Mode", sexo: "M", idade: 29, peso: 88, altura: 182, bf: 12, objetivo: "Performance" },
];

const SENHA = "Demo@1234";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Resolve tenant by slug
  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", TENANT_SLUG)
    .maybeSingle();

  if (tenantErr || !tenant) {
    return new Response(
      JSON.stringify({ error: `Tenant '${TENANT_SLUG}' not found`, details: tenantErr?.message }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const TENANT_ID = tenant.id;

  const results: any[] = [];

  for (const a of ALUNOS) {
    try {
      // 1. Cria/recupera usuário em auth
      let userId: string | null = null;
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: a.email,
        password: SENHA,
        email_confirm: true,
        user_metadata: { nome_completo: a.nome },
      });

      if (createErr && !String(createErr.message).toLowerCase().includes("already")) {
        results.push({ email: a.email, error: createErr.message });
        continue;
      }

      if (created?.user) {
        userId = created.user.id;
      } else {
        // já existe — busca
        const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        userId = list?.users.find((u) => u.email === a.email)?.id || null;
      }

      if (!userId) {
        results.push({ email: a.email, error: "user not found after create" });
        continue;
      }

      // 2. Garante perfil + tenant (upsert caso o trigger não tenha corrido)
      await supabase
        .from("perfis")
        .upsert(
          { id: userId, email: a.email, nome_completo: a.nome, tenant_id: TENANT_ID },
          { onConflict: "id" } as any,
        );

      // 3. Upsert perfil de treino
      await supabase.from("perfis_treino").upsert(
        {
          aluno_id: userId,
          tenant_id: TENANT_ID,
          sexo: a.sexo,
          idade: a.idade,
          peso_kg: a.peso,
          altura_cm: a.altura,
          bf_pct: a.bf,
          objetivo: a.objetivo,
          frequencia_semanal: 4,
          tempo_treino: "60min",
        },
        { onConflict: "aluno_id" } as any,
      );

      // 4. Atribui role 'aluno'
      await supabase.from("user_roles").upsert(
        { user_id: userId, tenant_id: TENANT_ID, role: "aluno" },
        { onConflict: "user_id,tenant_id,role" } as any,
      );

      results.push({ email: a.email, id: userId, ok: true });
    } catch (e: any) {
      results.push({ email: a.email, error: e?.message || String(e) });
    }
  }

  return new Response(
    JSON.stringify({ tenant_id: TENANT_ID, senha: SENHA, results }, null, 2),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
