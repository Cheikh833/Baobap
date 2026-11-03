import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { loadTenantContext } from "@/server/tenant";
import { createPortfolio, getPortfolio, listPortfolios } from "@/server/services/portfolios";
import { createProgram, updateProgram } from "@/server/services/programs";
import { changeProjectStatus, createProjectDraft, deleteProject, getProject, listProjects, saveProjectStep } from "@/server/services/projects";
import { listMembers } from "@/server/services/members";
import { getDashboard } from "@/server/services/dashboard";
import { memberWithRole, ownerWithOrg, resetDb } from "./helpers";

const code = (e: unknown) => (e instanceof AppError ? e.code : String(e));
async function expectCode(p: Promise<unknown>, c: string) {
  await expect(p.then(() => "OK", code)).resolves.toBe(c);
}

beforeEach(resetDb);
afterAll(() => db.$disconnect());

describe("multi-tenancy", () => {
  it("une organisation ne voit jamais les données d'une autre", async () => {
    const a = await ownerWithOrg("A");
    const b = await ownerWithOrg("B");
    const pa = await createPortfolio(a.ctx, { name: "PF A", code: "PFA" });
    const proj = await createProjectDraft(a.ctx, { name: "Projet A", code: "PA1" });

    expect(await listPortfolios(b.ctx)).toHaveLength(0);
    expect(await listProjects(b.ctx)).toHaveLength(0);
    await expectCode(getPortfolio(b.ctx, pa.id), "NOT_FOUND");
    await expectCode(getProject(b.ctx, proj.id), "NOT_FOUND");
    await expectCode(saveProjectStep(b.ctx, proj.id, 3, { context: "piratage" }), "NOT_FOUND");
    await expectCode(deleteProject(b.ctx, proj.id), "NOT_FOUND");
    expect((await getProject(a.ctx, proj.id)).context).toBeNull();
  });

  it("refuse les références vers une autre organisation", async () => {
    const a = await ownerWithOrg("A");
    const b = await ownerWithOrg("B");
    const pfB = await createPortfolio(b.ctx, { name: "PF B", code: "PFB" });
    await expectCode(createProgram(a.ctx, { name: "Prog", code: "PG", portfolioId: pfB.id }), "VALIDATION");
    await expectCode(createProjectDraft(a.ctx, { name: "X", code: "X1", portfolioId: pfB.id }), "VALIDATION");
    await expectCode(createPortfolio(a.ctx, { name: "PF", code: "PF", managerId: b.user.id }), "VALIDATION");
  });

  it("un non-membre n'obtient aucun contexte ; un membre suspendu non plus", async () => {
    const a = await ownerWithOrg("A");
    const b = await ownerWithOrg("B");
    expect(await loadTenantContext(b.user.id, a.org.id)).toBeNull();
    const m = await memberWithRole(a.org.id, "VIEWER");
    await db.membership.updateMany({ where: { userId: m.user.id }, data: { status: "SUSPENDED" } });
    expect(await loadTenantContext(m.user.id, a.org.id)).toBeNull();
  });

  it("les codes sont uniques par organisation, pas globalement", async () => {
    const a = await ownerWithOrg("A");
    const b = await ownerWithOrg("B");
    await createPortfolio(a.ctx, { name: "PF", code: "SAME" });
    await createPortfolio(b.ctx, { name: "PF", code: "SAME" });
    await expectCode(createPortfolio(a.ctx, { name: "PF2", code: "same" }), "CONFLICT");
  });
});

describe("RBAC côté serveur", () => {
  it("un lecteur ne peut rien créer ni modifier", async () => {
    const a = await ownerWithOrg("A");
    const proj = await createProjectDraft(a.ctx, { name: "P", code: "P1" });
    const v = await memberWithRole(a.org.id, "VIEWER");
    await expectCode(createPortfolio(v.ctx, { name: "X", code: "X1" }), "FORBIDDEN");
    await expectCode(createProjectDraft(v.ctx, { name: "X", code: "X2" }), "FORBIDDEN");
    await expectCode(saveProjectStep(v.ctx, proj.id, 3, { context: "x" }), "FORBIDDEN");
    expect(await listProjects(v.ctx)).toHaveLength(1);
  });

  it("un bailleur (lecture) ne voit pas les membres", async () => {
    const a = await ownerWithOrg("A");
    const d = await memberWithRole(a.org.id, "DONOR_VIEWER");
    await expectCode(listMembers(d.ctx), "FORBIDDEN");
    expect((await getDashboard(d.ctx)).members).toBeNull();
  });

  it("un chef de projet crée un projet mais ne peut pas l'activer sans permission de validation", async () => {
    const a = await ownerWithOrg("A");
    const pm = await memberWithRole(a.org.id, "PROJECT_MANAGER");
    const p = await createProjectDraft(pm.ctx, { name: "P", code: "P1" });
    await saveProjectStep(pm.ctx, p.id, 6, { startDate: "2026-01-01", endDate: "2026-12-31" });
    await expectCode(changeProjectStatus(pm.ctx, p.id, "ACTIVE"), "FORBIDDEN");
    await changeProjectStatus(a.ctx, p.id, "ACTIVE");
    expect((await getProject(a.ctx, p.id)).status).toBe("ACTIVE");
  });
});

describe("règles métier projets", () => {
  it("une étape ne modifie que ses propres champs et est historisée", async () => {
    const a = await ownerWithOrg("A");
    const p = await createProjectDraft(a.ctx, { name: "P", code: "P1", shortDescription: "desc" });
    await saveProjectStep(a.ctx, p.id, 3, { context: "Contexte" });
    const after = await getProject(a.ctx, p.id);
    expect(after.shortDescription).toBe("desc");
    expect(after.context).toBe("Contexte");
    expect(after.wizardStep).toBe(4);
    const logs = await db.auditLog.findMany({ where: { entityId: p.id } });
    expect(logs.map((l) => l.action).sort()).toEqual(["project.create", "project.update"]);
  });

  it("le projet hérite du portefeuille de son programme ; incohérence refusée", async () => {
    const a = await ownerWithOrg("A");
    const pf1 = await createPortfolio(a.ctx, { name: "PF1", code: "PF1" });
    const pf2 = await createPortfolio(a.ctx, { name: "PF2", code: "PF2" });
    const prog = await createProgram(a.ctx, { name: "Prog", code: "PG", portfolioId: pf1.id });
    const p = await createProjectDraft(a.ctx, { name: "P", code: "P1", programId: prog.id });
    expect(p.portfolioId).toBe(pf1.id);
    await expectCode(createProjectDraft(a.ctx, { name: "Q", code: "Q1", programId: prog.id, portfolioId: pf2.id }), "VALIDATION");
    // Déplacer le programme déplace ses projets (cohérence de la hiérarchie)
    await updateProgram(a.ctx, prog.id, { name: "Prog", code: "PG", portfolioId: pf2.id });
    expect((await getProject(a.ctx, p.id)).portfolioId).toBe(pf2.id);
  });

  it("transitions de statut contrôlées et activation exigeant des dates", async () => {
    const a = await ownerWithOrg("A");
    const p = await createProjectDraft(a.ctx, { name: "P", code: "P1" });
    await expectCode(changeProjectStatus(a.ctx, p.id, "CLOSED"), "VALIDATION");
    await expectCode(changeProjectStatus(a.ctx, p.id, "ACTIVE"), "VALIDATION");
  });

  it("suppression logique : le projet disparaît mais reste en base", async () => {
    const a = await ownerWithOrg("A");
    const p = await createProjectDraft(a.ctx, { name: "P", code: "P1" });
    await deleteProject(a.ctx, p.id);
    expect(await listProjects(a.ctx)).toHaveLength(0);
    expect((await db.project.findUnique({ where: { id: p.id } }))?.deletedAt).not.toBeNull();
  });

  it("le tableau de bord ne compte que des données réelles", async () => {
    const a = await ownerWithOrg("A");
    const empty = await getDashboard(a.ctx);
    expect(empty.projects?.total).toBe(0);
    expect(empty.projects?.timeProgress.value).toBeNull();
    const p = await createProjectDraft(a.ctx, { name: "P", code: "P1" });
    await saveProjectStep(a.ctx, p.id, 7, { plannedBudget: "1000", currency: "XOF" });
    const d = await getDashboard(a.ctx);
    expect(d.projects?.budget.totals).toEqual({ XOF: 1000 });
    expect(d.projects?.drafts).toHaveLength(1);
  });
});
