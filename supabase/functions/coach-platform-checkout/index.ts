// Checkout da assinatura da plataforma (coach paga o Alpha Coach)
// Cria customer no Asaas e uma assinatura mensal recorrente.
// Primeira fatura é gerada pelo valor promocional (R$1,00) e a partir do segundo ciclo cobra o valor cheio.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_API_URL = Deno.env.get("ASAAS_API_URL") || "https://sandbox.asaas.com/api/v3";
const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");

type PlanTier = "standard" | "premium" | "pro";
const PLAN_PRICES: Record<PlanTier, { full: number; label: string; max_alunos: number | null }> = {
  standard: { full: 59.90, label: "Alpha Standard", max_alunos: 25 },
  premium:  { full: 99.90, label: "Alpha Premium", max_alunos: 50 },
  pro:      { full: 189.90, label: "Alpha Pro", max_alunos: null },
};
const FIRST_MONTH_VALUE = 1.00;
const PLATFORM_FEE_PCT = 7.99;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!ASAAS_API_KEY) throw new Error("ASAAS_API_KEY não configurada. Adicione o secret para habilitar pagamentos.");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("missing auth");
    const { data: userRes } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userRes?.user;
    if (!user) throw new Error("user not authenticated");

    const body = await req.json();
    const plan_tier = String(body.plan_tier || "").toLowerCase() as PlanTier;
    if (!PLAN_PRICES[plan_tier]) throw new Error("plan_tier inválido");
    const { nome, telefone, cpfCnpj } = body;

    const plan = PLAN_PRICES[plan_tier];

    // 1. Buscar/criar customer no Asaas
    let customerId: string | null = null;
    const listRes = await fetch(`${ASAAS_API_URL}/customers?email=${encodeURIComponent(user.email!)}`, {
      headers: { access_token: ASAAS_API_KEY },
    });
    const listData = await listRes.json();
    if (listData?.data?.length) {
      customerId = listData.data[0].id;
    } else {
      const createRes = await fetch(`${ASAAS_API_URL}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", access_token: ASAAS_API_KEY },
        body: JSON.stringify({
          name: nome || user.email!.split("@")[0],
          email: user.email,
          mobilePhone: telefone || undefined,
          cpfCnpj: cpfCnpj || undefined,
          externalReference: user.id,
        }),
      });
      const createData = await createRes.json();
      if (createData.errors) throw new Error(createData.errors[0].description);
      customerId = createData.id;
    }

    // 2. Criar assinatura (primeira cobrança = R$1)
    const firstDue = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split("T")[0];
    const subRes = await fetch(`${ASAAS_API_URL}/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: ASAAS_API_KEY },
      body: JSON.stringify({
        customer: customerId,
        billingType: "UNDEFINED",
        value: FIRST_MONTH_VALUE,
        nextDueDate: firstDue,
        cycle: "MONTHLY",
        description: `${plan.label} — 1º mês promocional R$ ${FIRST_MONTH_VALUE.toFixed(2)} (depois R$ ${plan.full.toFixed(2)}/mês)`,
        externalReference: JSON.stringify({ user_id: user.id, plan_tier, type: "platform_subscription" }),
      }),
    });
    const sub = await subRes.json();
    if (sub.errors) throw new Error(sub.errors[0].description);

    // 3. Persistir assinatura
    await supabase.from("coach_platform_subscriptions").upsert({
      user_id: user.id,
      plan_tier,
      status: "pending",
      asaas_customer_id: customerId,
      asaas_subscription_id: sub.id,
      first_payment_value: FIRST_MONTH_VALUE,
      full_price: plan.full,
      fee_pct: PLATFORM_FEE_PCT,
    }, { onConflict: "user_id" });

    // 4. Buscar link de pagamento da primeira cobrança
    let payment_url: string | null = null;
    for (let i = 0; i < 5 && !payment_url; i++) {
      await new Promise((r) => setTimeout(r, 600));
      const payRes = await fetch(`${ASAAS_API_URL}/payments?subscription=${sub.id}&limit=1`, {
        headers: { access_token: ASAAS_API_KEY },
      });
      const payData = await payRes.json();
      const first = payData?.data?.[0];
      if (first?.invoiceUrl) payment_url = first.invoiceUrl;
    }

    return new Response(JSON.stringify({ ok: true, subscription_id: sub.id, payment_url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
