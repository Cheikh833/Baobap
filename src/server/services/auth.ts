import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { isRateLimited, recordHit, resetHits } from "@/server/rate-limit";
import { audit } from "@/server/audit";
import { loginSchema, signupSchema } from "@/lib/validation/schemas";
import type { z } from "zod";

// Hash factice pour équilibrer le temps de réponse quand l'email n'existe pas.
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5c3A3oBhA6pR3bwSbqfJZQ8JqW7mT6e";

export async function registerUser(input: z.infer<typeof signupSchema>) {
  const data = signupSchema.parse(input);
  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError("CONFLICT", "Un compte existe déjà avec cette adresse email.");
  const user = await db.user.create({
    data: { email: data.email, name: data.name, passwordHash: await hashPassword(data.password) },
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
