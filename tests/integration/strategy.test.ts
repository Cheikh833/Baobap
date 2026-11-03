import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import {
  activePlanSummary, createAxis, createObjective, createPlan, deleteAxis, deleteObjective, deletePlan, getPlan, getProjectContributions, unalignedProjects, updateObjective, updatePlan,
} from "@/server/services/strategy";
import { createProjectDraft, saveProjectStep } from "@/server/services/projects";
import { planCoverage } from "@/lib/strategy";
import { memberWithRole, ownerWithOrg, resetDb } from "./helpers";

const code = (e: unknown) => (e instanceof AppError ? e.code : String(e));
const expectCode = (p: Promise<unknown>, c: string) => expect(p.then(() => "OK", (e) => (e?.name === "ZodError" ? "ZOD" : code(e)))).resolves.toBe(c);

beforeEach(async () => { await resetDb(); await db.strategicPlan.deleteMany(); });
afterAll(() => db.$disconnect());

async function setup() {
  const a = await ownerWithOrg("A");
  const plan = await createPlan(a.ctx, { title: "Plan 2026–2030", status: "ACTIVE", startDate: "2026-01-01", endDate: "2030-12-31" });
  const axis = await createAxis(a.ctx, plan.id, { code: "A1", title: "Santé" });
  const o1 = await createObjective(a.ctx, { axisId: axis.id, code: "OS1", title: "Réduire la mortalité maternelle" });
  const o2 = await createObjective(a.ctx, { axisId: axis.id, code: "OS2", title: "Améliorer la nutrition" });
  return { a, plan, axis, o1, o2 };
}

describe("module Stratégie", () => {
  it("contributions pondérées, budget aligné sans double comptage, couverture", async () => {
    const { a, plan, o1, o2 } = await setup();
    const p1 = await createProjectDraft(a.ctx, { name: "Cliniques", code: "P1" });
    await saveProjectStep(a.ctx, p1.id, 7, { plannedBudget: "1000000", currency: "XOF" });
    await saveProjectStep(a.ctx, p1.id, 2, { priority: "HIGH", [`obj_${o1.id}`]: "on", [`weight_${o1.id}`]: "60", [`obj_${o2.id}`]: "on", [`weight_${o2.id}`]: "40" });
    const full = await getPlan(a.ctx, plan.id);
    const cov = planCoverage(full.axes.flatMap((x) => x.objectives));
    expect(cov.covered).toBe(2);
    expect(cov.rate).toBe(100);
    expect(cov.budget).toEqual({ XOF: 1000000 }); // 600 000 + 400 000 = budget du projet, jamais plus
    expect((await getProjectContributions(a.ctx, p1.id)).map((c) => c.weight).sort()).toEqual([40, 60]);
    // historisé
    expect(await db.auditLog.count({ where: { entityId: p1.id, action: "project.update" } })).toBeGreaterThan(0);
  });

  it("refuse une somme de parts > 100 % et un objectif d'une autre organisation", async () => {
    const { a, o1, o2 } = await setup();
    const b = await ownerWithOrg("B");
    const bp = await createPlan(b.ctx, { title: "Plan B" });
    const bx = await createAxis(b.ctx, bp.id, { code: "B1", title: "Axe B" });
    const bo = await createObjective(b.ctx, { axisId: bx.id, code: "OB1", title: "Objectif B" });
    const p = await createProjectDraft(a.ctx, { name: "P", code: "P1" });
    await expectCode(saveProjectStep(a.ctx, p.id, 2, { [`obj_${o1.id}`]: "on", [`weight_${o1.id}`]: "70", [`obj_${o2.id}`]: "on", [`weight_${o2.id}`]: "40" }), "ZOD");
    await expectCode(saveProjectStep(a.ctx, p.id, 2, { [`obj_${bo.id}`]: "on" }), "VALIDATION");
    await expectCode(getPlan(a.ctx, bp.id), "NOT_FOUND");
    await expectCode(createObjective(a.ctx, { axisId: bx.id, code: "XX", title: "Intrusion" }), "NOT_FOUND");
  });

  it("un seul plan actif ; codes uniques dans le plan ; déplacement d'objectif limité au même plan", async () => {
    const { a, plan, axis, o1 } = await setup();
    await expectCode(createPlan(a.ctx, { title: "Autre", status: "ACTIVE" }), "CONFLICT");
    const draft = await createPlan(a.ctx, { title: "Brouillon" });
    await expectCode(updatePlan(a.ctx, draft.id, { title: "Brouillon", status: "ACTIVE" }), "CONFLICT");
    await expectCode(createAxis(a.ctx, plan.id, { code: "a1", title: "Doublon" }), "CONFLICT");
    await expectCode(createObjective(a.ctx, { axisId: axis.id, code: "os1", title: "Doublon" }), "CONFLICT");
    const otherAxis = await createAxis(a.ctx, draft.id, { code: "Z1", title: "Autre plan" });
    await expectCode(updateObjective(a.ctx, o1.id, { axisId: otherAxis.id, code: "OS1", title: "x" }), "VALIDATION");
  });

  it("règles de suppression : objectif utilisé, axe non vide, plan actif", async () => {
    const { a, plan, axis, o1 } = await setup();
    const p = await createProjectDraft(a.ctx, { name: "P", code: "P1" });
    await saveProjectStep(a.ctx, p.id, 2, { [`obj_${o1.id}`]: "on" });
    await expectCode(deleteObjective(a.ctx, o1.id), "CONFLICT");
    await expectCode(deleteAxis(a.ctx, axis.id), "CONFLICT");
    await expectCode(deletePlan(a.ctx, plan.id), "CONFLICT");
  });

  it("projets non alignés et résumé du plan actif", async () => {
    const { a, plan, o1 } = await setup();
    const p1 = await createProjectDraft(a.ctx, { name: "Aligné", code: "P1" });
    await createProjectDraft(a.ctx, { name: "Non aligné", code: "P2" });
    await saveProjectStep(a.ctx, p1.id, 2, { [`obj_${o1.id}`]: "on" });
    expect((await unalignedProjects(a.ctx, plan.id)).map((p) => p.code)).toEqual(["P2"]);
    expect((await activePlanSummary(a.ctx))?.id).toBe(plan.id);
  });

  it("permissions : lecture pour l'équipe, écriture refusée ; bailleur en lecture", async () => {
    const { a, plan } = await setup();
    const tm = await memberWithRole(a.org.id, "TEAM_MEMBER");
    expect((await getPlan(tm.ctx, plan.id)).id).toBe(plan.id);
    await expectCode(createAxis(tm.ctx, plan.id, { code: "A9", title: "x" }), "FORBIDDEN");
    const donor = await memberWithRole(a.org.id, "DONOR_VIEWER");
    expect((await getPlan(donor.ctx, plan.id)).id).toBe(plan.id);
    const pm = await memberWithRole(a.org.id, "PORTFOLIO_MANAGER");
    await expectCode(createPlan(pm.ctx, { title: "x" }), "FORBIDDEN");
  });
});
