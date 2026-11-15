// Resumo da manhã do Assistente do coach. Chamado de hora em hora (7h–20h de
// Brasília) pela rotina do banco. Envia no máximo um resumo por dia por coach,
// só quando há novidade, por e-mail e/ou push conforme a configuração.
// Nada é enviado aos alunos.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  agoraBrasilia,
  CONFIG_PADRAO,
  deveEnviarAgora,
  dentroDoHorario,
  montarResumo,
  type AlertaResumo,
  type ConfigResumo,
} from "../_shared/assistente-resumo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PAINEL_URL = "https://alpha-coach.app/site/admin/meu-negocio";

const isServiceRole = (token: string, serviceKey: string) => {
  if (!token) return false;
  if (serviceKey && token === serviceKey) return true;
  try {
    const part = token.split(".")[1];
    if (!part) return false;
    const claims = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return claims?.role === "service_role"; // assinatura validada na borda (verify_jwt)
  } catch {
    return false;
  }
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const bearer = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!isServiceRole(bearer, serviceKey)) return json({ error: "não autorizado" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, { auth: { persistSession: false } });
  const { hora, data: hoje, diaSemana } = agoraBrasilia();
  if (!dentroDoHorario(hora)) return json({ ok: true, enviados: 0, motivo: "fora do horário" });

  const agoraIso = new Date().toISOString();
  const { data: pendentes, error } = await admin
    .from("assistente_alertas")
    .select("id, tenant_id, tipo, prioridade, titulo, aluno_id, created_at")
    .eq("estado", "novo")
    .is("resumo_enviado_em", null)
    .limit(5000);
  if (error) return json({ error: error.message }, 500);
  if (!pendentes?.length) return json({ ok: true, enviados: 0 });

  const porTenant = new Map<string, AlertaResumo[]>();
  for (const a of pendentes) {
    if (!porTenant.has(a.tenant_id)) porTenant.set(a.tenant_id, []);
    porTenant.get(a.tenant_id)!.push(a as AlertaResumo);
  }
  const tenantIds = [...porTenant.keys()];

  const [{ data: configs }, { data: adiados }, { data: tenants }] = await Promise.all([
    admin.from("assistente_config").select("*").in("tenant_id", tenantIds),
    admin.from("assistente_alertas").select("tenant_id, aluno_id").in("tenant_id", tenantIds).gt("adiar_ate", agoraIso),
    admin.from("tenants").select("id, nome, owner_user_id").in("id", tenantIds),
  ]);
  const cfgMap = new Map((configs ?? []).map((c) => [c.tenant_id, c as unknown as ConfigResumo]));
  const adiadosSet = new Set((adiados ?? []).filter((x) => x.aluno_id).map((x) => `${x.tenant_id}:${x.aluno_id}`));
  const tenantMap = new Map((tenants ?? []).map((t) => [t.id, t]));

  const resultados: Array<{ tenant: string; push?: string; email?: string }> = [];
  const mesIni = `${hoje.slice(0, 7)}-01`;

  for (const tenantId of tenantIds) {
    const cfg: ConfigResumo = { ...CONFIG_PADRAO, ...(cfgMap.get(tenantId) ?? {}) };
    if (!deveEnviarAgora(cfg, hora, hoje)) continue;
    const tenant = tenantMap.get(tenantId);
    if (!tenant?.owner_user_id) continue;

    const alertas = porTenant.get(tenantId)!.filter((a) => !a.aluno_id || !adiadosSet.has(`${tenantId}:${a.aluno_id}`));

    // Receita do mês (já recebida) e, às segundas, o resumo semanal do negócio.
    const { data: fin } = await admin.rpc("assistente_financeiro_mes", { p_tenant: tenantId, p_mes: mesIni });
    const receitaMes = Number((fin as any)?.[0]?.receita_bruta ?? 0);
    let semana: { receitaCentavos: number; novos: number; sairam: number } | null = null;
    if (diaSemana === 1) {
      const desde = new Date(Date.now() - 7 * 86400_000).toISOString();
      const [{ data: pgs }, { data: evs }] = await Promise.all([
        admin.from("pagamentos").select("valor_bruto_centavos").eq("tenant_id", tenantId).eq("status", "pago").gte("data_pagamento", desde),
        admin.from("assinatura_eventos").select("tipo").eq("tenant_id", tenantId).gte("ocorreu_em", desde).in("tipo", ["entrou", "saiu"]),
      ]);
      semana = {
        receitaCentavos: (pgs ?? []).reduce((s, p) => s + (Number(p.valor_bruto_centavos) || 0), 0),
        novos: (evs ?? []).filter((e) => e.tipo === "entrou").length,
        sairam: (evs ?? []).filter((e) => e.tipo === "saiu").length,
      };
    }

    const { data: dono } = await admin.from("perfis").select("nome_completo, email, push_token").eq("id", tenant.owner_user_id).maybeSingle();
    const resumo = montarResumo({ alertas, cfg, nomeCoach: dono?.nome_completo, receitaMesCentavos: receitaMes, semana });
    if (!resumo) continue; // dia sem novidade, sem notificação

    // Reserva o envio do dia antes de enviar (evita duplicar se a rotina rodar duas vezes).
    await admin.from("assistente_config").upsert({ tenant_id: tenantId }, { onConflict: "tenant_id", ignoreDuplicates: true });
    const { data: reservado } = await admin
      .from("assistente_config")
      .update({ ultimo_resumo_data: hoje })
      .eq("tenant_id", tenantId)
      .or(`ultimo_resumo_data.is.null,ultimo_resumo_data.lt.${hoje}`)
      .select("tenant_id");
    if (!reservado?.length) continue;

    const r: { tenant: string; push?: string; email?: string } = { tenant: tenantId };

    if (cfg.canal_push && dono?.push_token) {
      try {
        const resp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/fcm-notifications`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({
            user_id: tenant.owner_user_id,
            title: resumo.titulo,
            body: resumo.corpo + (resumo.restantes > 0 ? ` + ${resumo.restantes} no painel.` : ""),
            data: { tipo: "assistente_resumo", url: "/site/admin/meu-negocio" },
          }),
        });
        r.push = resp.ok ? "ok" : `erro ${resp.status}`;
        if (!resp.ok) console.error("[assistente-resumo] push", resp.status, await resp.text());
      } catch (e) {
        r.push = "erro";
        console.error("[assistente-resumo] push", e);
      }
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (cfg.canal_email && dono?.email && resendKey) {
      const itensHtml = resumo.itens
        .map((a) => `<li style="margin:0 0 8px">${esc(a.titulo)}</li>`)
        .join("");
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color:#111">
          <h2 style="margin:0 0 8px">${esc(resumo.titulo)}</h2>
          <p style="margin:0 0 16px">${esc(resumo.corpo)}</p>
          <ul style="padding-left:18px;margin:0 0 16px">${itensHtml}</ul>
          ${resumo.restantes > 0 ? `<p style="margin:0 0 16px;color:#555">+ ${resumo.restantes} no painel</p>` : ""}
          <a href="${PAINEL_URL}" style="display:inline-block;background:#E50914;color:#fff;text-decoration:none;padding:12px 20px;font-weight:bold">Abrir o painel</a>
          <p style="margin:24px 0 0;font-size:12px;color:#777">Nenhuma mensagem é enviada aos seus alunos sem você aprovar. Você pode mudar o horário ou desligar este resumo em Meu negócio → Assistente → Configurar.</p>
        </div>`;
      try {
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Alpha Coach Pro <suporte@alpha-coach.app>",
            to: [dono.email],
            subject: `${resumo.titulo} ${resumo.corpo.split(".")[0]}`.slice(0, 140),
            html,
          }),
        });
        r.email = resp.ok ? "ok" : `erro ${resp.status}`;
        if (!resp.ok) console.error("[assistente-resumo] email", resp.status, await resp.text());
      } catch (e) {
        r.email = "erro";
        console.error("[assistente-resumo] email", e);
      }
    }

    await admin.from("assistente_alertas").update({ resumo_enviado_em: agoraIso }).in("id", resumo.incluidos);
    resultados.push(r);
  }

  return json({ ok: true, enviados: resultados.length, resultados, hora });
});
