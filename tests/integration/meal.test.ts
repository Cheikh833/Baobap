import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import {
  addValue, correctValue, createIndicator, createLogframeItem, deleteIndicator, deleteLogframeItem, getIndicator, getLogframe, mealOverview, reviewValue,
} from "@/server/services/meal";
import { createProjectDraft } from "@/server/services/projects";
import { memberWithRole, ownerWithOrg, resetDb } from "./helpers";

const code = (e: unknown) => (e instanceof AppError ? e.code : e && typeof e === "object" && "name" in e && e.name === "ZodError" ? "ZOD" : String(e));
const expectCode = (p: Promise<unknown>, c: string) => expect(p.then(() => "OK", code)).resolves.toBe(c);

beforeEach(resetDb);
afterAll(() => db.$disconnect());

async function setup() {
  const a = await ownerWithOrg("A");
  const p = await createProjectDraft(a.ctx, { name: "Projet", code: "P1" });
  const impact = await createLogframeItem(a.ctx, p.id, { level: "IMPACT", code: "IMP", title: "Santé maternelle améliorée" });
  const oc = await createLogframeItem(a.ctx, p.id, { level: "OUTCOME", code: "OC1", title: "Accès accru aux soins", parentId: impact.id });
  const ind = await createIndicator(a.ctx, p.id, {
    code: "IND1", name: "Femmes ayant 4 consultations", definition: "Nombre de femmes ayant réalisé au moins 4 CPN", unit: "femmes",
    logframeItemId: oc.id, baseline: "100", target: "500", baselineDate: "2026-01-01", targetDate: "2026-12-31", source: "Registres", disaggregations: "Sexe : Femmes, Hommes\nZone : Urbaine, Rurale",
  });
  return { a, p, impact, oc, ind };
}
const val = (end: string, value: string, extra: Record<string, unknown> = {}) => ({ periodStart: end.slice(0, 8) + "01", periodEnd: end, value, source: "Registres", ...extra });

describe("suivi-évaluation", () => {
  it("cadre logique : niveaux hiérarchiques et contrôles de cohérence", async () => {
    const { a, p, impact } = await setup();
    await expectCode(createLogframeItem(a.ctx, p.id, { level: "OUTPUT", code: "X1", title: "Mauvais parent", parentId: impact.id }), "VALIDATION");
    await expectCode(createLogframeItem(a.ctx, p.id, { level: "OUTCOME", code: "oc1", title: "Doublon" }), "CONFLICT");
    const lf = await getLogframe(a.ctx, p.id);
    expect(lf.checks.some((c) => c.code === "IMP" && c.kind === "noIndicator")).toBe(true);
    expect(lf.checks.some((c) => c.code === "OC1" && c.kind === "noChild")).toBe(true);
    await expectCode(deleteLogframeItem(a.ctx, impact.id), "CONFLICT");
  });

  it("indicateur : définition et unité obligatoires, cible cohérente avec le sens", async () => {
    const { a, p } = await setup();
    await expectCode(createIndicator(a.ctx, p.id, { code: "X", name: "Sans définition", unit: "%" }), "ZOD");
    await expectCode(createIndicator(a.ctx, p.id, { code: "X2", name: "Incohérent", definition: "d", unit: "%", baseline: "50", target: "10", direction: "INCREASE" }), "ZOD");
    await createIndicator(a.ctx, p.id, { code: "X3", name: "Mortalité", definition: "d", unit: "‰", baseline: "50", target: "10", direction: "DECREASE" });
  });

  it("valeurs : brouillon → validation par une autre personne → taux d'atteinte", async () => {
    const { a, ind } = await setup();
    const meal = await memberWithRole(a.org.id, "MEAL_MANAGER");
    const tm = await memberWithRole(a.org.id, "TEAM_MEMBER");
    const v1 = await addValue(tm.ctx, ind.id, val("2026-06-30", "300"));
    expect((await getIndicator(a.ctx, ind.id)).calc.current).toBeNull(); // brouillon non compté
    await expectCode(reviewValue(tm.ctx, v1.id, true), "FORBIDDEN"); // pas de droit de validation
    const v2 = await addValue(meal.ctx, ind.id, val("2026-03-31", "200"));
    await expectCode(reviewValue(meal.ctx, v2.id, true), "FORBIDDEN"); // séparation des tâches
    await reviewValue(meal.ctx, v1.id, true);
    await reviewValue(a.ctx, v2.id, true); // le propriétaire peut valider
    const i = await getIndicator(a.ctx, ind.id);
    expect(i.calc.current).toBe(300);
    expect(i.calc.rate).toBe(50);
    await expectCode(addValue(tm.ctx, ind.id, val("2026-06-30", "310")), "CONFLICT"); // période déjà validée
  });

  it("une valeur validée n'est jamais modifiée : correction tracée", async () => {
    const { a, ind } = await setup();
    const meal = await memberWithRole(a.org.id, "MEAL_MANAGER");
    const v = await addValue(meal.ctx, ind.id, val("2026-06-30", "300"));
    await reviewValue(a.ctx, v.id, true);
    const c = await correctValue(meal.ctx, v.id, val("2026-06-30", "320"));
    expect((await getIndicator(a.ctx, ind.id)).calc.current).toBe(300);
    await reviewValue(a.ctx, c.id, true);
    expect((await getIndicator(a.ctx, ind.id)).calc.current).toBe(320);
    expect((await db.indicatorValue.findUniqueOrThrow({ where: { id: v.id } })).value?.toString()).toBe("300");
    await expectCode(deleteIndicator(a.ctx, ind.id), "CONFLICT");
  });

  it("ventilations : complètes et cohérentes avec la valeur totale", async () => {
    const { a, ind } = await setup();
    await expectCode(addValue(a.ctx, ind.id, val("2026-03-31", "100", { disaggregation: { Sexe: { Femmes: 60, Hommes: 30 } } })), "VALIDATION");
    await expectCode(addValue(a.ctx, ind.id, val("2026-03-31", "100", { disaggregation: { Sexe: { Femmes: 100 } } })), "VALIDATION");
    await expectCode(addValue(a.ctx, ind.id, val("2026-03-31", "100", { disaggregation: { Age: { A: 50, B: 50 } } })), "VALIDATION");
    await addValue(a.ctx, ind.id, val("2026-03-31", "100", { disaggregation: { Sexe: { Femmes: 60, Hommes: 40 } } }));
  });

  it("isolation et vue d'ensemble", async () => {
    const { a, ind } = await setup();
    const b = await ownerWithOrg("B");
    await expectCode(getIndicator(b.ctx, ind.id), "NOT_FOUND");
    await expectCode(addValue(b.ctx, ind.id, val("2026-03-31", "1")), "NOT_FOUND");
    expect((await mealOverview(b.ctx)).rows).toHaveLength(0);
    await addValue(a.ctx, ind.id, val("2026-03-31", "150"));
    const ov = await mealOverview(a.ctx);
    expect(ov.rows).toHaveLength(1);
    expect(ov.pending).toHaveLength(1);
  });
});
