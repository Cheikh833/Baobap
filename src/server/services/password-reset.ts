import { z } from "zod";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { audit } from "@/server/audit";
import { hashPassword } from "@/server/auth/password";
import { generateToken, hashToken } from "@/server/auth/tokens";
import { isRateLimited, recordHit } from "@/server/rate-limit";
import { layout, sendMail, mailEnabled } from "@/server/mail/mailer";
import { signupSchema } from "@/lib/validation/schemas";

const RESET_MINUTES = 60;

/**
 * Demande de réinitialisation. Réponse identique que le compte existe ou non (pas d'énumération).
 * Renvoie si l'envoi d'emails est disponible, pour que l'interface ne prétende jamais avoir envoyé un email.
 */
export async function requestPasswordReset(emailInput: unknown, baseUrl: string, clientKey: string) {
  const email = z.string().trim().toLowerCase().email("Adresse email invalide.").parse(emailInput);
  if (!mailEnabled() && process.env.MAIL_TEST_OUTBOX !== "1") return { mail: false };
  const key = `reset:${clientKey}:${email}`;
  if (isRateLimited(key, 3, 15 * 60_000)) throw new AppError("RATE_LIMITED", "Trop de tentatives. Réessayez dans quelques minutes.");
  recordHit(key);
  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    const token = generateToken();
    await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000) } });
    const url = `${baseUrl}/reset-password/${token}`;
    const { html, text } = layout("Réinitialiser votre mot de passe / Reset your password", [
      `Bonjour ${user.name},`,
      "Une réinitialisation du mot de passe de votre compte BAOBAB a été demandée. Le lien est valable 1 heure et ne peut servir qu'une fois.",
      "A password reset was requested for your BAOBAB account. The link is valid for 1 hour and can only be used once.",
      "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message. / If you did not request this, ignore this message.",
    ], { label: "Choisir un nouveau mot de passe", url });
    await sendMail({ to: email, subject: "BAOBAB — Réinitialisation du mot de passe", html, text });
  }
  return { mail: true };
}

export async function resetPassword(token: string, passwordInput: unknown) {
  const password = signupSchema.shape.password.parse(passwordInput);
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) throw new AppError("NOT_FOUND", "Lien de réinitialisation invalide ou expiré.");
  const passwordHash = await hashPassword(password);
  await db.$transaction(async (tx) => {
    const used = await tx.passwordResetToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
    if (!used.count) throw new AppError("NOT_FOUND", "Lien de réinitialisation invalide ou expiré.");
    await tx.user.update({ where: { id: row.userId }, data: { passwordHash } });
    // Toutes les sessions ouvertes sont fermées : seul le nouveau mot de passe permet de se reconnecter.
    await tx.session.deleteMany({ where: { userId: row.userId } });
    await audit(tx, { organizationId: null, actorId: row.userId, action: "user.password_reset", entityType: "User", entityId: row.userId, summary: "Réinitialisation du mot de passe" });
  });
}

export async function isResetTokenValid(token: string) {
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  return !!row && !row.usedAt && row.expiresAt > new Date();
}
