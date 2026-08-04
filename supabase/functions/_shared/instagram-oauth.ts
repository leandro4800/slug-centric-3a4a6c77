const FB = "https://graph.facebook.com/v21.0";
const FB_DIALOG = "https://www.facebook.com/v21.0/dialog/oauth";

export const IG_OAUTH_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
].join(",");

export type InstagramOAuthState = {
  tenant_id: string;
  user_id: string;
  slug: string;
  exp: number;
  nonce: string;
};

const encoder = new TextEncoder();

const toBase64Url = (bytes: ArrayBuffer | Uint8Array) => {
  const bin = bytes instanceof Uint8Array
    ? String.fromCharCode(...bytes)
    : String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (value: string) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((value.length + 3) % 4);
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signInstagramOAuthState(
  payload: InstagramOAuthState,
  secret: string,
): Promise<string> {
  const data = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return `${data}.${toBase64Url(sig)}`;
}

export async function verifyInstagramOAuthState(
  state: string,
  secret: string,
): Promise<InstagramOAuthState | null> {
  const [data, sig] = state.split(".");
  if (!data || !sig) return null;

  const key = await hmacKey(secret);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    fromBase64Url(sig),
    encoder.encode(data),
  );
  if (!valid) return null;

  try {
    const json = new TextDecoder().decode(fromBase64Url(data));
    const payload = JSON.parse(json) as InstagramOAuthState;
    if (!payload?.tenant_id || !payload?.user_id || !payload?.slug) return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getInstagramOAuthRedirectUri(supabaseUrl: string) {
  return `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/instagram-oauth-callback`;
}

export function buildInstagramOAuthUrl(args: {
  appId: string;
  redirectUri: string;
  state: string;
}) {
  const params = new URLSearchParams({
    client_id: args.appId,
    redirect_uri: args.redirectUri,
    state: args.state,
    scope: IG_OAUTH_SCOPES,
    response_type: "code",
  });
  return `${FB_DIALOG}?${params.toString()}`;
}

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: { message?: string };
};

export async function exchangeCodeForToken(args: {
  appId: string;
  appSecret: string;
  redirectUri: string;
  code: string;
}): Promise<TokenResponse> {
  const params = new URLSearchParams({
    client_id: args.appId,
    client_secret: args.appSecret,
    redirect_uri: args.redirectUri,
    code: args.code,
  });
  const res = await fetch(`${FB}/oauth/access_token?${params}`);
  return res.json();
}

export async function exchangeForLongLivedToken(args: {
  appId: string;
  appSecret: string;
  shortLivedToken: string;
}): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: args.appId,
    client_secret: args.appSecret,
    fb_exchange_token: args.shortLivedToken,
  });
  const res = await fetch(`${FB}/oauth/access_token?${params}`);
  return res.json();
}

type IgPageMatch = {
  pageId: string;
  pageName: string;
  instagramBusinessAccountId: string;
};

export async function findInstagramBusinessAccount(
  userToken: string,
): Promise<IgPageMatch | null> {
  const res = await fetch(
    `${FB}/me/accounts?fields=id,name,instagram_business_account&access_token=${encodeURIComponent(userToken)}`,
  );
  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload?.error?.message || "Falha ao listar páginas do Facebook");
  }

  for (const page of payload?.data ?? []) {
    const igId = page?.instagram_business_account?.id as string | undefined;
    if (igId) {
      return {
        pageId: String(page.id),
        pageName: String(page.name || "Página"),
        instagramBusinessAccountId: igId,
      };
    }
  }

  return null;
}

export function buildAppReturnUrl(args: {
  appBaseUrl: string;
  slug: string;
  status: "connected" | "error";
  message?: string;
  pageName?: string;
}) {
  const base = args.appBaseUrl.replace(/\/+$/, "");
  const url = new URL(`${base}/${encodeURIComponent(args.slug)}/admin/vlogs`);
  url.searchParams.set("instagram", args.status);
  if (args.message) url.searchParams.set("instagram_msg", args.message.slice(0, 180));
  if (args.pageName) url.searchParams.set("instagram_page", args.pageName.slice(0, 80));
  return url.toString();
}
