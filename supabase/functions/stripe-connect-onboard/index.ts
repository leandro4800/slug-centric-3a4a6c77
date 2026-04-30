// Cria/atualiza Stripe Connect Express account para um coach e retorna AccountLink
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (s: string, d?: unknown) =>
  console.log(`[connect-onboard] ${s}${d ? " " + JSON.stringify(d) : ""}`);

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
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsRes, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsRes?.claims) throw new Error("unauthorized");
    const userId = claimsRes.claims.sub as string;
    const email = claimsRes.claims.email as string;

    const { tenant_id } = await req.json();
    if (!tenant_id) throw new Error("tenant_id required");

    // Verifica posse
    const { data: tenant, error: tErr } = await supabase
      .from("tenants")
      .select("id, owner_user_id, stripe_account_id, slug, nome")
      .eq("id", tenant_id)
      .maybeSingle();
    if (tErr || !tenant) throw new Error("tenant not found");
    if (tenant.owner_user_id !== userId) throw new Error("not owner");

    let accountId = tenant.stripe_account_id;
    if (!accountId) {
      log("creating express account", { tenant_id });
      const acc = await stripe.accounts.create({
        type: "express",
        email,
        country: "BR",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        business_profile: { name: tenant.nome, product_description: "Personal training online" },
        metadata: { tenant_id, user_id: userId },
      });
      accountId = acc.id;
      await supabase.from("tenants").update({ stripe_account_id: accountId }).eq("id", tenant_id);
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/seja-coach?refresh=1`,
      return_url: `${origin}/seja-coach?completed=1`,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: link.url, account_id: accountId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
