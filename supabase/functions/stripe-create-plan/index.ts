// Cria Product + Price no Stripe (na conta da plataforma) e salva os IDs no plano
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const intervalMap: Record<string, { interval: "month" | "year"; interval_count: number }> = {
  mensal: { interval: "month", interval_count: 1 },
  trimestral: { interval: "month", interval_count: 3 },
  semestral: { interval: "month", interval_count: 6 },
  anual: { interval: "year", interval_count: 1 },
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
    if (!authHeader) throw new Error("missing authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userRes?.user) {
      console.error("auth error", userErr);
      throw new Error("unauthorized");
    }
    const userId = userRes.user.id;

    const { plano_id } = await req.json();
    console.log("create-plan request", { plano_id, userId });
    const { data: plano, error: planoErr } = await supabase
      .from("planos")
      .select("*, tenants!inner(id,nome,owner_user_id)")
      .eq("id", plano_id)
      .maybeSingle();
    if (planoErr) {
      console.error("plano fetch error", planoErr);
      throw new Error(`plano fetch: ${planoErr.message}`);
    }
    if (!plano) throw new Error("plano not found");
    // @ts-ignore
    if (plano.tenants.owner_user_id !== userId) throw new Error("not owner");

    let productId = plano.stripe_product_id;
    if (!productId) {
      // @ts-ignore
      const prod = await stripe.products.create({
        name: `${plano.tenants.nome} — ${plano.nome}`,
        metadata: { plano_id, tenant_id: plano.tenant_id },
      });
      productId = prod.id;
    }

    const recurring = intervalMap[plano.intervalo] ?? intervalMap.mensal;
    // Gross-up de 2,99% repassado ao aluno para cobrir taxa Stripe
    // (plataforma absorve apenas 1% da taxa via margem; coach segue recebendo
    //  92,01% do preço-base configurado pelo coach).
    const STUDENT_FEE_PCT = 2.99;
    const grossedUpAmount = Math.round(plano.preco_centavos * (1 + STUDENT_FEE_PCT / 100));
    const price = await stripe.prices.create({
      product: productId,
      currency: "brl",
      unit_amount: grossedUpAmount,
      recurring,
      metadata: {
        plano_id,
        tenant_id: plano.tenant_id,
        base_amount: String(plano.preco_centavos),
        student_fee_pct: String(STUDENT_FEE_PCT),
      },
    });

    await supabase
      .from("planos")
      .update({ stripe_product_id: productId, stripe_price_id: price.id })
      .eq("id", plano_id);

    return new Response(JSON.stringify({ product_id: productId, price_id: price.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
