// Inicia OAuth Meta/Instagram — retorna URL de autorização para o coach conectar a conta Business.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { assertCoachAccess } from "../_shared/coach-access.ts";
import {
  buildInstagramOAuthUrl,
  getInstagramOAuthRedirectUri,
  signInstagramOAuthState,
} from "../_shared/instagram-oauth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  const appId = Deno.env.get("META_APP_ID")?.trim();
  const appSecret = Deno.env.get("META_APP_SECRET")?.trim();
  const loginConfigId = Deno.env.get("META_LOGIN_CONFIG_ID")?.trim();
  const stateSecret = Deno.env.get("INSTAGRAM_OAUTH_STATE_SECRET")?.trim() ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();

  if (!appId || !appSecret || !stateSecret || !supabaseUrl) {
    return json(500, {
      error: "Instagram OAuth não configurado no servidor (META_APP_ID / META_APP_SECRET).",
    });
  }

  const supabase = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const auth = req.headers.get("Authorization");
  if (!auth) return json(401, { error: "missing authorization" });
  const { data: userData } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
  if (!userData?.user) return json(401, { error: "invalid session" });

  let body: { tenant_id?: string; slug?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid json" });
  }

  const tenantId = body.tenant_id ? String(body.tenant_id) : "";
  if (!tenantId) return json(400, { error: "missing tenant_id" });

  const allowed = await assertCoachAccess(supabase, userData.user.id, tenantId);
  if (!allowed) return json(403, { error: "not allowed for this tenant" });

  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("slug")
    .eq("id", tenantId)
    .maybeSingle();

  const slug = (body.slug || tenantRow?.slug || "").trim();
  if (!slug) return json(400, { error: "missing tenant slug" });

  const state = await signInstagramOAuthState(
    {
      tenant_id: tenantId,
      user_id: userData.user.id,
      slug,
      exp: Date.now() + 15 * 60 * 1000,
      nonce: crypto.randomUUID(),
    },
    stateSecret,
  );

  const redirectUri = getInstagramOAuthRedirectUri(supabaseUrl);
  const authUrl = buildInstagramOAuthUrl({
    appId,
    redirectUri,
    state,
    loginConfigId,
  });

  return json(200, { auth_url: authUrl });
});
