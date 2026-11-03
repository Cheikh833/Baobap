import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { mailOutbox } from "@/server/mail/mailer";
import { authenticate, registerUser } from "@/server/services/auth";
import { requestPasswordReset, resetPassword } from "@/server/services/password-reset";
import { resetDb } from "./helpers";

const code = (e: unknown) => (e instanceof AppError ? e.code : String(e));
const tokenFromMail = () => mailOutbox.at(-1)!.text.match(/reset-password\/([\w-]+)/)![1];

beforeAll(() => { process.env.MAIL_TEST_OUTBOX = "1"; });
afterAll(async () => { delete process.env.MAIL_TEST_OUTBOX; await db.$disconnect(); });
beforeEach(async () => { await resetDb(); await db.passwordResetToken.deleteMany(); mailOutbox.length = 0; });

describe("mot de passe oublié", () => {
  it("envoie un lien, change le mot de passe, ferme les sessions, lien à usage unique", async () => {
    const u = await registerUser({ name: "Awa", email: "awa@test.sn", password: "ancienmdp123" });
    await db.session.create({ data: { id: "s1", userId: u.id, expiresAt: new Date(Date.now() + 86_400_000) } });
    expect(await requestPasswordReset("awa@test.sn", "https://baobab.test", "c1")).toEqual({ mail: true });
    expect(mailOutbox).toHaveLength(1);
    const token = tokenFromMail();
    expect(mailOutbox[0].text).toContain("https://baobab.test/reset-password/");
    await resetPassword(token, "nouveaumdp456");
    expect(await db.session.count({ where: { userId: u.id } })).toBe(0);
    expect((await authenticate({ email: "awa@test.sn", password: "nouveaumdp456" }, "c1")).id).toBe(u.id);
    await expect(resetPassword(token, "autremdp789").catch(code)).resolves.toBe("NOT_FOUND");
  });

  it("même réponse pour un email inconnu, sans envoi", async () => {
    expect(await requestPasswordReset("inconnu@test.sn", "https://baobab.test", "c2")).toEqual({ mail: true });
    expect(mailOutbox).toHaveLength(0);
  });

  it("lien expiré refusé ; mot de passe faible refusé ; jeton stocké haché", async () => {
    await registerUser({ name: "B", email: "b@test.sn", password: "ancienmdp123" });
    await requestPasswordReset("b@test.sn", "https://baobab.test", "c3");
    const token = tokenFromMail();
    expect(await db.passwordResetToken.count({ where: { tokenHash: token } })).toBe(0);
    await expect(resetPassword(token, "court").then(() => "OK", (e) => e.name)).resolves.toBe("ZodError");
    await db.passwordResetToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(resetPassword(token, "nouveaumdp456").catch(code)).resolves.toBe("NOT_FOUND");
  });

  it("limite les demandes répétées", async () => {
    await registerUser({ name: "C", email: "c@test.sn", password: "ancienmdp123" });
    for (let i = 0; i < 3; i++) await requestPasswordReset("c@test.sn", "https://baobab.test", "c4");
    await expect(requestPasswordReset("c@test.sn", "https://baobab.test", "c4").catch(code)).resolves.toBe("RATE_LIMITED");
  });
});
