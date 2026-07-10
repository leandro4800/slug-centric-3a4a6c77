// Cria/atualiza Stripe Connect Express account para um coach e retorna AccountLink
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (s: string, d?: unknown) =>
  console.log(`[connect-onboard] ${s}${d ? " " + JSON.stringify(d) : ""}`);

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

const stripeConnectPermissionMessage =
  "A chave Stripe configurada não tem permissão para criar/conectar contas Connect. Use uma Secret Key completa (sk_live_) ou libere na Restricted Key as permissões: Accounts Write, Basic Business Contact Information Read e Full Bank Account Information Read.";

const stripeConnectNotActivatedMessage =
  "A conta Stripe da Alpha Coach ainda não ativou o Stripe Connect. Não precisa criar outra conta: entre no painel Stripe principal, acesse Connect e complete a ativação para permitir contas Express de coaches.";

const getPublicStripeError = (e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  const code = (e as { code?: string })?.code;
  const lower = msg.toLowerCase();

  if (code === "permission_error" || (lower.includes("permission denied") && lower.includes("required permissions"))) {
    return stripeConnectPermissionMessage;
  }

  if (lower.includes("signed up for connect") || lower.includes("dashboard.stripe.com/connect")) {
    return stripeConnectNotActivatedMessage;
  }

  if (lower.includes("invalid api key") || lower.includes("api key provided")) {
    return "A chave Stripe configurada é inválida. Atualize o STRIPE_SECRET_KEY com uma chave secreta válida da conta principal.";
  }

  return msg;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY não configurada.");
    if (stripeKey.startsWith("pk_")) {
      throw new Error("STRIPE_SECRET_KEY precisa ser uma chave secreta (sk_live_/sk_test_) ou restricted key com permissões Connect, não uma chave pública (pk_).");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

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
      .select("id, owner_user_id, slug, nome")
      .eq("id", tenant_id)
      .maybeSingle();
    if (tErr || !tenant) throw new Error("tenant not found");
    if (tenant.owner_user_id !== userId) throw new Error("not owner");

    const { data: tpriv } = await supabase
      .from("tenants_private")
      .select("stripe_account_id")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    let accountId = tpriv?.stripe_account_id ?? null;
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
      await supabase
        .from("tenants_private")
        .upsert({ tenant_id, stripe_account_id: accountId }, { onConflict: "tenant_id" });
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/seja-coach?refresh=1`,
      return_url: `${origin}/seja-coach?completed=1`,
      type: "account_onboarding",
    });

    return json(200, { url: link.url, account_id: accountId });
  } catch (e) {
    const msg = getPublicStripeError(e);
    log("ERROR", { msg });
    return json(400, { error: msg });
  }
});
