
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Validação simples de token (configurado no dashboard do Asaas)
    const asaasToken = req.headers.get("asaas-access-token");
    if (asaasToken !== Deno.env.get("ASAAS_WEBHOOK_TOKEN")) {
      console.warn("Invalid Asaas webhook token");
      // Retornar 200 para o Asaas não ficar tentando re-enviar, mas logar o erro
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 200 });
    }

    const body = await req.json();
    console.log("[asaas-webhook] Event:", body.event, "Payment ID:", body.payment?.id);

    const event = body.event;
    const payment = body.payment;
    
    // externalReference contém o JSON que passamos no checkout
    let metadata: any = {};
    try {
      metadata = JSON.parse(payment.externalReference || "{}");
    } catch (e) {
      console.error("Error parsing externalReference:", e);
    }

    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      const { tenant_id, plano_id, aluno_id, type, agendamento_token } = metadata;

      if (type === "aula_avulsa" && agendamento_token) {
        // Atualiza agendamento
        await supabase
          .from("agendamentos_aula_avulsa")
          .update({ status: "pago", asaas_payment_id: payment.id })
          .eq("token", agendamento_token);
      } else if (aluno_id && tenant_id) {
        // Ativa assinatura
        const { error: subErr } = await supabase
          .from("assinaturas")
          .upsert({
            aluno_id,
            tenant_id,
            plano_id: plano_id || null,
            status: "active",
            asaas_customer_id: payment.customer,
            asaas_subscription_id: payment.subscription || null,
            current_period_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 32).toISOString(), // + 32 dias (safely)
          }, { onConflict: "aluno_id,tenant_id" });
          
        if (subErr) throw subErr;
      }
    } else if (event === "PAYMENT_REFUNDED") {
      const { aluno_id, tenant_id } = metadata;
      if (aluno_id && tenant_id) {
        await supabase
          .from("assinaturas")
          .update({ status: "canceled" })
          .eq("aluno_id", aluno_id)
          .eq("tenant_id", tenant_id);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[asaas-webhook] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { "Content-Type": "application/json" },
      status: 200, // Always 200 for webhooks to avoid retries on logic errors
    });
  }
});
