// Cria Checkout Session no Stripe com split via Connect.
// Modelo de taxa:
//   - Coach define preco_centavos = preço-base do plano (mostrado na landing)
//   - Aluno paga preco_centavos * 1,0299 (gross-up de 2,99% pra cobrir taxa Stripe)
//   - application_fee_percent ≈ 10,66% (do total cobrado) → coach recebe 92,01% do preço-base
//   - Stripe debita ~3,99% do total da conta da PLATAFORMA → plataforma absorve só ~1% e fica com ~6,99% líquido sobre o preço-base
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Margem da plataforma sobre o preço-base do coach (líquido alvo após Stripe ≈ 6,99%)
const PLATFORM_FEE_PCT_OF_BASE = 7.99;
// Gross-up cobrado do aluno em cima do preço-base
const STUDENT_FEE_PCT = 2.99;

// Application fee % aplicada sobre o TOTAL cobrado (que já inclui o gross-up).
// (PLATFORM_FEE_PCT_OF_BASE + STUDENT_FEE_PCT) / (100 + STUDENT_FEE_PCT) * 100
// = (7.99 + 2.99) / 102.99 * 100 ≈ 10.66 → coach recebe 92,01% do preço-base
const APPLICATION_FEE_PCT = Number(
  (((PLATFORM_FEE_PCT_OF_BASE + STUDENT_FEE_PCT) / (100 + STUDENT_FEE_PCT)) * 100).toFixed(2)
);

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

    const { plano_id, tenant_id, type, email, nome, telefone } = await req.json();

    let tenant_to_use: any;
    let line_items: any;
    let mode: "subscription" | "payment" = "subscription";
    let agendamento_token: string | null = null;
    let baseUnitAmount = 0; // centavos do preço-base (para calcular fee de aula avulsa)

    if (type === "aula_avulsa") {
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
      baseUnitAmount = Math.round(t.preco_aula_avulsa * 100);
      const grossedUp = Math.round(baseUnitAmount * (1 + STUDENT_FEE_PCT / 100));

      line_items = [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: `Aula Avulsa - ${t.nome}`,
              description: "Treino presencial único com acompanhamento profissional.",
            },
            unit_amount: grossedUp,
          },
          quantity: 1,
        },
      ];

      const customerEmailForBooking = (email || userEmail || "").trim().toLowerCase();
      const { data: agend, error: agendErr } = await supabase
        .from("agendamentos_aula_avulsa")
        .insert({
          tenant_id,
          nome: nome || customerEmailForBooking || "Cliente",
          email: customerEmailForBooking,
          telefone: telefone || null,
          valor_centavos: baseUnitAmount,
          status: "pendente",
        })
        .select("token")
        .single();
      if (agendErr || !agend) throw new Error("erro criando agendamento: " + agendErr?.message);
      agendamento_token = agend.token;
    } else {
      if (!plano_id) throw new Error("plano_id required");
      const { data: plano, error: planoErr } = await supabase
        .from("planos")
        .select("*, tenants!inner(id,slug,nome,status,is_partner)")
        .eq("id", plano_id)
        .eq("ativo", true)
        .maybeSingle();
      if (planoErr) throw new Error("plano query error: " + planoErr.message);
      if (!plano) throw new Error("plano not found");
      // @ts-ignore
      const tenantBase = plano.tenants;
      // Busca dados privados (Stripe Connect) separadamente
      const { data: tpriv } = await supabase
        .from("tenants_private")
        .select("stripe_account_id, stripe_onboarding_completed")
        .eq("tenant_id", tenantBase.id)
        .maybeSingle();
      tenant_to_use = {
        ...tenantBase,
        stripe_account_id: tpriv?.stripe_account_id ?? null,
        stripe_onboarding_completed: tpriv?.stripe_onboarding_completed ?? false,
      };
      if (!plano.stripe_price_id) throw new Error("plano has no stripe_price_id");
      baseUnitAmount = plano.preco_centavos;
      line_items = [{ price: plano.stripe_price_id, quantity: 1 }];
    }

    // Coaches parceiros: plataforma não cobra fee. Preço do plano já inclui as taxas do Stripe,
    // que serão descontadas da conta do coach (on_behalf_of + transfer_data, sem application_fee).
    const isPartner = !!tenant_to_use.is_partner;

    if (tenant_to_use.status !== "approved") throw new Error("tenant not approved");
    const isPlatformOwned = !tenant_to_use.stripe_account_id;
    if (!isPlatformOwned && !tenant_to_use.stripe_onboarding_completed) {
      throw new Error("Coach ainda não concluiu o cadastro Stripe Connect para receber pagamentos.");
    }


    const origin = req.headers.get("origin") || "http://localhost:3000";
    const customerEmail = userEmail || email;

    const sessionParams: any = {
      mode,
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      line_items,
      customer_email: customerEmail || undefined,
      success_url:
        type === "aula_avulsa" && agendamento_token
          ? `${origin}/${tenant_to_use.slug}/agendar-aula/${agendamento_token}?session_id={CHECKOUT_SESSION_ID}`
          : `${origin}/checkout/sucesso?session_id={CHECKOUT_SESSION_ID}&slug=${tenant_to_use.slug}`,
      cancel_url: `${origin}/${tenant_to_use.slug}`,
      metadata: {
        plano_id: plano_id ?? "",
        tenant_id: tenant_to_use.id,
        aluno_id: userId ?? "",
        tenant_slug: tenant_to_use.slug,
        type: type ?? "subscription",
        nome: nome ?? "",
        telefone: telefone ?? "",
        agendamento_token: agendamento_token ?? "",
        base_amount_centavos: String(baseUnitAmount),
        student_fee_pct: String(STUDENT_FEE_PCT),
        platform_fee_pct_of_base: String(PLATFORM_FEE_PCT_OF_BASE),
      },
    };

    // Charge fica na conta da PLATAFORMA (sem on_behalf_of).
    // Plataforma absorve a taxa Stripe; coach recebe valor cheio via transfer_data.
    // Para tenants próprios da plataforma (ex: alphateam), não há transfer/fee — cobrança direta.
    if (mode === "subscription") {
      sessionParams.subscription_data = {};
      if (!isPlatformOwned) {
        if (isPartner) {
          sessionParams.subscription_data.transfer_data = { destination: tenant_to_use.stripe_account_id };
          sessionParams.subscription_data.on_behalf_of = tenant_to_use.stripe_account_id;
        } else {
          sessionParams.subscription_data.application_fee_percent = APPLICATION_FEE_PCT;
          sessionParams.subscription_data.transfer_data = { destination: tenant_to_use.stripe_account_id };
        }
      }
    } else {
      if (!isPlatformOwned) {
        if (isPartner) {
          sessionParams.payment_intent_data = {
            transfer_data: { destination: tenant_to_use.stripe_account_id },
            on_behalf_of: tenant_to_use.stripe_account_id,
          };
        } else {
          const totalAmount = line_items[0].price_data.unit_amount;
          const coachAmount = Math.round(baseUnitAmount * (1 - PLATFORM_FEE_PCT_OF_BASE / 100));
          const applicationFee = totalAmount - coachAmount;
          sessionParams.payment_intent_data = {
            application_fee_amount: applicationFee,
            transfer_data: { destination: tenant_to_use.stripe_account_id },
          };
        }
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
