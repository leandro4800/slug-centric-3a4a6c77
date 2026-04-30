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

    // Aluno PODE estar logado ou não — se não estiver, captura email no checkout
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

    const { plano_id, email } = await req.json();
    if (!plano_id) throw new Error("plano_id required");

    const { data: plano } = await supabase
      .from("planos")
      .select("*, tenants!inner(id,slug,nome,stripe_account_id,stripe_onboarding_completed,status)")
      .eq("id", plano_id)
      .eq("ativo", true)
      .maybeSingle();
    if (!plano) throw new Error("plano not found");
    // @ts-ignore
    const t = plano.tenants;
    if (t.status !== "approved") throw new Error("tenant not approved");
    const skipStripeConnect = !t.stripe_account_id || !t.stripe_onboarding_completed;
    
    if (skipStripeConnect) {
      console.log("Skipping Stripe Connect for tenant:", t.slug);
    }
    if (!plano.stripe_price_id) throw new Error("plano has no stripe_price_id");

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const customerEmail = userEmail || email;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: plano.stripe_price_id, quantity: 1 }],
      customer_email: customerEmail || undefined,
      success_url: `${origin}/checkout/sucesso?session_id={CHECKOUT_SESSION_ID}&slug=${t.slug}`,
      cancel_url: `${origin}/${t.slug}`,
      subscription_data: {
        application_fee_percent: PLATFORM_FEE_PCT,
        // on_behalf_of faz com que a cobrança seja "em nome do" coach,
        // portanto as TAXAS DO STRIPE saem da conta do coach (não da plataforma).
        // A plataforma recebe apenas os 10% líquidos via application_fee_percent.
        on_behalf_of: t.stripe_account_id,
        transfer_data: { destination: t.stripe_account_id },
        metadata: {
          plano_id,
          tenant_id: t.id,
          aluno_id: userId ?? "",
        },
      },
      metadata: {
        plano_id,
        tenant_id: t.id,
        aluno_id: userId ?? "",
        tenant_slug: t.slug,
      },
    });

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
