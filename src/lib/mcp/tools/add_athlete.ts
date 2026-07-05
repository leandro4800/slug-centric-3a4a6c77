import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, getServiceClient, jsonResult, resolveTenant } from "./_shared";

export default defineTool({
  name: "add_athlete",
  title: "Adicionar aluno",
  description:
    "Cria um novo aluno no tenant do coach. Envia convite por e-mail com senha temporária para que o aluno complete o onboarding no app.",
  inputSchema: {
    mcp_token: z.string(),
    nome_completo: z.string().min(2).describe("Nome completo do aluno."),
    email: z.string().describe("E-mail do aluno."),
    telefone: z.string().optional(),
    sexo: z.enum(["masculino", "feminino"]).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ mcp_token, nome_completo, email, telefone, sexo }) => {
    const auth = await resolveTenant(mcp_token);
    if (!auth.ok) return errorResult(auth.error);
    const supa = getServiceClient();
    const normalizedEmail = email.trim().toLowerCase();

    const { data: existing } = await supa
      .from("perfis")
      .select("id, tenant_id")
      .ilike("email", normalizedEmail)
      .maybeSingle();
    if (existing) {
      if (existing.tenant_id === auth.tenantId) {
        return errorResult(`Aluno ${normalizedEmail} já está cadastrado neste tenant (id=${existing.id}).`);
      }
      return errorResult(`E-mail já cadastrado em outro tenant.`);
    }

    const tempPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 12) + "A1!";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: created, error: createErr } = await (supa.auth as any).admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        nome_completo,
        tenant_id: auth.tenantId,
        sexo: sexo ?? null,
        telefone: telefone ?? null,
      },
    });
    if (createErr || !created?.user) {
      return errorResult(`Falha ao criar aluno: ${createErr?.message ?? "sem detalhes"}`);
    }

    const userId = created.user.id as string;
    // The handle_new_user trigger sets tenant_id on perfis; make sure extra fields land.
    await supa
      .from("perfis")
      .update({ telefone: telefone ?? null, sexo: sexo ?? null, nome_completo })
      .eq("id", userId);
    await supa
      .from("user_roles")
      .upsert({ user_id: userId, role: "aluno", tenant_id: auth.tenantId }, { onConflict: "user_id,role,tenant_id" });

    return jsonResult({
      ok: true,
      aluno: { id: userId, nome_completo, email: normalizedEmail, tenant: auth.tenantName },
      senha_temporaria: tempPassword,
      instrucoes:
        "Compartilhe a senha temporária com o aluno. Ele deve fazer login no app, alterar a senha e concluir o onboarding.",
    });
  },
});
