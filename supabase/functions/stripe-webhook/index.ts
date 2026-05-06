// Webhook Stripe: processa eventos de subscription, account, checkout
// IMPORTANTE: configure verify_jwt = false para esta function (config.toml)
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const log = (s: string, d?: unknown) =>
  console.log(`[stripe-webhook] ${s}${d ? " " + JSON.stringify(d) : ""}`);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const sig = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    if (!sig || !secret) throw new Error("missing signature or secret");
    event = await stripe.webhooks.constructEventAsync(body, sig, secret);
  } catch (e) {
    log("signature verification failed", { e: String(e) });
    return new Response(`bad sig: ${e}`, { status: 400 });
  }

  try {
    log("event", { type: event.type });

    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const meta = s.metadata || {};
        const tenant_id = meta.tenant_id;
        const plano_id = meta.plano_id;
        const aluno_id = meta.aluno_id || null;
        const customerEmail = s.customer_details?.email || s.customer_email;

        if (!tenant_id) break;

        // Resolve aluno_id pelo email se não estava logado no checkout
        let resolvedAlunoId = aluno_id;
        if (!resolvedAlunoId && customerEmail) {
          const { data: perfil } = await supabase
            .from("perfis")
            .select("id")
            .eq("email", customerEmail)
            .maybeSingle();
          if (perfil) resolvedAlunoId = perfil.id;
        }

        // Aula avulsa: registra na tabela aulas_avulsas
        if (meta.type === 'aula_avulsa') {
          await supabase.from("aulas_avulsas").upsert({
            tenant_id,
            aluno_id: resolvedAlunoId,
            nome: meta.nome || s.customer_details?.name || customerEmail || 'Cliente',
            email: customerEmail || '',
            telefone: meta.telefone || s.customer_details?.phone || null,
            valor_centavos: s.amount_total ?? 0,
            stripe_session_id: s.id,
            stripe_payment_intent_id: s.payment_intent as string | null,
            status: 'paid',
          }, { onConflict: 'stripe_session_id' });
          break;
        }

        // Cria/atualiza assinatura
        if (s.subscription) {
          const sub = await stripe.subscriptions.retrieve(s.subscription as string);
          await supabase.from("assinaturas").upsert(
            {
              aluno_id: resolvedAlunoId,
              tenant_id,
              plano_id,
              stripe_subscription_id: sub.id,
              stripe_customer_id: sub.customer as string,
              status: sub.status as any,
              // @ts-ignore
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            },
            { onConflict: "stripe_subscription_id" }
          );
        }

        // Vincula aluno ao tenant
        if (resolvedAlunoId) {
          await supabase.from("perfis").update({ tenant_id }).eq("id", resolvedAlunoId);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from("assinaturas")
          .update({
            status: sub.status as any,
            // @ts-ignore
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancelada_em: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
          })
          .eq("stripe_subscription_id", sub.id);
        break;
      }

      case "account.updated": {
        const acc = event.data.object as Stripe.Account;
        const completed = !!acc.charges_enabled && !!acc.payouts_enabled && !!acc.details_submitted;
        await supabase
          .from("tenants")
          .update({ stripe_onboarding_completed: completed })
          .eq("stripe_account_id", acc.id);
        break;
      }

      default:
        log("unhandled", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    log("ERROR processing", { e: String(e) });
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
