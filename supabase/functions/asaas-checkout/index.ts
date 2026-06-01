
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plataforma retém 7,99% bruto da venda de cada aluno.
// As taxas do Asaas saem da fatia da plataforma (coach recebe valor fixo líquido garantido).
const PLATFORM_FEE_PCT = 7.99;
const ASAAS_API_URL = Deno.env.get("ASAAS_API_URL") || "https://sandbox.asaas.com/api/v3";
const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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
    
    let tenant_to_use;
    let amount: number;
    let is_subscription = true;
    let agendamento_token: string | null = null;
    let plan_name = "";

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
      is_subscription = false;
      amount = t.preco_aula_avulsa;
      plan_name = `Aula Avulsa - ${t.nome}`;

      // Pré-cria agendamento pendente
      const customerEmailForBooking = (email || userEmail || "").trim().toLowerCase();
      const { data: agend, error: agendErr } = await supabase
        .from("agendamentos_aula_avulsa")
        .insert({
          tenant_id,
          nome: nome || customerEmailForBooking || "Cliente",
          email: customerEmailForBooking,
          telefone: telefone || null,
          valor_centavos: Math.round(t.preco_aula_avulsa * 100),
          status: "pendente",
        })
        .select("token")
        .single();
      if (agendErr || !agend) throw new Error("erro criando agendamento: " + agendErr?.message);
      agendamento_token = agend.token;
    } else {
      if (!plano_id) throw new Error("plano_id required");
      const { data: plano } = await supabase
        .from("planos")
        .select("*, tenants!inner(id,slug,nome,status)")
        .eq("id", plano_id)
        .eq("ativo", true)
        .maybeSingle();
      if (!plano) throw new Error("plano not found");

      // @ts-ignore
      tenant_to_use = plano.tenants;
      const { data: priv } = await supabase
        .from("tenants_private")
        .select("asaas_wallet_id")
        .eq("tenant_id", tenant_to_use.id)
        .maybeSingle();
      // @ts-ignore
      tenant_to_use.asaas_wallet_id = priv?.asaas_wallet_id || null;
      amount = plano.preco_centavos / 100;
      plan_name = plano.nome;
    }


    if (tenant_to_use.status !== "approved") throw new Error("tenant not approved");
    
    const customerEmail = (userEmail || email || "").trim();
    const customerName = (nome || "").trim();

    // 1. Buscar ou Criar Cliente no Asaas
    let customerId;
    const listRes = await fetch(`${ASAAS_API_URL}/customers?email=${encodeURIComponent(customerEmail)}`, {
      headers: { 'access_token': ASAAS_API_KEY! }
    });
    const listData = await listRes.json();
    if (listData.data && listData.data.length > 0) {
      customerId = listData.data[0].id;
    } else {
      const createRes = await fetch(`${ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY!
        },
        body: JSON.stringify({
          name: customerName || customerEmail.split('@')[0],
          email: customerEmail,
          mobilePhone: telefone || undefined
        })
      });
      const createData = await createRes.json();
      if (createData.errors) throw new Error(createData.errors[0].description);
      customerId = createData.id;
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const callbackUrl = type === 'aula_avulsa' && agendamento_token
        ? `${origin}/${tenant_to_use.slug}/agendar-aula/${agendamento_token}`
        : `${origin}/${tenant_to_use.slug}/app`;

    // 2. Criar Cobrança ou Assinatura com Split
    const body: any = {
      customer: customerId,
      billingType: "UNDEFINED", // Permite cartão, pix, boleto
      value: amount,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split('T')[0], // Amanhã
      description: plan_name,
      externalReference: JSON.stringify({
        plano_id: plano_id ?? "",
        tenant_id: tenant_to_use.id,
        aluno_id: userId ?? "",
        type: type ?? 'subscription',
        agendamento_token: agendamento_token ?? "",
      }),
    };

    // Split por PERCENTUAL: coach recebe 92,01% e plataforma fica com 7,99% íntegros.
    // As taxas do Asaas (boleto/pix/cartão) são debitadas da fatia do coach —
    // a plataforma NÃO absorve taxa do Asaas.
    if (tenant_to_use.asaas_wallet_id) {
      body.split = [
        {
          walletId: tenant_to_use.asaas_wallet_id,
          percentualValue: 100 - PLATFORM_FEE_PCT, // 92,01%
        }
      ];
    }

    let result;
    if (is_subscription) {
      // Para assinaturas, usamos /subscriptions
      const subBody = {
        ...body,
        nextDueDate: body.dueDate,
        cycle: "MONTHLY", // TODO: Mapear do plano
      };
      delete subBody.dueDate;
      
      const res = await fetch(`${ASAAS_API_URL}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY!
        },
        body: JSON.stringify(subBody)
      });
      result = await res.json();
    } else {
      const res = await fetch(`${ASAAS_API_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY!
        },
        body: JSON.stringify(body)
      });
      result = await res.json();
    }

    if (result.errors) throw new Error(result.errors[0].description);

    // Asaas não retorna uma URL de "checkout session" como o Stripe, 
    // mas sim um link de fatura (invoiceUrl) ou link de pagamento.
    // Para assinaturas, o primeiro pagamento tem uma invoiceUrl.
    
    return new Response(JSON.stringify({ 
      url: result.invoiceUrl || result.paymentLink || result.invoiceCustomizationUrl, 
      id: result.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[asaas-checkout]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
