// Resumo da manhã do Assistente do coach. Chamado de hora em hora (7h–20h de
// Brasília) pela rotina do banco. Envia no máximo um resumo por dia por coach,
// só quando há novidade, por e-mail e/ou push conforme a configuração.
// Às segundas vai o resumo completo da semana (panorama de todos os alunos),
// mesmo sem alertas novos; nos outros dias, só as novidades.
// Nada é enviado aos alunos.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  agoraBrasilia,
  CONFIG_PADRAO,
  deveEnviarAgora,
  dentroDoHorario,
  calcularPanorama,
  montarResumo,
  type AlertaResumo,
  type PanoramaSemanal,
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

const LIMITE_NOMES = 10;
const listaNomes = (titulo: string, nomes: string[]) => {
  if (!nomes.length) return "";
  const extra = nomes.length > LIMITE_NOMES ? `<li style="color:#555">+ ${nomes.length - LIMITE_NOMES} no painel</li>` : "";
  return `<p style="margin:12px 0 4px;font-weight:bold">${esc(titulo)}</p>
    <ul style="padding-left:18px;margin:0">${nomes.slice(0, LIMITE_NOMES).map((n) => `<li>${esc(n)}</li>`).join("")}${extra}</ul>`;
};
const panoramaHtml = (p: PanoramaSemanal) => `
  <div style="border-top:1px solid #ddd;margin:8px 0 16px;padding-top:12px">
    <h3 style="margin:0 0 6px">Panorama da semana</h3>
    <p style="margin:0">${p.ativos} alunos ativos · ${p.treinando} treinando</p>
    ${listaNomes(`Sumidos (10 a 60 dias): ${p.sumidos.length}`, p.sumidos.map((s) => `${s.nome} — ${s.dias} dias`))}
    ${listaNomes(`Parados há mais de 60 dias: ${p.parados.length}`, p.parados.map((s) => `${s.nome} — ${s.dias} dias`))}
    ${listaNomes(`Nunca treinaram: ${p.nuncaTreinaram.length}`, p.nuncaTreinaram)}
  </div>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const bearer = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!isServiceRole(bearer, serviceKey)) return json({ error: "não autorizado" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, { auth: { persistSession: false } });
  // Opcional (só com chave de serviço): limitar a um CT, para conferência manual.
  const entrada = await req.json().catch(() => ({}));
  const somenteTenant = typeof entrada?.somente_tenant === "string" ? entrada.somente_tenant : null;
  const { hora, data: hoje, diaSemana } = agoraBrasilia();
  if (!dentroDoHorario(hora)) return json({ ok: true, enviados: 0, motivo: "fora do horário" });

  const agoraIso = new Date().toISOString();
  let consulta = admin
    .from("assistente_alertas")
    .select("id, tenant_id, tipo, prioridade, titulo, aluno_id, created_at")
    .eq("estado", "novo")
    .is("resumo_enviado_em", null)
    .limit(5000);
  if (somenteTenant) consulta = consulta.eq("tenant_id", somenteTenant);
  const { data: pendentes, error } = await consulta;
  if (error) return json({ error: error.message }, 500);

  const porTenant = new Map<string, AlertaResumo[]>();
  for (const a of pendentes ?? []) {
    if (!porTenant.has(a.tenant_id)) porTenant.set(a.tenant_id, []);
    porTenant.get(a.tenant_id)!.push(a as AlertaResumo);
  }
  // Segunda-feira: todo coach com CT entra, para receber o resumo semanal completo.
  if (diaSemana === 1) {
    let q = admin.from("tenants").select("id").not("owner_user_id", "is", null);
    if (somenteTenant) q = q.eq("id", somenteTenant);
    const { data: todos } = await q;
    for (const t of todos ?? []) if (!porTenant.has(t.id)) porTenant.set(t.id, []);
  }
  const tenantIds = [...porTenant.keys()];
  if (!tenantIds.length) return json({ ok: true, enviados: 0 });

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

    let panorama: PanoramaSemanal | null = null;
    if (diaSemana === 1) {
      const { data: ass } = await admin
        .from("assinaturas")
        .select("aluno_id")
        .eq("tenant_id", tenantId)
        .in("status", ["active", "trialing"])
        .neq("aluno_id", tenant.owner_user_id)
        .limit(5000);
      const ids = [...new Set((ass ?? []).map((a) => a.aluno_id).filter(Boolean))] as string[];
      if (ids.length) {
        const [{ data: perfis }, { data: stats }] = await Promise.all([
          admin.from("perfis").select("id, nome_completo").in("id", ids),
          admin.from("stats_treino_aluno").select("aluno_id, ultimo_treino").eq("tenant_id", tenantId).in("aluno_id", ids),
        ]);
        const nomes = new Map((perfis ?? []).map((p) => [p.id, p.nome_completo as string | null]));
        const ultimos = new Map((stats ?? []).map((s) => [s.aluno_id, s.ultimo_treino as string | null]));
        panorama = calcularPanorama(
          ids.map((id) => ({ nome: nomes.get(id) ?? null, ultimoTreino: ultimos.get(id) ?? null })),
          hoje,
        );
      }
    }

    const { data: dono } = await admin.from("perfis").select("nome_completo, email, push_token").eq("id", tenant.owner_user_id).maybeSingle();
    const resumo = montarResumo({ alertas, cfg, nomeCoach: dono?.nome_completo, receitaMesCentavos: receitaMes, semana, panorama });
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
          ${itensHtml ? `<ul style="padding-left:18px;margin:0 0 16px">${itensHtml}</ul>` : ""}
          ${resumo.restantes > 0 ? `<p style="margin:0 0 16px;color:#555">+ ${resumo.restantes} no painel</p>` : ""}
          ${resumo.panorama ? panoramaHtml(resumo.panorama) : ""}
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
