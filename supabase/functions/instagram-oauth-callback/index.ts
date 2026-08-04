// Callback OAuth Meta — troca code por token longo e salva credenciais Instagram por tenant.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  buildAppReturnUrl,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  findInstagramBusinessAccount,
  getInstagramOAuthRedirectUri,
  verifyInstagramOAuthState,
} from "../_shared/instagram-oauth.ts";

const redirect = (url: string) =>
  new Response(null, { status: 302, headers: { Location: url } });

Deno.serve(async (req) => {
  const appId = Deno.env.get("META_APP_ID")?.trim();
  const appSecret = Deno.env.get("META_APP_SECRET")?.trim();
  const stateSecret = Deno.env.get("INSTAGRAM_OAUTH_STATE_SECRET")?.trim() ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const appBaseUrl = (Deno.env.get("APP_BASE_URL") || "https://alpha-coach.app").trim();

  if (!appId || !appSecret || !stateSecret || !supabaseUrl) {
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

  let shortToken: string;
  try {
    const short = await exchangeCodeForToken({
      appId,
      appSecret,
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

  let accessToken: string;
  let expiresIn = 60 * 24 * 60 * 60;
  try {
    const long = await exchangeForLongLivedToken({
      appId,
      appSecret,
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
    const message = err instanceof Error ? err.message : "Falha ao localizar conta Instagram Business";
    return fail(state.slug, message);
  }

  if (!igMatch) {
    return fail(
      state.slug,
      "Nenhuma Página do Facebook com Instagram Business encontrada. Vincule o Instagram à sua Página na Meta.",
    );
  }

  const supabase = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const { error: upsertErr } = await supabase
    .from("tenants_private")
    .upsert({
      tenant_id: state.tenant_id,
      instagram_access_token: accessToken,
      instagram_business_account_id: igMatch.instagramBusinessAccountId,
      instagram_token_expires_at: expiresAt,
    });

  if (upsertErr) {
    return fail(state.slug, upsertErr.message);
  }

  return redirect(
    buildAppReturnUrl({
      appBaseUrl,
      slug: state.slug,
      status: "connected",
      pageName: igMatch.pageName,
    }),
  );
});
