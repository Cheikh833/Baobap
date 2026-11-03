import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { loadTenantContext } from "@/server/tenant";
import { activateFromRequest, declareMobilePayment, expectedAmount, platformOverview, reviewMobilePayment } from "@/server/services/mobile-payments";
import { requestPlan } from "@/server/services/billing";
import { memberWithRole, ownerWithOrg, resetDb } from "./helpers";

const code = (e: unknown) => (e instanceof AppError ? e.code : String(e));
const admin = { id: "admin-id", email: "admin@baobab.sn" };
const declare = { plan: "ESSENTIEL", cycle: "MONTHLY", operator: "Wave", reference: "TX123456", senderPhone: "+221770000000" };

beforeEach(async () => {
  await resetDb();
  process.env.PAYMENT_MOBILE_NUMBER = "+221 77 000 00 00";
  process.env.PAYMENT_MOBILE_NAME = "Titulaire Test";
  process.env.PLATFORM_ADMIN_EMAILS = "admin@baobab.sn";
});
afterEach(() => { delete process.env.PAYMENT_MOBILE_NUMBER; delete process.env.PLATFORM_ADMIN_EMAILS; });
afterAll(() => db.$disconnect());

describe("paiement Mobile Money déclaré", () => {
  it("la déclaration n'active rien ; la confirmation de l'administrateur active l'abonnement", async () => {
    const a = await ownerWithOrg("A");
    await db.organization.update({ where: { id: a.org.id }, data: { trialEndsAt: new Date(Date.now() - 1000) } });
    const ctx = (await loadTenantContext(a.user.id, a.org.id))!;
    const p = await declareMobilePayment(ctx, declare);
    expect(p.amountXof).toBe(15000);
    expect((await loadTenantContext(a.user.id, a.org.id))!.readOnly).toBe(true);
    await expect(declareMobilePayment(ctx, declare).catch(code)).resolves.toBe("CONFLICT");
    expect((await platformOverview(admin)).payments).toHaveLength(1);
    await reviewMobilePayment(admin, p.id, true);
    const after = (await loadTenantContext(a.user.id, a.org.id))!;
    expect(after.readOnly).toBe(false);
    expect(after.plan).toBe("ESSENTIEL");
    await expect(reviewMobilePayment(admin, p.id, true).catch(code)).resolves.toBe("CONFLICT");
  });

  it("rejet : aucun changement d'abonnement", async () => {
    const a = await ownerWithOrg("A");
    const p = await declareMobilePayment(a.ctx, declare);
    await reviewMobilePayment(admin, p.id, false);
    expect((await db.payment.findUniqueOrThrow({ where: { id: p.id } })).status).toBe("REFUSED");
    expect((await db.organization.findUniqueOrThrow({ where: { id: a.org.id } })).subscriptionStatus).toBe("TRIALING");
  });

  it("seuls les administrateurs plateforme vérifient ; seuls billing:manage déclarent", async () => {
    const a = await ownerWithOrg("A");
    const p = await declareMobilePayment(a.ctx, declare);
    await expect(reviewMobilePayment({ id: a.user.id, email: a.user.email }, p.id, true).catch(code)).resolves.toBe("FORBIDDEN");
    await expect(platformOverview({ id: "x", email: "intrus@test.sn" }).catch(code)).resolves.toBe("FORBIDDEN");
    const pm = await memberWithRole(a.org.id, "PROJECT_MANAGER");
    await expect(declareMobilePayment(pm.ctx, declare).catch(code)).resolves.toBe("FORBIDDEN");
  });

  it("non configuré → refus clair ; identifiant de transaction obligatoire", async () => {
    const a = await ownerWithOrg("A");
    await expect(declareMobilePayment(a.ctx, { ...declare, reference: "" }).then(() => "OK", (e) => e.name)).resolves.toBe("ZodError");
    delete process.env.PAYMENT_MOBILE_NUMBER;
    await expect(declareMobilePayment(a.ctx, declare).catch(code)).resolves.toBe("CONFLICT");
  });

  it("tarif solidaire −30 % arrondi au multiple de 5 ; activation depuis une demande", async () => {
    expect(expectedAmount("PROFESSIONNEL", "MONTHLY", true)).toBe(34300);
    expect(expectedAmount("PROFESSIONNEL", "YEARLY", true) % 5).toBe(0);
    const a = await ownerWithOrg("A");
    const r = await requestPlan(a.ctx, { plan: "INSTITUTION", cycle: "YEARLY" });
    await activateFromRequest(admin, r.id);
    expect((await db.organization.findUniqueOrThrow({ where: { id: a.org.id } })).plan).toBe("INSTITUTION");
  });
});
