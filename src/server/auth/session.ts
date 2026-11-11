import "server-only";
import { cookies, headers } from "next/headers";
import { db } from "@/server/db";
import { generateToken, hashToken } from "./tokens";

export const SESSION_COOKIE = "baobab_session";
export const ORG_COOKIE = "baobab_org";
const SESSION_DAYS = 30;
/** Appareil déjà utilisé pour se connecter : la page d'inscription renvoie alors vers la connexion. */
export const KNOWN_COOKIE = "baobab_known";
/** Dernière méthode de connexion utilisée sur cet appareil (« password », « google », « apple »). */
export const METHOD_COOKIE = "baobab_method";

const cookieBase = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.COOKIE_SECURE === "true",
  path: "/",
});

/** `guest` : session de démo visiteur (24 h), sans marquer l'appareil comme « déjà inscrit ». */
export async function createSession(userId: string, opts: { guest?: boolean } = {}) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + (opts.guest ? 1 : SESSION_DAYS) * 86_400_000);
  const ua = (await headers()).get("user-agent")?.slice(0, 255);
  await db.session.create({ data: { id: hashToken(token), userId, expiresAt, userAgent: ua } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { ...cookieBase(), expires: expiresAt });
  if (!opts.guest) jar.set(KNOWN_COOKIE, "1", { ...cookieBase(), maxAge: 60 * 60 * 24 * 400 });
}

export async function rememberMethod(method: "password" | "google" | "microsoft" | "apple") {
  (await cookies()).set(METHOD_COOKIE, method, { ...cookieBase(), maxAge: 60 * 60 * 24 * 400 });
}

export async function deviceHints() {
  const jar = await cookies();
  return { known: jar.get(KNOWN_COOKIE)?.value === "1", method: jar.get(METHOD_COOKIE)?.value ?? null };
}

export async function getSessionUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { id: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

/** Identifiant (haché) de la session courante, pour la distinguer dans la liste des appareils. */
export async function currentSessionId() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? hashToken(token) : null;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
  jar.delete(ORG_COOKIE);
}

export async function setActiveOrganization(organizationId: string) {
  (await cookies()).set(ORG_COOKIE, organizationId, { ...cookieBase(), maxAge: 60 * 60 * 24 * 365 });
}

export async function getActiveOrganizationId() {
  return (await cookies()).get(ORG_COOKIE)?.value ?? null;
}
