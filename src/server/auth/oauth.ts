import "server-only";
import { createHash, createPrivateKey, createPublicKey, createSign, createVerify, randomBytes, type JsonWebKey } from "node:crypto";

// Connexion via Google et Apple (OpenID Connect, flux « code d'autorisation » + PKCE).
// Le jeton d'identité est vérifié localement : signature (clés publiques JWKS du fournisseur), émetteur,
// audience, expiration et nonce. Un fournisseur sans configuration n'apparaît pas dans l'interface.

export type ProviderId = "google" | "apple";

type ProviderConfig = {
  id: ProviderId;
  authorizeUrl: string;
  tokenUrl: string;
  jwksUrl: string;
  issuer: string;
  clientId: string;
  scope: string;
  /** Apple renvoie le résultat en POST (form_post). */
  responseMode?: "form_post";
  clientSecret: () => string;
};

const env = (k: string) => process.env[k]?.trim() || "";

export function providerConfig(id: string): ProviderConfig | null {
  if (id === "google" && env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET")) {
    return {
      id, authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth", tokenUrl: "https://oauth2.googleapis.com/token",
      jwksUrl: "https://www.googleapis.com/oauth2/v3/certs", issuer: "https://accounts.google.com",
      clientId: env("GOOGLE_CLIENT_ID"), scope: "openid email profile", clientSecret: () => env("GOOGLE_CLIENT_SECRET"),
    };
  }
  if (id === "apple" && env("APPLE_CLIENT_ID") && env("APPLE_TEAM_ID") && env("APPLE_KEY_ID") && env("APPLE_PRIVATE_KEY")) {
    return {
      id, authorizeUrl: "https://appleid.apple.com/auth/authorize", tokenUrl: "https://appleid.apple.com/auth/token",
      jwksUrl: "https://appleid.apple.com/auth/keys", issuer: "https://appleid.apple.com",
      clientId: env("APPLE_CLIENT_ID"), scope: "name email", responseMode: "form_post",
      clientSecret: () => appleClientSecret(env("APPLE_TEAM_ID"), env("APPLE_CLIENT_ID"), env("APPLE_KEY_ID"), env("APPLE_PRIVATE_KEY").replace(/\\n/g, "\n")),
    };
  }
  return null;
}

/** Fournisseurs configurés (dans l'ordre d'affichage). */
export const enabledProviders = (): ProviderId[] => (["google", "apple"] as const).filter((p) => providerConfig(p));

// ───────────── Outils JWT / PKCE ─────────────

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");
export const randomToken = () => randomBytes(32).toString("base64url");
export const pkceChallenge = (verifier: string) => b64url(createHash("sha256").update(verifier).digest());

/** Secret client Apple : JWT ES256 signé avec la clé privée (.p8), valable 5 minutes. */
export function appleClientSecret(teamId: string, clientId: string, keyId: string, privateKeyPem: string, now = Date.now()) {
  const header = b64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const iat = Math.floor(now / 1000);
  const payload = b64url(JSON.stringify({ iss: teamId, iat, exp: iat + 300, aud: "https://appleid.apple.com", sub: clientId }));
  const sig = createSign("SHA256").update(`${header}.${payload}`).sign({ key: createPrivateKey(privateKeyPem), dsaEncoding: "ieee-p1363" });
  return `${header}.${payload}.${b64url(sig)}`;
}

export function authorizeUrl(p: ProviderConfig, redirectUri: string, state: string, nonce: string, verifier: string) {
  const u = new URL(p.authorizeUrl);
  u.searchParams.set("client_id", p.clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", p.scope);
  u.searchParams.set("state", state);
  u.searchParams.set("nonce", nonce);
  u.searchParams.set("code_challenge", pkceChallenge(verifier));
  u.searchParams.set("code_challenge_method", "S256");
  if (p.responseMode) u.searchParams.set("response_mode", p.responseMode);
  if (p.id === "google") u.searchParams.set("prompt", "select_account");
  return u.toString();
}

export async function exchangeCode(p: ProviderConfig, code: string, redirectUri: string, verifier: string, fetcher: typeof fetch = fetch) {
  const res = await fetcher(p.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, client_id: p.clientId, client_secret: p.clientSecret(), code_verifier: verifier }),
  });
  if (!res.ok) throw new OAuthError("token");
  const json = (await res.json()) as { id_token?: string };
  if (!json.id_token) throw new OAuthError("token");
  return json.id_token;
}

export class OAuthError extends Error {
  constructor(public reason: "state" | "token" | "id_token" | "email" | "provider" | "denied") { super(`OAuth: ${reason}`); }
}

// Cache des clés publiques (1 heure).
const jwksCache = new Map<string, { at: number; keys: (JsonWebKey & { kid?: string })[] }>();

async function getKeys(url: string, fetcher: typeof fetch, force = false) {
  const c = jwksCache.get(url);
  if (c && !force && Date.now() - c.at < 3_600_000) return c.keys;
  const res = await fetcher(url);
  if (!res.ok) throw new OAuthError("id_token");
  const keys = ((await res.json()) as { keys: (JsonWebKey & { kid?: string })[] }).keys;
  jwksCache.set(url, { at: Date.now(), keys });
  return keys;
}

export type IdClaims = { sub: string; email?: string; email_verified?: boolean | string; name?: string; given_name?: string; family_name?: string; nonce?: string };

/** Vérifie un jeton d'identité RS256 : signature, émetteur, audience, expiration, nonce. */
export async function verifyIdToken(idToken: string, opts: { jwksUrl: string; issuer: string | string[]; audience: string; nonce: string; now?: number; fetcher?: typeof fetch }): Promise<IdClaims> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new OAuthError("id_token");
  const [h, pl, sig] = parts;
  let header: { alg?: string; kid?: string }, claims: IdClaims & { iss?: string; aud?: string | string[]; exp?: number; iat?: number };
  try {
    header = JSON.parse(Buffer.from(h, "base64url").toString());
    claims = JSON.parse(Buffer.from(pl, "base64url").toString());
  } catch {
    throw new OAuthError("id_token");
  }
  if (header.alg !== "RS256" || !header.kid) throw new OAuthError("id_token");
  const fetcher = opts.fetcher ?? fetch;
  let jwk = (await getKeys(opts.jwksUrl, fetcher)).find((k) => k.kid === header.kid);
  if (!jwk) jwk = (await getKeys(opts.jwksUrl, fetcher, true)).find((k) => k.kid === header.kid); // rotation des clés
  if (!jwk) throw new OAuthError("id_token");
  const ok = createVerify("RSA-SHA256").update(`${h}.${pl}`).verify(createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(sig, "base64url"));
  if (!ok) throw new OAuthError("id_token");
  const now = Math.floor((opts.now ?? Date.now()) / 1000);
  const issuers = Array.isArray(opts.issuer) ? opts.issuer : [opts.issuer];
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!claims.iss || !issuers.includes(claims.iss)) throw new OAuthError("id_token");
  if (!aud.includes(opts.audience)) throw new OAuthError("id_token");
  if (!claims.exp || claims.exp + 60 < now) throw new OAuthError("id_token");
  if (claims.nonce !== opts.nonce) throw new OAuthError("id_token");
  if (!claims.sub) throw new OAuthError("id_token");
  return claims;
}

/** Google accepte les deux formes d'émetteur. */
export const issuersFor = (p: ProviderConfig) => (p.id === "google" ? [p.issuer, "accounts.google.com"] : [p.issuer]);
