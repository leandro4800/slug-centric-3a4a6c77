import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    // Identify the caller (coach)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    // Find the tenant owned by the caller
    const { data: tenant, error: tenantErr } = await admin
      .from("tenants").select("id, slug, nome, is_partner").eq("owner_user_id", callerId).maybeSingle();
    if (tenantErr || !tenant) {
      return new Response(JSON.stringify({ error: "Você não é dono de nenhum tenant" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const nome = String(body.nome || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const telefone = String(body.telefone || "").trim() || null;
    const planoId = body.plano_id || null;

    if (!nome || !email) {
      return new Response(JSON.stringify({ error: "Nome e email são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const VIP_EMAILS = ["48mineiro@gmail.com", "vozesdamitologia1@gmail.com"];
    const isVip = VIP_EMAILS.includes(email);
    const isPartner = !!(tenant as { is_partner?: boolean }).is_partner;

    // ============================================================
    // FLUXO CONVITE (tenant NÃO parceiro e e-mail não-VIP):
    // não cria conta Auth nem senha — apenas registra o lead e
    // envia convite para o aluno assinar pela landing do tenant.
    // ============================================================
    if (!isPartner && !isVip) {
      const { error: leadErr } = await admin
        .from("alunos_pendentes")
        .upsert(
          {
            tenant_id: tenant.id,
            nome,
            email,
            telefone,
            plano_id: planoId,
            status: "convidado",
            convite_enviado_em: new Date().toISOString(),
          },
          { onConflict: "tenant_id,email" }
        );

      if (leadErr) {
        // fallback: índice único é sobre lower(email), upsert por onConflict pode não casar
        const { data: existingLead } = await admin
          .from("alunos_pendentes")
          .select("id")
          .eq("tenant_id", tenant.id)
          .ilike("email", email)
          .maybeSingle();
        if (existingLead) {
          await admin
            .from("alunos_pendentes")
            .update({
              nome,
              telefone,
              plano_id: planoId,
              status: "convidado",
              convite_enviado_em: new Date().toISOString(),
            })
            .eq("id", existingLead.id);
        } else {
          const { error: insErr } = await admin.from("alunos_pendentes").insert({
            tenant_id: tenant.id,
            nome,
            email,
            telefone,
            plano_id: planoId,
            status: "convidado",
            convite_enviado_em: new Date().toISOString(),
          });
          if (insErr) {
            return new Response(JSON.stringify({ error: `Falha ao registrar convite: ${insErr.message}` }), {
              status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

      const landingUrl = tenant.slug
        ? `https://alpha-coach.app/${tenant.slug}${planoId ? `?plano=${planoId}` : ""}`
        : "https://alpha-coach.app/site";

      try {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (!resendKey) throw new Error("RESEND_API_KEY não configurada");

        const htmlConvite = `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h1 style="color:#000;">Olá, ${nome}! 💪</h1>
            <p><strong>${tenant.nome || "Seu coach"}</strong> te convidou para treinar no Alpha Coach Pro.</p>
            <div style="background:#f5f5f5;padding:16px;border-left:4px solid #E50914;margin:20px 0;">
              <p style="font-size:10px;letter-spacing:2px;color:#E50914;font-weight:bold;margin:0 0 8px;">PRÓXIMO PASSO</p>
              <p style="margin:4px 0;">Escolha seu plano e finalize seu cadastro. Assim que o pagamento for confirmado, seu acesso ao app é liberado automaticamente e você recebe um e-mail para definir sua senha.</p>
            </div>
            <p style="font-size:14px;color:#333;">
              O <strong>Alpha Coach Pro</strong> é o aplicativo onde seu coach acompanha toda a sua evolução.
              Pelo app você terá acesso aos seus treinos personalizados, plano alimentar, avaliações físicas,
              acompanhamento de progresso e comunicação direta com seu coach — tudo em um só lugar.
            </p>
            <p style="text-align:center;margin:32px 0;">
              <a href="${landingUrl}" style="background:#E50914;color:#fff;padding:14px 28px;text-decoration:none;font-weight:bold;text-transform:uppercase;font-size:13px;letter-spacing:1px;">ESCOLHER MEU PLANO</a>
            </p>
            <p style="font-size:12px;color:#999;">Equipe ${tenant.nome || "Alpha Coach Pro"}</p>
          </div>
        `;

        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Alpha Coach Pro <suporte@alpha-coach.app>",
            to: [email],
            subject: `${tenant.nome || "Seu coach"} te convidou para o Alpha Coach Pro`,
            html: htmlConvite,
          }),
        });
        if (!resp.ok) {
          const errText = await resp.text();
          console.error("[site-create-aluno] resend convite error", resp.status, errText);
          throw new Error(`Falha ao enviar convite (${resp.status}): ${errText}`);
        }
        console.log("[site-create-aluno] convite enviado para", email);
      } catch (e) {
        console.error("[site-create-aluno] convite email error", e);
        throw new Error(String((e as Error).message || e));
      }

      return new Response(
        JSON.stringify({ ok: true, modo: "convite", aguardando_pagamento: true, landing_url: landingUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // FLUXO LEGADO (parceiro / VIP): cria conta + acesso imediato
    // ============================================================
    // Password pattern: primeironome (minusculo, sem acento) + 2026 (ex.: samila2026)
    const firstName = nome
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().trim().split(/\s+/)[0].replace(/[^a-z0-9]/g, "");
    const password = `${firstName || "aluno"}2026`;


    // Check if a user with this email already exists (may already be aluno/coach elsewhere)
    let newUserId: string | null = null;
    let isExisting = false;
    let existingOwnsTenant = false;

    const { data: existingProfile } = await admin
      .from("perfis")
      .select("id, tenant_id")
      .ilike("email", email)
      .maybeSingle();

    if (existingProfile) {
      newUserId = existingProfile.id;
      isExisting = true;

      // If the user owns another tenant, preserve perfis.tenant_id (they stay coach there)
      const { data: ownedTenant } = await admin
        .from("tenants").select("id").eq("owner_user_id", newUserId).maybeSingle();
      existingOwnsTenant = !!ownedTenant;

      // NÃO reseta a senha de um usuário que já existe — isso é uma conta global
      // no Supabase Auth e resetar aqui quebraria o acesso do usuário em outros
      // tenants onde ele já usa outra senha. O coach deve orientar o aluno a usar
      // "Esqueci minha senha" caso não lembre.
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome_completo: nome, tenant_id: tenant.id },
      });

      if (createErr || !created.user) {
        return new Response(JSON.stringify({ error: createErr?.message || "Falha ao criar usuário" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      newUserId = created.user.id;
    }

    // Upsert profile: keep tenant_id if user already owns another tenant, otherwise set to caller's tenant
    const profileUpsert: Record<string, unknown> = {
      id: newUserId,
      email,
      nome_completo: nome,
      telefone,
      onboarding_completo: true,
    };
    if (!existingOwnsTenant) {
      profileUpsert.tenant_id = tenant.id;
    }
    await admin.from("perfis").upsert(profileUpsert, { onConflict: "id" });

    // Aluno role for the caller's tenant (multi-tenant safe)
    await admin.from("user_roles").upsert(
      { user_id: newUserId, role: "aluno", tenant_id: tenant.id },
      { onConflict: "user_id,role,tenant_id" }
    );

    // VIP emails: sem plano selecionado, ativar assinatura de 100 anos usando o primeiro plano ativo do tenant
    let effectivePlanoId: string | null = planoId;
    if (!effectivePlanoId && isVip) {
      const { data: anyPlan } = await admin
        .from("planos").select("id").eq("tenant_id", tenant.id).eq("ativo", true)
        .order("ordem", { ascending: true }).limit(1).maybeSingle();
      effectivePlanoId = anyPlan?.id ?? null;
    }

    // Aqui só chegam tenants PARCEIROS ou e-mails VIP — assinatura ativa liberada.
    const aguardandoPagamento = false;


    if (effectivePlanoId) {
      const periodEnd = isVip
        ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
      await admin.from("assinaturas").upsert({
        aluno_id: newUserId,
        tenant_id: tenant.id,
        plano_id: effectivePlanoId,
        status: "active",
        current_period_end: periodEnd,
      }, { onConflict: "aluno_id,tenant_id" });
    }

    if (isExisting) {
      console.log(`[site-create-aluno] linked existing user ${newUserId} as aluno of tenant ${tenant.id} (ownsTenant=${existingOwnsTenant})`);
    }

    // Fluxo de produção: domínio alpha-coach.app verificado no Resend.
    // Envia direto via Resend para o e-mail real do aluno.
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (!resendKey) throw new Error("RESEND_API_KEY não configurada");

      const loginUrl = tenant.slug ? `https://alpha-coach.app/${tenant.slug}/app` : "https://alpha-coach.app/login";

      const credenciaisBlock = isExisting
        ? `
          <div style="background:#f5f5f5;padding:16px;border-left:4px solid #E50914;margin:20px 0;">
            <p style="font-size:10px;letter-spacing:2px;color:#E50914;font-weight:bold;margin:0 0 8px;">SEU ACESSO</p>
            <p style="margin:4px 0;">Você já tem conta no Alpha Coach com o e-mail <strong>${email}</strong>.</p>
            <p style="margin:8px 0 0;">Use a <strong>mesma senha</strong> que você já utiliza. Caso não lembre, clique em <em>"Esqueci minha senha"</em> na tela de login.</p>
          </div>`
        : `
          <div style="background:#f5f5f5;padding:16px;border-left:4px solid #E50914;margin:20px 0;">
            <p style="font-size:10px;letter-spacing:2px;color:#E50914;font-weight:bold;margin:0 0 8px;">SEUS DADOS DE ACESSO</p>
            <p style="font-family:monospace;margin:4px 0;"><strong>Usuário:</strong> ${email}</p>
            <p style="font-family:monospace;margin:4px 0;"><strong>Senha temporária:</strong> ${password}</p>
          </div>`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <h1 style="color:#000;">Olá, ${nome}! 💪</h1>
          <p>Seu cadastro foi feito por <strong>${tenant.nome || "seu coach"}</strong>. Agora você tem acesso ao aplicativo.</p>
          ${credenciaisBlock}
          <p style="font-size:14px;color:#333;">
            Pelo <strong>app Alpha Coach Pro</strong> você acompanha todo o seu acompanhamento com seu coach:
            treinos personalizados com vídeos de cada exercício, plano alimentar diário, avaliações físicas,
            gráficos de evolução e contato direto com seu coach. Tudo na palma da mão.
          </p>
          <p style="text-align:center;margin:32px 0;">
            <a href="${loginUrl}" style="background:#E50914;color:#fff;padding:14px 28px;text-decoration:none;font-weight:bold;text-transform:uppercase;font-size:13px;letter-spacing:1px;">ENTRAR NO APP</a>
          </p>
          <p style="font-size:12px;color:#999;">Equipe ${tenant.nome || "Alpha Coach Pro"}</p>
        </div>
      `;

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Alpha Coach Pro <suporte@alpha-coach.app>",
          to: [email],
          subject: isExisting
            ? `Você foi adicionado à ${tenant.nome || "Alpha Coach Pro"}`
            : `Bem-vindo(a) à ${tenant.nome || "Alpha Coach Pro"} — seus dados de acesso`,
          html,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error("[site-create-aluno] resend error", resp.status, errText);
        throw new Error(`Falha ao enviar email (${resp.status}): ${errText}`);
      }
      console.log("[site-create-aluno] email enviado para", email);
    } catch (e) {
      console.error("[site-create-aluno] email error", e);
      throw new Error(String((e as Error).message || e));
    }

    return new Response(JSON.stringify({ ok: true, user_id: newUserId, aguardando_pagamento: aguardandoPagamento }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[site-create-aluno] error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
