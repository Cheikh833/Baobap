import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { loadTenantContext } from "@/server/tenant";
import { confirmPayment, startOnlinePayment } from "@/server/services/payments";
import { notificationToken, verifyNotificationToken, initPayment } from "@/server/payments/cinetpay";
import { memberWithRole, ownerWithOrg, resetDb } from "./helpers";

const cfg = { apiKey: "test-key", siteId: "123456", secretKey: "secret" };
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
const opts = { baseUrl: "https://baobab.test", lang: "fr" as const };
const code = (e: unknown) => (e instanceof AppError ? e.code : String(e));

/** Faux CinetPay : enregistre les appels et répond selon le scénario. */
function fakeCinetPay(check: { code: string; status?: string; amount?: number; currency?: string }) {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const f = (async (url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    calls.push({ url, body });
    if (url.endsWith("/payment")) return json({ code: "201", message: "CREATED", data: { payment_url: `https://checkout.cinetpay.com/payment/${body.transaction_id}`, payment_token: "tok" } });
    return json({ code: check.code, data: { status: check.status, amount: String(check.amount), currency: check.currency ?? "XOF", payment_method: "WAVESN" } });
  }) as unknown as typeof fetch;
  return { f, calls };
}

beforeEach(resetDb);
afterAll(() => db.$disconnect());

describe("paiement en ligne CinetPay", () => {
  it("initialise la transaction avec le bon montant et les URL de notification et de retour", async () => {
    const a = await ownerWithOrg("A");
    const cp = fakeCinetPay({ code: "00", status: "ACCEPTED", amount: 490000 });
    const r = await startOnlinePayment(a.ctx, { plan: "PROFESSIONNEL", cycle: "YEARLY" }, opts, { config: cfg, fetch: cp.f });
    expect(r.paymentUrl).toContain("checkout.cinetpay.com");
    const sent = cp.calls[0].body;
    expect(sent.amount).toBe(490000);
    expect(sent.currency).toBe("XOF");
    expect(sent.notify_url).toBe("https://baobab.test/api/payments/cinetpay/notify");
    expect(String(sent.return_url)).toContain("/organization/billing?payment=");
    expect(String(sent.transaction_id)).toMatch(/^[A-Z0-9]+$/);
  });

  it("paiement accepté → abonnement activé une seule fois (appels concurrents)", async () => {
    const a = await ownerWithOrg("A");
    await db.organization.update({ where: { id: a.org.id }, data: { trialEndsAt: new Date(Date.now() - 1000) } });
    const ctx = (await loadTenantContext(a.user.id, a.org.id))!;
    expect(ctx.readOnly).toBe(true);
    const cp = fakeCinetPay({ code: "00", status: "ACCEPTED", amount: 15000 });
    await startOnlinePayment(ctx, { plan: "ESSENTIEL", cycle: "MONTHLY" }, opts, { config: cfg, fetch: cp.f });
    const p = await db.payment.findFirstOrThrow();
    const results = await Promise.all([confirmPayment(p.transactionId, { config: cfg, fetch: cp.f }), confirmPayment(p.transactionId, { config: cfg, fetch: cp.f })]);
    expect(results).toEqual(["ACCEPTED", "ACCEPTED"]);
    expect(await db.auditLog.count({ where: { action: "billing.activate" } })).toBe(1);
    const after = (await loadTenantContext(a.user.id, a.org.id))!;
    expect(after.readOnly).toBe(false);
    expect(after.plan).toBe("ESSENTIEL");
  });

  it("montant différent → refusé et signalé, aucune activation", async () => {
    const a = await ownerWithOrg("A");
    const cp = fakeCinetPay({ code: "00", status: "ACCEPTED", amount: 100 });
    await startOnlinePayment(a.ctx, { plan: "ESSENTIEL", cycle: "MONTHLY" }, opts, { config: cfg, fetch: cp.f });
    const p = await db.payment.findFirstOrThrow();
    expect(await confirmPayment(p.transactionId, { config: cfg, fetch: cp.f })).toBe("REFUSED");
    expect(await db.auditLog.count({ where: { action: "payment.anomaly" } })).toBe(1);
    expect((await db.organization.findUniqueOrThrow({ where: { id: a.org.id } })).subscriptionStatus).toBe("TRIALING");
  });

  it("en attente → rien ne change ; refusé → statut REFUSED", async () => {
    const a = await ownerWithOrg("A");
    const pending = fakeCinetPay({ code: "662", status: "WAITING_CUSTOMER_PAYMENT", amount: 15000 });
    await startOnlinePayment(a.ctx, { plan: "ESSENTIEL", cycle: "MONTHLY" }, opts, { config: cfg, fetch: pending.f });
    const p = await db.payment.findFirstOrThrow();
    expect(await confirmPayment(p.transactionId, { config: cfg, fetch: pending.f })).toBe("PENDING");
    const refused = fakeCinetPay({ code: "600", status: "REFUSED", amount: 15000 });
    expect(await confirmPayment(p.transactionId, { config: cfg, fetch: refused.f })).toBe("REFUSED");
  });

  it("renouvellement anticipé : la période s'ajoute à la fin de la période en cours", async () => {
    const a = await ownerWithOrg("A");
    const end = new Date(Date.now() + 10 * 86_400_000);
    await db.organization.update({ where: { id: a.org.id }, data: { subscriptionStatus: "ACTIVE", plan: "ESSENTIEL", currentPeriodEnd: end } });
    const cp = fakeCinetPay({ code: "00", status: "ACCEPTED", amount: 150000 });
    await startOnlinePayment(a.ctx, { plan: "ESSENTIEL", cycle: "YEARLY" }, opts, { config: cfg, fetch: cp.f });
    await confirmPayment((await db.payment.findFirstOrThrow()).transactionId, { config: cfg, fetch: cp.f });
    const org = await db.organization.findUniqueOrThrow({ where: { id: a.org.id } });
    const expected = new Date(end); expected.setFullYear(expected.getFullYear() + 1);
    expect(org.currentPeriodEnd?.toISOString()).toBe(expected.toISOString());
  });

  it("refus si non configuré, si plan sur devis, ou sans billing:manage", async () => {
    const a = await ownerWithOrg("A");
    await expect(startOnlinePayment(a.ctx, { plan: "ESSENTIEL" }, opts, { config: null }).catch(code)).resolves.toBe("CONFLICT");
    await expect(startOnlinePayment(a.ctx, { plan: "ENTREPRISE" }, opts, { config: cfg }).then(() => "OK", (e) => e.name)).resolves.toBe("ZodError");
    const pm = await memberWithRole(a.org.id, "PROJECT_MANAGER");
    await expect(startOnlinePayment(pm.ctx, { plan: "ESSENTIEL" }, opts, { config: cfg }).catch(code)).resolves.toBe("FORBIDDEN");
  });

  it("prestataire indisponible → paiement annulé, message clair", async () => {
    const a = await ownerWithOrg("A");
    const down = (async () => json({ code: "608", message: "MINIMUM_REQUIRED_FIELDS" })) as unknown as typeof fetch;
    await expect(startOnlinePayment(a.ctx, { plan: "ESSENTIEL" }, opts, { config: cfg, fetch: down }).catch(code)).resolves.toBe("CONFLICT");
    expect((await db.payment.findFirstOrThrow()).status).toBe("CANCELED");
  });
});

describe("signature des notifications", () => {
  it("vérifie le jeton HMAC x-token et rejette une falsification", () => {
    const fields = { cpm_site_id: "123456", cpm_trans_id: "BAO1", cpm_trans_date: "2026-11-03 10:00:00", cpm_amount: "15000", cpm_currency: "XOF", signature: "sig", payment_method: "OMSN" };
    const token = notificationToken(fields, "secret");
    expect(verifyNotificationToken(fields, token, "secret")).toBe(true);
    expect(verifyNotificationToken({ ...fields, cpm_amount: "15" }, token, "secret")).toBe(false);
    expect(verifyNotificationToken(fields, null, "secret")).toBe(false);
  });
  it("refuse un montant XOF non multiple de 5", async () => {
    await expect(initPayment(cfg, { transactionId: "X", amount: 1001, description: "d", notifyUrl: "u", returnUrl: "u", lang: "fr", customer: { name: "A B", email: "a@b.sn" } })).rejects.toThrow(/multiple de 5/);
  });
});
