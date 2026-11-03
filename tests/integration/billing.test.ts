import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { loadTenantContext } from "@/server/tenant";
import { activateSubscription, requestPlan, usage } from "@/server/services/billing";
import { inviteMember } from "@/server/services/members";
import { createProjectDraft, listProjects, saveProjectStep } from "@/server/services/projects";
import { createPortfolio } from "@/server/services/portfolios";
import { createProgram } from "@/server/services/programs";
import { ownerWithOrg, resetDb } from "./helpers";

const code = (e: unknown) => (e instanceof AppError ? e.code : String(e));
const expectCode = (p: Promise<unknown>, c: string) => expect(p.then(() => "OK", code)).resolves.toBe(c);
const roleId = (orgId: string, key: string) => db.role.findUniqueOrThrow({ where: { organizationId_key: { organizationId: orgId, key } } }).then((r) => r.id);

beforeEach(resetDb);
afterAll(() => db.$disconnect());

describe("essai gratuit et lecture seule", () => {
  it("une nouvelle organisation démarre en essai Professionnel de 30 jours", async () => {
    const a = await ownerWithOrg("A");
    const org = await db.organization.findUniqueOrThrow({ where: { id: a.org.id } });
    expect(org.plan).toBe("PROFESSIONNEL");
    expect(org.subscriptionStatus).toBe("TRIALING");
    expect(a.ctx.subscription.phase).toBe("trial");
    expect(a.ctx.subscription.daysLeft).toBe(30);
  });

  it("essai expiré : consultation possible, écriture refusée, demande d'abonnement possible, données conservées", async () => {
    const a = await ownerWithOrg("A");
    await createProjectDraft(a.ctx, { name: "P", code: "P1" });
    await db.organization.update({ where: { id: a.org.id }, data: { trialEndsAt: new Date(Date.now() - 1000) } });
    const ctx = (await loadTenantContext(a.user.id, a.org.id))!;
    expect(ctx.readOnly).toBe(true);
    expect(await listProjects(ctx)).toHaveLength(1);
    await expectCode(createProjectDraft(ctx, { name: "Q", code: "Q1" }), "FORBIDDEN");
    await expectCode(createPortfolio(ctx, { name: "PF", code: "PF" }), "FORBIDDEN");
    await requestPlan(ctx, { plan: "ESSENTIEL", cycle: "YEARLY", contactPhone: "+221 77 000 00 00" });
    await expectCode(requestPlan(ctx, { plan: "ESSENTIEL", cycle: "YEARLY" }), "CONFLICT");
  });

  it("l'activation après paiement rétablit l'écriture et clôt la demande", async () => {
    const a = await ownerWithOrg("A");
    await db.organization.update({ where: { id: a.org.id }, data: { trialEndsAt: new Date(Date.now() - 1000) } });
    await requestPlan((await loadTenantContext(a.user.id, a.org.id))!, { plan: "ESSENTIEL", cycle: "MONTHLY" });
    await activateSubscription(a.org.id, "ESSENTIEL", "MONTHLY");
    const ctx = (await loadTenantContext(a.user.id, a.org.id))!;
    expect(ctx.readOnly).toBe(false);
    expect(ctx.plan).toBe("ESSENTIEL");
    expect((await db.planRequest.findFirstOrThrow()).status).toBe("DONE");
    expect(await db.auditLog.count({ where: { action: "billing.activate" } })).toBe(1);
  });

  it("un membre sans billing:manage ne peut pas demander d'abonnement", async () => {
    const a = await ownerWithOrg("A");
    const { memberWithRole } = await import("./helpers");
    const pm = await memberWithRole(a.org.id, "PROJECT_MANAGER");
    await expectCode(requestPlan(pm.ctx, { plan: "INSTITUTION" }), "FORBIDDEN");
  });
});

describe("limites du plan", () => {
  it("Essentiel : 5 membres facturables max, invitations comprises ; bailleurs illimités", async () => {
    const a = await ownerWithOrg("A");
    await activateSubscription(a.org.id, "ESSENTIEL", "MONTHLY");
    const ctx = (await loadTenantContext(a.user.id, a.org.id))!;
    const team = await roleId(a.org.id, "TEAM_MEMBER");
    for (let i = 1; i <= 4; i++) await inviteMember(ctx, { email: `m${i}@test.sn`, roleId: team });
    expect((await usage(db, a.org.id)).members).toBe(5);
    await expectCode(inviteMember(ctx, { email: "m5@test.sn", roleId: team }), "CONFLICT");
    await inviteMember(ctx, { email: "bailleur@test.sn", roleId: await roleId(a.org.id, "DONOR_VIEWER") });
  });

  it("Essentiel : 10 projets non archivés max", async () => {
    const a = await ownerWithOrg("A");
    await activateSubscription(a.org.id, "ESSENTIEL", "MONTHLY");
    const ctx = (await loadTenantContext(a.user.id, a.org.id))!;
    for (let i = 1; i <= 10; i++) await createProjectDraft(ctx, { name: `Projet ${i}`, code: `P${i}` });
    await expectCode(createProjectDraft(ctx, { name: "Projet 11", code: "P11" }), "CONFLICT");
  }, 30_000);
});

describe("projets distincts par programme", () => {
  it("même nom refusé dans un même programme, accepté dans un autre programme (code différent)", async () => {
    const a = await ownerWithOrg("A");
    const g1 = await createProgram(a.ctx, { name: "Santé", code: "PG1" });
    const g2 = await createProgram(a.ctx, { name: "Éducation", code: "PG2" });
    await createProjectDraft(a.ctx, { name: "Cantines scolaires", code: "C1", programId: g1.id });
    await expectCode(createProjectDraft(a.ctx, { name: "cantines SCOLAIRES", code: "C2", programId: g1.id }), "CONFLICT");
    const other = await createProjectDraft(a.ctx, { name: "Cantines scolaires", code: "C3", programId: g2.id });
    // Déplacer ce projet dans le premier programme crée un doublon : refusé.
    await expectCode(saveProjectStep(a.ctx, other.id, 1, { name: "Cantines scolaires", code: "C3", programId: g1.id }), "CONFLICT");
  });
});
