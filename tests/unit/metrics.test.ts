import { describe, expect, it } from "vitest";
import { durationDays, isOverdue, sumByCurrency, timeProgress, weightedTimeProgress } from "@/lib/metrics";

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("timeProgress", () => {
  it("renvoie null sans dates", () => {
    expect(timeProgress(null, d("2026-12-31"))).toBeNull();
  });
  it("calcule le temps écoulé borné à [0,100]", () => {
    expect(timeProgress(d("2026-01-01"), d("2026-01-11"), d("2026-01-06"))).toBe(50);
    expect(timeProgress(d("2026-01-01"), d("2026-01-11"), d("2025-12-01"))).toBe(0);
    expect(timeProgress(d("2026-01-01"), d("2026-01-11"), d("2027-01-01"))).toBe(100);
  });
  it("gère une durée nulle", () => {
    expect(timeProgress(d("2026-01-01"), d("2026-01-01"), d("2026-01-02"))).toBe(100);
  });
});

describe("durationDays", () => {
  it("inclut les bornes", () => expect(durationDays(d("2026-01-01"), d("2026-01-31"))).toBe(31));
});

describe("isOverdue", () => {
  it("projet actif dont la fin est dépassée", () => expect(isOverdue("ACTIVE", d("2026-01-01"), d("2026-02-01"))).toBe(true));
  it("projet clôturé jamais en retard", () => expect(isOverdue("CLOSED", d("2026-01-01"), d("2026-02-01"))).toBe(false));
  it("sans date de fin", () => expect(isOverdue("ACTIVE", null)).toBe(false));
});

describe("sumByCurrency", () => {
  it("n'additionne jamais des devises différentes et compte les budgets manquants", () => {
    const r = sumByCurrency([
      { plannedBudget: 100, currency: "XOF" },
      { plannedBudget: { toString: () => "50.5" }, currency: "XOF" },
      { plannedBudget: 10, currency: "EUR" },
      { plannedBudget: null, currency: "XOF" },
    ]);
    expect(r.totals).toEqual({ XOF: 150.5, EUR: 10 });
    expect(r.missing).toBe(1);
  });
});

describe("weightedTimeProgress", () => {
  it("pondère par la durée (pas de moyenne simple)", () => {
    const now = d("2026-01-11");
    const r = weightedTimeProgress([
      { startDate: d("2026-01-01"), endDate: d("2026-01-11") }, // 100 %, 11 j
      { startDate: d("2026-01-01"), endDate: d("2027-01-01") }, // ~3 %, 366 j
      { startDate: null, endDate: null },
    ], now);
    expect(r.excluded).toBe(1);
    // moyenne simple ≈ 51 % ; pondérée ≈ 6 %
    expect(r.value).toBeLessThan(10);
  });
  it("renvoie null si aucun élément exploitable", () => {
    expect(weightedTimeProgress([{ startDate: null, endDate: null }]).value).toBeNull();
  });
});

import { objectiveAlignment, planCoverage } from "@/lib/strategy";
describe("alignement stratégique", () => {
  const proj = (budget: number | null, status = "ACTIVE", currency = "XOF") => ({ id: Math.random().toString(), status, plannedBudget: budget, currency });
  it("budget pondéré par devise, projets archivés exclus, sans budget comptés à part", () => {
    const r = objectiveAlignment({ id: "o", contributions: [
      { weight: 50, project: proj(1000) }, { weight: 100, project: proj(200, "ACTIVE", "EUR") },
      { weight: 100, project: proj(999, "ARCHIVED") }, { weight: 30, project: proj(null) },
    ] });
    expect(r.budget).toEqual({ XOF: 500, EUR: 200 });
    expect(r.projects).toBe(3);
    expect(r.withoutBudget).toBe(1);
  });
  it("couverture du plan", () => {
    const c = planCoverage([{ id: "a", contributions: [{ weight: 100, project: proj(10) }] }, { id: "b", contributions: [] }]);
    expect(c).toMatchObject({ objectives: 2, covered: 1, rate: 50 });
    expect(planCoverage([]).rate).toBeNull();
  });
});
