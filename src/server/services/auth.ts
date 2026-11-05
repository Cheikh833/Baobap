import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { isRateLimited, recordHit, resetHits } from "@/server/rate-limit";
import { audit } from "@/server/audit";
import { loginSchema, signupSchema } from "@/lib/validation/schemas";
import type { z } from "zod";

// Hash factice pour équilibrer le temps de réponse quand l'email n'existe pas.
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5c3A3oBhA6pR3bwSbqfJZQ8JqW7mT6e";

export async function registerUser(input: z.infer<typeof signupSchema>, opts: { termsAccepted?: boolean } = {}) {
  const data = signupSchema.parse(input);
  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError("CONFLICT", "Un compte existe déjà avec cette adresse email.");
  const user = await db.user.create({
    data: { email: data.email, name: data.name, passwordHash: await hashPassword(data.password), termsAcceptedAt: opts.termsAccepted ? new Date() : null },
  });
  await audit(db, { organizationId: null, actorId: user.id, action: "user.signup", entityType: "User", entityId: user.id, summary: "Création du compte" });
  return user;
}

export async function authenticate(input: z.infer<typeof loginSchema>, clientKey: string) {
  const data = loginSchema.parse(input);
  // Seuls les échecs comptent : 8 échecs en 15 minutes bloquent temporairement le couple (client, email).
  const key = `login:${clientKey}:${data.email}`;
  if (isRateLimited(key, 8, 15 * 60_000)) {
    throw new AppError("RATE_LIMITED", "Trop de tentatives. Réessayez dans quelques minutes.");
  }
  const user = await db.user.findUnique({ where: { email: data.email } });
  const ok = await verifyPassword(data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) {
    recordHit(key);
    throw new AppError("UNAUTHENTICATED", "Email ou mot de passe incorrect.");
  }
  resetHits(key);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return user;
}

/**
 * Connexion via Google / Apple. Un seul bouton pour tout le monde :
 *  1. compte externe déjà connu (même fournisseur, même identifiant « sub ») → connexion ;
 *  2. sinon, un compte BAOBAB existe avec le même email **vérifié par le fournisseur** → rattachement puis connexion ;
 *  3. sinon → création du compte (première fois), puis connexion. Les fois suivantes, on retombe dans le cas 1.
 * L'acceptation des conditions est indiquée à côté du bouton ; elle est enregistrée à la création.
 */
export async function signInWithOAuth(provider: string, claims: { sub: string; email?: string; email_verified?: boolean | string; name?: string; given_name?: string; family_name?: string }, fallbackName?: string) {
  const known = await db.oAuthAccount.findUnique({ where: { provider_providerAccountId: { provider, providerAccountId: claims.sub } }, include: { user: true } });
  if (known) {
    await db.$transaction([
      db.oAuthAccount.update({ where: { id: known.id }, data: { lastUsedAt: new Date() } }),
      db.user.update({ where: { id: known.userId }, data: { lastLoginAt: new Date() } }),
    ]);
    return { user: known.user, created: false };
  }
  const verified = claims.email_verified === true || claims.email_verified === "true";
  const email = claims.email?.trim().toLowerCase();
  if (!email || !verified) throw new AppError("VALIDATION", "Votre compte ne fournit pas d'adresse email vérifiée : utilisez un autre moyen de connexion.");
  return db.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email } });
    if (existing) {
      await tx.oAuthAccount.create({ data: { userId: existing.id, provider, providerAccountId: claims.sub, email } });
      const user = await tx.user.update({ where: { id: existing.id }, data: { lastLoginAt: new Date() } });
      await audit(tx, { organizationId: null, actorId: user.id, action: "user.oauth.link", entityType: "User", entityId: user.id, summary: `Compte ${provider} rattaché` });
      return { user, created: false };
    }
    const name = (claims.name || [claims.given_name, claims.family_name].filter(Boolean).join(" ") || fallbackName || email.split("@")[0]).trim().slice(0, 120);
    const user = await tx.user.create({ data: { email, name, passwordHash: null, termsAcceptedAt: new Date(), lastLoginAt: new Date(), oauthAccounts: { create: { provider, providerAccountId: claims.sub, email } } } });
    await audit(tx, { organizationId: null, actorId: user.id, action: "user.signup", entityType: "User", entityId: user.id, summary: `Création du compte via ${provider}` });
    return { user, created: true };
  });
}
