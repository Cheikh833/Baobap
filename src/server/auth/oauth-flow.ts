import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { authorizeUrl, exchangeCode, issuersFor, normalizeClaims, OAuthError, providerConfig, randomToken, verifyIdToken, type ProviderId } from "./oauth";
import { createSession, rememberMethod } from "./session";
import { signInWithOAuth } from "@/server/services/auth";
import { AppError } from "@/server/errors";
import { safeNext } from "@/lib/safe-next";

const FLOW_COOKIE = "baobab_oauth";

const baseUrl = (req: NextRequest) => (process.env.APP_URL?.trim().replace(/\/$/, "") || req.nextUrl.origin);
const redirectUri = (req: NextRequest, p: string) => `${baseUrl(req)}/api/auth/oauth/${p}/callback`;
const toLogin = (req: NextRequest, error: string, next?: string | null) =>
  NextResponse.redirect(new URL(`/login?error=${error}${next ? `&next=${encodeURIComponent(next)}` : ""}`, baseUrl(req)), 303);

function flowCookieOptions(provider: string) {
  const secure = process.env.COOKIE_SECURE === "true";
  // Apple répond par un POST inter-sites (form_post) : le cookie doit alors être SameSite=None (donc Secure).
  return { httpOnly: true, secure, sameSite: provider === "apple" && secure ? ("none" as const) : ("lax" as const), path: "/api/auth/oauth", maxAge: 600 };
}

/** Départ : génère state, nonce et vérificateur PKCE (cookie de 10 minutes), puis redirige vers le fournisseur. */
export async function startOAuth(req: NextRequest, provider: string) {
  const cfg = providerConfig(provider);
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  if (!cfg) return toLogin(req, "provider", next);
  const flow = { p: cfg.id, state: randomToken(), nonce: randomToken(), verifier: randomToken(), next };
  (await cookies()).set(FLOW_COOKIE, Buffer.from(JSON.stringify(flow)).toString("base64url"), flowCookieOptions(cfg.id));
  return NextResponse.redirect(authorizeUrl(cfg, redirectUri(req, cfg.id), flow.state, flow.nonce, flow.verifier), 303);
}

/** Retour du fournisseur : vérifie state, échange le code, vérifie le jeton d'identité, connecte (ou crée le compte). */
export async function finishOAuth(req: NextRequest, provider: string, params: URLSearchParams) {
  const jar = await cookies();
  const raw = jar.get(FLOW_COOKIE)?.value;
  jar.delete({ name: FLOW_COOKIE, path: "/api/auth/oauth" });
  let flow: { p: ProviderId; state: string; nonce: string; verifier: string; next: string | null } | null = null;
  try { flow = raw ? JSON.parse(Buffer.from(raw, "base64url").toString()) : null; } catch { flow = null; }
  const next = flow?.next ?? null;
  if (params.get("error")) return toLogin(req, "denied", next);
  const cfg = providerConfig(provider);
  if (!cfg) return toLogin(req, "provider", next);
  if (!flow || flow.p !== cfg.id || !params.get("state") || params.get("state") !== flow.state || !params.get("code")) return toLogin(req, "state", next);
  try {
    const idToken = await exchangeCode(cfg, params.get("code")!, redirectUri(req, cfg.id), flow.verifier);
    const claims = normalizeClaims(cfg.id, await verifyIdToken(idToken, { jwksUrl: cfg.jwksUrl, issuer: issuersFor(cfg), audience: cfg.clientId, nonce: flow.nonce }));
    // Apple ne transmet le nom qu'à la première connexion, dans le champ « user ».
    let fallbackName: string | undefined;
    try {
      const u = JSON.parse(params.get("user") ?? "null") as { name?: { firstName?: string; lastName?: string } } | null;
      fallbackName = [u?.name?.firstName, u?.name?.lastName].filter(Boolean).join(" ") || undefined;
    } catch { /* champ absent ou invalide */ }
    const { user, created } = await signInWithOAuth(cfg.id, claims, fallbackName);
    await createSession(user.id);
    await rememberMethod(cfg.id);
    return NextResponse.redirect(new URL(next ?? (created ? "/onboarding" : "/dashboard"), baseUrl(req)), 303);
  } catch (e) {
    if (e instanceof OAuthError) return toLogin(req, e.reason === "id_token" || e.reason === "token" ? "verify" : e.reason, next);
    if (e instanceof AppError) return toLogin(req, "email", next);
    console.error(e);
    return toLogin(req, "verify", next);
  }
}
