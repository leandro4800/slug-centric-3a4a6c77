import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const COACHES = [
  { email: "Francolenine@bol.com.br", password: "franco2026", nome: "Coach Franco" },
  { email: "pedropassos.he@gmail.com", password: "pedro2026", nome: "Pedro Passos" },
  { email: "brennoalvezx@gmail.com", password: "brenno2026", nome: "Brenno Alves" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results: any[] = [];

  for (const c of COACHES) {
    try {
      // Find existing user by email
      const { data: list } = await supa.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users?.find(
        (u) => (u.email ?? "").toLowerCase() === c.email.toLowerCase(),
      );

      let userId: string;
      if (existing) {
        const { error } = await supa.auth.admin.updateUserById(existing.id, {
          password: c.password,
          email_confirm: true,
        });
        if (error) throw error;
        userId = existing.id;
        results.push({ email: c.email, action: "updated", id: userId });
      } else {
        const { data, error } = await supa.auth.admin.createUser({
          email: c.email,
          password: c.password,
          email_confirm: true,
          user_metadata: { nome_completo: c.nome },
        });
        if (error) throw error;
        userId = data.user!.id;
        results.push({ email: c.email, action: "created", id: userId });
      }
    } catch (e: any) {
      results.push({ email: c.email, error: e.message });
    }
  }

  return new Response(JSON.stringify({ ok: true, results }, null, 2), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
