import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TENANT_ID = "305ebb8b-bb49-4cc0-a4d8-c4af5455f363"; // Demo Team

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

      // 2. Atualiza tenant no perfil (trigger handle_new_user já cria o perfil)
      await supabase
        .from("perfis")
        .update({ tenant_id: TENANT_ID, nome_completo: a.nome })
        .eq("id", userId);

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
