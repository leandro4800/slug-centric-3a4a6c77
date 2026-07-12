// Sincroniza status de onboarding Stripe Connect do tenant
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    if (!authHeader) throw new Error("missing authorization");
    const { data: claimsRes } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claimsRes?.claims) throw new Error("unauthorized");
    const userId = claimsRes.claims.sub as string;

    const { tenant_id } = await req.json();
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, owner_user_id")
      .eq("id", tenant_id)
      .maybeSingle();
    if (!tenant || tenant.owner_user_id !== userId) throw new Error("not owner");

    const { data: tpriv } = await supabase
      .from("tenants_private")
      .select("stripe_account_id")
      .eq("tenant_id", tenant_id)
      .maybeSingle();
    if (!tpriv?.stripe_account_id) {
      return new Response(JSON.stringify({ completed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const acc = await stripe.accounts.retrieve(tpriv.stripe_account_id);
    const completed = !!acc.charges_enabled && !!acc.payouts_enabled && !!acc.details_submitted;
    const pendingVerification = [
      ...(acc.requirements?.pending_verification ?? []),
      ...(acc.future_requirements?.pending_verification ?? []),
    ];
    const currentlyDue = [
      ...(acc.requirements?.currently_due ?? []),
      ...(acc.future_requirements?.currently_due ?? []),
    ];
    const pastDue = [
      ...(acc.requirements?.past_due ?? []),
      ...(acc.future_requirements?.past_due ?? []),
    ];
    const status = completed
      ? "verified"
      : acc.details_submitted && pendingVerification.length > 0
        ? "pending_verification"
        : acc.details_submitted
          ? "submitted"
          : "incomplete";

    await supabase
      .from("tenants_private")
      .update({ stripe_onboarding_completed: completed })
      .eq("tenant_id", tenant_id);

    return new Response(
      JSON.stringify({
        completed,
        status,
        charges_enabled: acc.charges_enabled,
        payouts_enabled: acc.payouts_enabled,
        details_submitted: acc.details_submitted,
        pending_verification: pendingVerification,
        currently_due: currentlyDue,
        past_due: pastDue,
        disabled_reason: acc.requirements?.disabled_reason ?? acc.future_requirements?.disabled_reason ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
