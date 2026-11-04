import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { createDemoOrganization, hasDemo } from "@/server/services/demo";
import { loadTenantContext } from "@/server/tenant";
import { listProjects } from "@/server/services/projects";
import { activePlanSummary } from "@/server/services/strategy";
import { planCoverage } from "@/lib/strategy";
import { ownerWithOrg, resetDb } from "./helpers";

beforeEach(async () => { await resetDb(); await db.strategicPlan.deleteMany(); });
afterAll(() => db.$disconnect());

describe("espace de démonstration", () => {
  it("crée une organisation fictive complète, une seule fois par utilisateur, séparée de la vraie", async () => {
    const a = await ownerWithOrg("A");
    expect(await hasDemo(a.user.id)).toBe(false);
    const demo = await createDemoOrganization(a.user.id);
    const again = await createDemoOrganization(a.user.id);
    expect(again.id).toBe(demo.id);
    const org = await db.organization.findUniqueOrThrow({ where: { id: demo.id } });
    expect(org.isDemo).toBe(true);
    expect(org.name).toMatch(/\[DÉMO\].*fictif/);
    const ctx = (await loadTenantContext(a.user.id, demo.id))!;
    expect(ctx.roleKey).toBe("ORG_OWNER");
    expect((await listProjects(ctx)).length).toBe(5);
    const plan = await activePlanSummary(ctx);
    expect(planCoverage(plan!.axes.flatMap((x) => x.objectives)).covered).toBe(3);
    // la vraie organisation reste vide
    expect(await listProjects(a.ctx)).toHaveLength(0);
  });
});

import { getPlanning } from "@/server/services/planning";
describe("démo : planification", () => {
  it("le projet PRJ-001 de la démo a un planning complet", async () => {
    const a = await ownerWithOrg("Z");
    const demo = await createDemoOrganization(a.user.id);
    const ctx = (await loadTenantContext(a.user.id, demo.id))!;
    const p1 = (await listProjects(ctx)).find((p) => p.code === "PRJ-001")!;
    const pl = await getPlanning(ctx, p1.id);
    expect(pl.phases).toHaveLength(2);
    expect(pl.activities).toHaveLength(5);
    expect(pl.tasks.length).toBeGreaterThanOrEqual(5);
    expect(pl.milestones).toHaveLength(3);
    expect(pl.dependencies).toHaveLength(2);
  });
});
