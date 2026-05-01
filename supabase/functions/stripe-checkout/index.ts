// Cria Checkout Session com split 90/10 via application_fee_percent + transfer_data.destination
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLATFORM_FEE_PCT = 10;

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
    let userId: string | null = null;
    let userEmail: string | null = null;
    if (authHeader) {
      const { data: claimsRes } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
      if (claimsRes?.claims) {
        userId = claimsRes.claims.sub as string;
        userEmail = claimsRes.claims.email as string;
      }
    }

    const { plano_id, tenant_id, type, email } = await req.json();
    
    let tenant_to_use;
    let line_items;
    let mode: "subscription" | "payment" = "subscription";

    if (type === 'aula_avulsa') {
      if (!tenant_id) throw new Error("tenant_id required for aula_avulsa");
      const { data: t } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenant_id)
        .maybeSingle();
      if (!t) throw new Error("tenant not found");
      if (!t.permite_aula_avulsa || !t.preco_aula_avulsa) throw new Error("aula avulsa not available");
      
      tenant_to_use = t;
      mode = "payment";
      line_items = [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: `Aula Avulsa - ${t.nome}`,
            description: 'Treino presencial único com acompanhamento profissional.',
          },
          unit_amount: Math.round(t.preco_aula_avulsa * 100),
        },
        quantity: 1,
      }];
    } else {
      if (!plano_id) throw new Error("plano_id required");
      const { data: plano } = await supabase
        .from("planos")
        .select("*, tenants!inner(id,slug,nome,stripe_account_id,stripe_onboarding_completed,status)")
        .eq("id", plano_id)
        .eq("ativo", true)
        .maybeSingle();
      if (!plano) throw new Error("plano not found");
      // @ts-ignore
      tenant_to_use = plano.tenants;
      if (!plano.stripe_price_id) throw new Error("plano has no stripe_price_id");
      line_items = [{ price: plano.stripe_price_id, quantity: 1 }];
    }

    if (tenant_to_use.status !== "approved") throw new Error("tenant not approved");
    const skipStripeConnect = !tenant_to_use.stripe_account_id || !tenant_to_use.stripe_onboarding_completed;
    
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const customerEmail = userEmail || email;

    const sessionParams: any = {
      mode,
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      line_items,
      customer_email: customerEmail || undefined,
      success_url: `${origin}/checkout/sucesso?session_id={CHECKOUT_SESSION_ID}&slug=${tenant_to_use.slug}`,
      cancel_url: `${origin}/${tenant_to_use.slug}`,
      metadata: {
        plano_id: plano_id ?? "",
        tenant_id: tenant_to_use.id,
        aluno_id: userId ?? "",
        tenant_slug: tenant_to_use.slug,
        type: type ?? 'subscription',
      },
    };

    if (!skipStripeConnect) {
      if (mode === 'subscription') {
        sessionParams.subscription_data = {
          trial_period_days: 30,
          application_fee_percent: PLATFORM_FEE_PCT,
          on_behalf_of: tenant_to_use.stripe_account_id,
          transfer_data: { destination: tenant_to_use.stripe_account_id },
        };
      } else {
        sessionParams.payment_intent_data = {
          application_fee_amount: Math.round(line_items[0].price_data.unit_amount * (PLATFORM_FEE_PCT / 100)),
          transfer_data: { destination: tenant_to_use.stripe_account_id },
        };
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[stripe-checkout]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
