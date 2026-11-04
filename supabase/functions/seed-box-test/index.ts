import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Função de uso único: cria SOMENTE as contas fixas de teste do Box. Sem entrada do usuário.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const out: Record<string, unknown> = {};
  const SENHA = "box2026";

  async function ensureUser(email: string, nome: string) {
    const { data, error } = await sb.auth.admin.createUser({ email, password: SENHA, email_confirm: true, user_metadata: { nome_completo: nome } });
    if (data?.user) return data.user.id;
    if (error && !String(error.message).toLowerCase().includes("already")) throw error;
    const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const u = list?.users.find((x) => x.email === email);
    if (!u) throw new Error("usuário não encontrado: " + email);
    await sb.auth.admin.updateUserById(u.id, { password: SENHA, email_confirm: true });
    return u.id;
  }

  try {
    const coachId = await ensureUser("boxalphacoach@coach.app", "Coach Box Alphacoach");
    const alunoId = await ensureUser("boxaluno@coach.app", "Aluno Teste Box");

    let { data: tenant } = await sb.from("tenants").select("id").eq("slug", "box-alphacoach").maybeSingle();
    if (!tenant) {
      const ins = await sb.from("tenants").insert({
        slug: "box-alphacoach", nome: "Box Alphacoach", tagline: "CrossFit", vertical: "crossfit", vertical_manual: true,
        status: "approved", is_partner: true, free_access: true, owner_user_id: coachId, cidade: "Vitória", estado: "ES",
      }).select("id").single();
      if (ins.error) throw ins.error;
      tenant = ins.data;
    } else {
      await sb.from("tenants").update({ vertical: "crossfit", vertical_manual: true, status: "approved", is_partner: true, free_access: true, owner_user_id: coachId }).eq("id", tenant.id);
    }
    const T = tenant!.id;

    out.perfil_coach = (await sb.from("perfis").upsert({ id: coachId, email: "boxalphacoach@coach.app", nome_completo: "Coach Box Alphacoach", tenant_id: T, onboarding_completo: true }, { onConflict: "id" })).error?.message ?? "ok";
    out.perfil_aluno = (await sb.from("perfis").upsert({ id: alunoId, email: "boxaluno@coach.app", nome_completo: "Aluno Teste Box", tenant_id: T, onboarding_completo: true }, { onConflict: "id" })).error?.message ?? "ok";
    out.role_coach = (await sb.from("user_roles").upsert({ user_id: coachId, tenant_id: T, role: "coach" }, { onConflict: "user_id,tenant_id,role" })).error?.message ?? "ok";
    out.role_aluno = (await sb.from("user_roles").upsert({ user_id: alunoId, tenant_id: T, role: "aluno" }, { onConflict: "user_id,tenant_id,role" })).error?.message ?? "ok";

    const { data: sub } = await sb.from("assinaturas").select("id").eq("aluno_id", alunoId).eq("tenant_id", T).maybeSingle();
    if (!sub) {
      const end = new Date(); end.setFullYear(end.getFullYear() + 1);
      out.assinatura = (await sb.from("assinaturas").insert({ aluno_id: alunoId, tenant_id: T, status: "active", current_period_end: end.toISOString() })).error?.message ?? "ok";
    }

    let { data: turma } = await sb.from("box_turmas").select("id").eq("tenant_id", T).eq("nome", "Turma 6h").maybeSingle();
    if (!turma) turma = (await sb.from("box_turmas").insert({ tenant_id: T, nome: "Turma 6h", horario: "06:00" }).select("id").single()).data;
    await sb.from("box_turma_alunos").upsert({ tenant_id: T, turma_id: turma!.id, aluno_id: alunoId }, { onConflict: "turma_id,aluno_id" });

    const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    out.wod = (await sb.from("box_wods").upsert({
      tenant_id: T, turma_id: turma!.id, data: hoje, titulo: "Cindy adaptada", formato: "AMRAP", time_cap_seg: 720,
      aquecimento: "2 rounds: 200m run, 10 air squats, 5 inchworms, 10 ring rows",
      forca_skill: ["Back squat 5x5 a 70%"],
      movimentos: [
        { rx: "5 Pull-ups", scaled: "5 Ring rows" },
        { rx: "10 Push-ups", scaled: "10 Push-ups no joelho" },
        { rx: "15 Air squats", scaled: "15 Air squats" },
      ],
      acessorio: "3x15 hollow rock", publicado: true,
    }, { onConflict: "turma_id,data" })).error?.message ?? "ok";

    out.tenant_id = T;
    return new Response(JSON.stringify(out), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message, out }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
