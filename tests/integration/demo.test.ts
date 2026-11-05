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

import { getLogframe, mealOverview } from "@/server/services/meal";
describe("démo : suivi-évaluation", () => {
  it("PRJ-001 a un cadre logique cohérent et des indicateurs calculés", async () => {
    const a = await ownerWithOrg("Y");
    const now = new Date("2026-11-04T12:00:00Z");
    const demo = await createDemoOrganization(a.user.id, now);
    const ctx = (await loadTenantContext(a.user.id, demo.id))!;
    const p1 = (await listProjects(ctx)).find((p) => p.code === "PRJ-001")!;
    const lf = await getLogframe(ctx, p1.id);
    expect(lf.items).toHaveLength(9);
    expect(lf.checks).toEqual([]);
    expect(lf.indicators).toHaveLength(6);
    const ind1 = lf.indicators.find((i) => i.code === "IND-1")!;
    // 7 trimestres écoulés : 6 validés, le dernier (64 %) en attente → valeur actuelle 61
    expect(ind1.calc.current).toBe(61);
    expect(ind1.calc.pending).toBe(1);
    expect(ind1.calc.rate).toBe(60.4);
    const { pending, rows } = await mealOverview(ctx, now);
    expect(pending.length).toBe(1);
    const st = Object.fromEntries(rows.map((r) => [r.code, r.calc.status]));
    expect(st).toMatchObject({ "IND-2": "good", "IND-3": "critical", "IND-4": "good" });
  });
});

import { demoSurvey } from "@/server/services/demo";
import { getDataset, listDatasets } from "@/server/services/analytics";
import { column, crosstab, groupMeans } from "@/lib/analysis/stats";
describe("démo : analyse de données", () => {
  it("l'enquête fictive est importée et montre des associations interprétables", async () => {
    const a = await ownerWithOrg("X");
    const demo = await createDemoOrganization(a.user.id);
    const ctx = (await loadTenantContext(a.user.id, demo.id))!;
    const [ds] = await listDatasets(ctx);
    const d = await getDataset(ctx, ds.id);
    expect(d.rowCount).toBe(240);
    expect(d.columns.find((c) => c.name === "distance_km")!.type).toBe("number");
    expect(d.columns.find((c) => c.name === "milieu")!.type).toBe("categorical");
    const s = demoSurvey();
    const t = crosstab(column(s.rows, 2), column(s.rows, 6));
    expect(!t.tooMany && t.conditionsMet && t.p! < 0.05).toBe(true);
    const g = groupMeans(column(s.rows, 5), column(s.rows, 1));
    expect(!g.tooMany && g.p! < 0.05).toBe(true);
  });
});

import { getProjectFinance } from "@/server/services/finance";
import { listProjectRisks } from "@/server/services/risks";
import { risksHealth } from "@/lib/risk";
describe("démo : finances et risques", () => {
  it("PRJ-001 a un budget cohérent (aucun dépassement) et un registre des risques", async () => {
    const a = await ownerWithOrg("W");
    const demo = await createDemoOrganization(a.user.id);
    const ctx = (await loadTenantContext(a.user.id, demo.id))!;
    const p1 = (await listProjects(ctx)).find((p) => p.code === "PRJ-001")!;
    const f = await getProjectFinance(ctx, p1.id);
    expect(f.totals).toMatchObject({ planned: 150_000_000, spent: 106_000_000, pending: 2_300_000, funded: 130_000_000, fundingGap: 20_000_000, overspentLines: 0 });
    expect(f.expenses.every((e) => e.date.getTime() < Date.now())).toBe(true);
    const r = await listProjectRisks(ctx, p1.id);
    expect(r).toHaveLength(5);
    expect(risksHealth(r)).toMatchObject({ level: "critical", open: 4, overdue: 1 });
  });
});
