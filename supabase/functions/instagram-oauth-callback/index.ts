// Callback OAuth — Instagram Login (padrão) ou Facebook Page + IG Business (legado).
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  buildAppReturnUrl,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  exchangeInstagramLoginCode,
  exchangeInstagramLoginLongLivedToken,
  fetchInstagramLoginUsername,
  findInstagramBusinessAccount,
  getInstagramOAuthRedirectUri,
  resolveInstagramAppCredentials,
  verifyInstagramOAuthState,
} from "../_shared/instagram-oauth.ts";

const redirect = (url: string) =>
  new Response(null, { status: 302, headers: { Location: url } });

Deno.serve(async (req) => {
  const creds = resolveInstagramAppCredentials();
  const stateSecret = Deno.env.get("INSTAGRAM_OAUTH_STATE_SECRET")?.trim() ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const appBaseUrl = (Deno.env.get("APP_BASE_URL") || "https://alpha-coach.app").trim();

  if (!creds || !stateSecret || !supabaseUrl) {
    return new Response("Instagram OAuth not configured", { status: 500 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error_description") || url.searchParams.get("error");

  const fallbackSlug = "alphateam";
  const fail = (slug: string, message: string) =>
    redirect(buildAppReturnUrl({ appBaseUrl, slug, status: "error", message }));

  if (oauthError) {
    return fail(fallbackSlug, oauthError);
  }
  if (!code || !stateRaw) {
    return fail(fallbackSlug, "Autorização cancelada ou resposta incompleta.");
  }

  const state = await verifyInstagramOAuthState(stateRaw, stateSecret);
  if (!state) {
    return fail(fallbackSlug, "Sessão OAuth expirada. Tente conectar novamente.");
  }

  const redirectUri = getInstagramOAuthRedirectUri(supabaseUrl);
  const flow = state.flow ?? "facebook_login";

  let accessToken: string;
  let expiresIn = 60 * 24 * 60 * 60;
  let igUserId: string;
  let displayName: string | undefined;

  if (flow === "instagram_login") {
    try {
      const short = await exchangeInstagramLoginCode({
        appId: creds.appId,
        appSecret: creds.appSecret,
        redirectUri,
        code,
      });
      if (!short.access_token || short.user_id == null) {
        throw new Error(
          short.error_message || short.error_type || "Token não retornado pelo Instagram",
        );
      }
      const long = await exchangeInstagramLoginLongLivedToken({
        appSecret: creds.appSecret,
        shortLivedToken: short.access_token,
      });
      if (!long.access_token) {
        throw new Error(long.error?.message || "Token longo não retornado pelo Instagram");
      }
      accessToken = long.access_token;
      if (long.expires_in) expiresIn = long.expires_in;
      igUserId = String(short.user_id);
      displayName = (await fetchInstagramLoginUsername(igUserId, accessToken)) ?? undefined;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao conectar conta Instagram";
      return fail(state.slug, message);
    }
  } else {
    let shortToken: string;
    try {
      const short = await exchangeCodeForToken({
        appId: creds.appId,
        appSecret: creds.appSecret,
        redirectUri,
        code,
      });
      if (!short.access_token) {
        throw new Error(short.error?.message || "Token curto não retornado pela Meta");
      }
      shortToken = short.access_token;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao trocar código OAuth";
      return fail(state.slug, message);
    }

    try {
      const long = await exchangeForLongLivedToken({
        appId: creds.appId,
        appSecret: creds.appSecret,
        shortLivedToken: shortToken,
      });
      if (!long.access_token) {
        throw new Error(long.error?.message || "Token longo não retornado pela Meta");
      }
      accessToken = long.access_token;
      if (long.expires_in) expiresIn = long.expires_in;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao gerar token longo";
      return fail(state.slug, message);
    }

    let igMatch;
    try {
      igMatch = await findInstagramBusinessAccount(accessToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao localizar conta Instagram";
      return fail(state.slug, message);
    }

    if (!igMatch) {
      return fail(
        state.slug,
        "Nenhuma Página do Facebook com Instagram vinculado. Use a conexão pelo Instagram ou vincule a Página na Meta.",
      );
    }

    igUserId = igMatch.instagramBusinessAccountId;
    displayName = igMatch.pageName;
  }

  const supabase = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const authFlow = flow === "instagram_login" ? "instagram_login" : "facebook_login";

  const { error: upsertErr } = await supabase
    .from("tenants_private")
    .upsert({
      tenant_id: state.tenant_id,
      instagram_access_token: accessToken,
      instagram_business_account_id: igUserId,
      instagram_token_expires_at: expiresAt,
      instagram_auth_flow: authFlow,
    });

  if (upsertErr) {
    return fail(state.slug, upsertErr.message);
  }

  return redirect(
    buildAppReturnUrl({
      appBaseUrl,
      slug: state.slug,
      status: "connected",
      pageName: displayName,
    }),
  );
});
