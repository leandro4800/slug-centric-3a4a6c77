// Checkout da assinatura da plataforma (coach paga o Alpha Coach) via Stripe Checkout.
// Modelo:
//   - full_price = preço-base do plano (mostrado pro coach)
//   - Stripe cobra o coach: full_price * 1,0299 (gross-up 2,99%) — cobre taxa Stripe cartão
//   - Plataforma absorve ~1% da taxa Stripe (margem)
//   - Primeiro mês promocional R$1 via cupom one-time
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PlanTier = "standard" | "premium" | "pro";
const PLAN_PRICES: Record<PlanTier, { full: number; label: string; max_alunos: number | null }> = {
  standard: { full: 59.9, label: "Alpha Standard", max_alunos: 25 },
  premium: { full: 99.9, label: "Alpha Premium", max_alunos: 50 },
  pro: { full: 189.9, label: "Alpha Pro", max_alunos: null },
};
const FIRST_MONTH_VALUE = 1.0;
const COACH_FEE_PCT = 2.99; // gross-up Stripe repassado ao coach
const PLATFORM_ABSORB_PCT = 1.0; // plataforma absorve

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
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
    const { nome, telefone } = body;

    const plan = PLAN_PRICES[plan_tier];
    const grossedUpFull = Math.round(plan.full * (1 + COACH_FEE_PCT / 100) * 100); // centavos

    // 1. Customer Stripe (busca ou cria)
    let customerId: string | undefined;
    const existing = await stripe.customers.list({ email: user.email!, limit: 1 });
    if (existing.data.length > 0) {
      customerId = existing.data[0].id;
    } else {
      const created = await stripe.customers.create({
        email: user.email!,
        name: nome || user.email!.split("@")[0],
        phone: telefone || undefined,
        metadata: { user_id: user.id, plan_tier },
      });
      customerId = created.id;
    }

    // 2. Product + Price recorrente (procura por metadata, cria se não existir)
    const productSearch = await stripe.products.search({
      query: `metadata['platform_plan_tier']:'${plan_tier}'`,
      limit: 1,
    });
    let productId: string;
    if (productSearch.data.length > 0) {
      productId = productSearch.data[0].id;
    } else {
      const product = await stripe.products.create({
        name: plan.label,
        metadata: { platform_plan_tier: plan_tier },
      });
      productId = product.id;
    }

    const priceSearch = await stripe.prices.search({
      query: `product:'${productId}' AND metadata['gross_up']:'${COACH_FEE_PCT}' AND active:'true'`,
      limit: 1,
    });
    let priceId: string;
    if (priceSearch.data.length > 0 && priceSearch.data[0].unit_amount === grossedUpFull) {
      priceId = priceSearch.data[0].id;
    } else {
      const price = await stripe.prices.create({
        product: productId,
        currency: "brl",
        unit_amount: grossedUpFull,
        recurring: { interval: "month" },
        metadata: { gross_up: String(COACH_FEE_PCT), base_amount: String(Math.round(plan.full * 100)) },
      });
      priceId = price.id;
    }

    // 3. Cupom one-time pra deixar a 1ª fatura em R$1
    // Desconto = (grossedUpFull - 100 centavos)
    const discountAmount = Math.max(0, grossedUpFull - Math.round(FIRST_MONTH_VALUE * 100));
    const coupon = await stripe.coupons.create({
      amount_off: discountAmount,
      currency: "brl",
      duration: "once",
      name: `Promo 1º mês ${plan.label}`,
      metadata: { plan_tier },
    });

    const origin = req.headers.get("origin") || "http://localhost:3000";

    // 4. Checkout Session (mode subscription)
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      discounts: [{ coupon: coupon.id }],
      
      success_url: `${origin}/seja-coach?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/seja-coach?checkout=cancel`,
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_tier,
          type: "platform_subscription",
        },
      },
      metadata: {
        user_id: user.id,
        plan_tier,
        type: "platform_subscription",
      },
    });

    // 5. Persistir (pré-cria registro pending)
    await supabase.from("coach_platform_subscriptions").upsert(
      {
        user_id: user.id,
        plan_tier,
        status: "pending",
        stripe_customer_id: customerId,
        stripe_checkout_session_id: session.id,
        first_payment_value: FIRST_MONTH_VALUE,
        full_price: plan.full,
        fee_pct: PLATFORM_ABSORB_PCT,
      },
      { onConflict: "user_id" }
    );

    return new Response(
      JSON.stringify({
        ok: true,
        session_id: session.id,
        payment_url: session.url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e: any) {
    console.error("[coach-platform-checkout]", e?.message);
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
