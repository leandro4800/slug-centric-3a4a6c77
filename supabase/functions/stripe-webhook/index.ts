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

        // ====== Assinatura da PLATAFORMA (coach paga Alpha Coach) ======
        if (meta.type === "platform_subscription") {
          if (s.subscription) {
            const sub = await stripe.subscriptions.retrieve(s.subscription as string);
            await supabase
              .from("coach_platform_subscriptions")
              .update({
                status: "active",
                stripe_subscription_id: sub.id,
                stripe_customer_id: sub.customer as string,
                // @ts-ignore
                current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
              })
              .eq("user_id", meta.user_id!);

            // Aprovação automática do tenant quando pagamento da plataforma é confirmado.
            // Só promove 'pending' → 'approved'; nunca reativa tenants rejeitados/suspensos.
            const { data: pendingTenants, error: tenantErr } = await supabase
              .from("tenants")
              .select("id, slug, nome")
              .eq("owner_user_id", meta.user_id!)
              .eq("status", "pending");

            if (tenantErr) {
              log("auto-approve tenant lookup failed", { e: String(tenantErr) });
            } else if (pendingTenants && pendingTenants.length > 0) {
              for (const tenant of pendingTenants) {
                const { error: approveErr } = await supabase
                  .from("tenants")
                  .update({ status: "approved" })
                  .eq("id", tenant.id)
                  .eq("status", "pending"); // guarda dupla: só atualiza se ainda estiver pending

                if (approveErr) {
                  log("auto-approve tenant update failed", { tenantId: tenant.id, e: String(approveErr) });
                  continue;
                }

                log("tenant auto-approved by confirmed payment", { tenantId: tenant.id, slug: tenant.slug, userId: meta.user_id });

                // Dispara o mesmo e-mail de aprovação do fluxo manual.
                try {
                  const { data: ownerPerfil } = await supabase
                    .from("perfis")
                    .select("email, nome_completo")
                    .eq("id", meta.user_id!)
                    .maybeSingle();

                  if (ownerPerfil?.email) {
                    const { error: mailErr } = await supabase.functions.invoke("send-transactional-email", {
                      body: {
                        templateName: "coach-approved",
                        recipientEmail: ownerPerfil.email,
                        idempotencyKey: `coach-approved-${tenant.id}`,
                        templateData: {
                          name: ownerPerfil.nome_completo || tenant.nome,
                          slug: tenant.slug,
                        },
                      },
                    });
                    if (mailErr) {
                      log("auto-approve approval email failed", { tenantId: tenant.id, e: String(mailErr) });
                    } else {
                      log("auto-approve approval email sent", { tenantId: tenant.id, email: ownerPerfil.email });
                    }
                  } else {
                    log("auto-approve owner profile/email not found", { tenantId: tenant.id, userId: meta.user_id });
                  }
                } catch (e) {
                  log("auto-approve email dispatch exception", { tenantId: tenant.id, e: String(e) });
                }
              }
            } else {
              log("auto-approve: no pending tenant for user", { userId: meta.user_id });
            }
          }
          break;
        }

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

        // Aula avulsa: registra na tabela aulas_avulsas + marca agendamento como pago
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

          if (meta.agendamento_token) {
            await supabase.from("agendamentos_aula_avulsa")
              .update({
                status: 'pago',
                stripe_session_id: s.id,
                email: customerEmail || '',
              })
              .eq("token", meta.agendamento_token);
          }
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
        // Assinatura aluno → tenant
        await supabase
          .from("assinaturas")
          .update({
            status: sub.status as any,
            // @ts-ignore
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancelada_em: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
          })
          .eq("stripe_subscription_id", sub.id);

        // Assinatura coach → plataforma
        const platformStatus =
          sub.status === "active" || sub.status === "trialing"
            ? "active"
            : sub.status === "canceled" || sub.status === "incomplete_expired"
              ? "canceled"
              : sub.status === "past_due" || sub.status === "unpaid"
                ? "past_due"
                : "pending";
        await supabase
          .from("coach_platform_subscriptions")
          .update({
            status: platformStatus as any,
            // @ts-ignore
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);
        break;
      }


      case "account.updated": {
        const acc = event.data.object as Stripe.Account;
        const completed = !!acc.charges_enabled && !!acc.payouts_enabled && !!acc.details_submitted;
        await supabase
          .from("tenants_private")
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
