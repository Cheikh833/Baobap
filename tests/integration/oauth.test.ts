import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { authenticate, registerUser, signInWithOAuth } from "@/server/services/auth";
import { resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

describe("connexion Google / Apple", () => {
  it("première fois : crée le compte ; ensuite : connecte le même compte, sans nouvelle inscription", async () => {
    const first = await signInWithOAuth("google", { sub: "g-1", email: "Awa@Example.org", email_verified: true, name: "Awa Diop" });
    expect(first.created).toBe(true);
    expect(first.user).toMatchObject({ email: "awa@example.org", name: "Awa Diop", passwordHash: null });
    expect(first.user.termsAcceptedAt).not.toBeNull();
    const again = await signInWithOAuth("google", { sub: "g-1", email: "awa@example.org", email_verified: true });
    expect(again).toMatchObject({ created: false, user: { id: first.user.id } });
    expect(await db.user.count()).toBe(1);
    // compte sans mot de passe : la connexion par mot de passe échoue proprement
    await expect(authenticate({ email: "awa@example.org", password: "nimportequoi1" }, "t")).rejects.toThrow("Email ou mot de passe incorrect.");
  });

  it("rattache Google ou Apple à un compte existant ayant le même email vérifié", async () => {
    const u = await registerUser({ name: "Moussa", email: "moussa@example.org", password: "motdepasse123" });
    const g = await signInWithOAuth("google", { sub: "g-2", email: "moussa@example.org", email_verified: true });
    const a = await signInWithOAuth("apple", { sub: "a-2", email: "moussa@example.org", email_verified: "true" });
    expect([g.user.id, a.user.id]).toEqual([u.id, u.id]);
    expect(await db.oAuthAccount.count({ where: { userId: u.id } })).toBe(2);
    expect((await authenticate({ email: "moussa@example.org", password: "motdepasse123" }, "t")).id).toBe(u.id);
  });

  it("refuse un email non vérifié ; reprend le nom transmis par Apple", async () => {
    await expect(signInWithOAuth("google", { sub: "g-3", email: "x@example.org", email_verified: false })).rejects.toThrow(/vérifiée/);
    expect(await db.user.count()).toBe(0);
    const r = await signInWithOAuth("apple", { sub: "a-4", email: "abc@privaterelay.appleid.com", email_verified: "true" }, "Fatou Sall");
    expect(r.user.name).toBe("Fatou Sall");
  });
});
