import { describe, expect, it } from "vitest";
import { achievementRate, currentValue, disaggregationIssues, effectiveValues, expectedRate, isStale, parseDimensions, trackStatus } from "@/lib/meal";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const v = (end: string, value: number | null, status = "VALIDATED", supersededBy: { id: string; status: string } | null = null) => ({ id: end + value, periodStart: d(end), periodEnd: d(end), value, status, supersededBy });

describe("formules MEAL", () => {
  it("valeur actuelle : validées seulement, correction validée remplace l'originale", () => {
    const vals = [v("2026-03-31", 40), v("2026-06-30", 55, "VALIDATED", { id: "c", status: "DRAFT" }), v("2026-09-30", 999, "DRAFT")];
    expect(currentValue({ aggregation: "LATEST" }, vals)).toBe(55); // correction pas encore validée
    vals[1].supersededBy = { id: "c", status: "VALIDATED" };
    expect(effectiveValues(vals)).toHaveLength(1);
    expect(currentValue({ aggregation: "SUM" }, [v("2026-03-31", 10), v("2026-06-30", 15)])).toBe(25);
    expect(currentValue({ aggregation: "LATEST" }, [])).toBeNull();
  });
  it("taux d'atteinte, y compris pour un indicateur à faire baisser", () => {
    expect(achievementRate(20, 80, 50)).toBe(50);
    expect(achievementRate(30, 10, 20)).toBe(50); // mortalité : baisser de 30 à 10
    expect(achievementRate(20, 20, 25)).toBeNull();
    expect(achievementRate(null, 80, 50)).toBeNull();
  });
  it("trajectoire attendue et situation", () => {
    expect(expectedRate(d("2026-01-01"), d("2027-01-01"), d("2026-07-02"))).toBe(50);
    expect(trackStatus(45, 50)).toBe("good");
    expect(trackStatus(30, 50)).toBe("watch");
    expect(trackStatus(10, 50)).toBe("critical");
    expect(trackStatus(null, 50)).toBe("unknown");
    expect(trackStatus(110, 50)).toBe("good");
  });
  it("indicateur non actualisé selon la fréquence (+30 jours de grâce)", () => {
    const ind = { frequency: "QUARTERLY", baselineDate: d("2025-12-31") };
    expect(isStale(ind, [v("2026-03-31", 1)], d("2026-07-15"))).toBe(false);
    expect(isStale(ind, [v("2026-03-31", 1)], d("2026-08-15"))).toBe(true);
    expect(isStale({ frequency: "ONE_TIME", baselineDate: null }, [], d("2030-01-01"))).toBe(false);
  });
  it("ventilations : cohérence des sommes et lecture des dimensions", () => {
    expect(disaggregationIssues(100, { Sexe: { F: 60, H: 40 } })).toEqual([]);
    expect(disaggregationIssues(100, { Sexe: { F: 60, H: 30 } })).toEqual([{ dimension: "Sexe", sum: 90 }]);
    expect(parseDimensions(["Sexe : Femmes, Hommes", "invalide"])).toEqual([{ name: "Sexe", categories: ["Femmes", "Hommes"] }]);
  });
});
