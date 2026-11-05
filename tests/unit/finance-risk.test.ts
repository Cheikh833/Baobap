import { describe, expect, it } from "vitest";
import { budgetHealth, lineTotals, projectFinance } from "@/lib/finance";
import { isReviewOverdue, riskLevel, riskMatrix, riskScore, risksHealth } from "@/lib/risk";

describe("finances", () => {
  const lines = [{ id: "a", plannedAmount: "1000", fundingId: null }, { id: "b", plannedAmount: 500, fundingId: null }];
  const ex = [
    { budgetLineId: "a", amount: "300.10", status: "VALIDATED" }, { budgetLineId: "a", amount: 200, status: "DRAFT" },
    { budgetLineId: "a", amount: 999, status: "REJECTED" }, { budgetLineId: "b", amount: 600, status: "VALIDATED" },
    { budgetLineId: "b", amount: 50, status: "CANCELED" },
  ];
  it("ne compte comme dépensé que les dépenses validées", () => {
    expect(lineTotals(lines[0], ex)).toMatchObject({ planned: 1000, spent: 300.1, pending: 200, remaining: 699.9, rate: 30, overspent: false });
    expect(lineTotals(lines[1], ex)).toMatchObject({ spent: 600, overspent: true, rate: 120 });
  });
  it("totaux, exécution et écart de financement", () => {
    const f = projectFinance(lines, ex, [{ amount: 1200 }]);
    expect(f).toMatchObject({ planned: 1500, spent: 900.1, pending: 200, funded: 1200, fundingGap: 300, overspentLines: 1 });
    expect(f.execution).toBe(60);
    expect(projectFinance([], [], []).execution).toBeNull();
  });
  it("santé budget", () => {
    expect(budgetHealth(null, 50, 0)).toBe("unknown");
    expect(budgetHealth(40, 50, 1)).toBe("critical");
    expect(budgetHealth(70, 50, 0)).toBe("watch");
    expect(budgetHealth(20, 50, 0)).toBe("watch");
    expect(budgetHealth(45, 50, 0)).toBe("good");
  });
});

describe("risques", () => {
  it("score et niveaux", () => {
    expect(riskScore(3, 4)).toBe(12);
    expect([1, 4, 5, 9, 10, 15, 16, 25].map(riskLevel)).toEqual(["low", "low", "medium", "medium", "high", "high", "critical", "critical"]);
  });
  it("matrice, revues en retard et santé", () => {
    const now = new Date("2026-06-15T10:00:00Z");
    const rs = [
      { probability: 5, impact: 4, status: "OPEN", reviewDate: null },
      { probability: 2, impact: 2, status: "CLOSED", reviewDate: new Date("2026-01-01") },
      { probability: 3, impact: 4, status: "MITIGATING", reviewDate: new Date("2026-06-14") },
    ];
    expect(riskMatrix(rs)[4][3]).toBe(1);
    expect(riskMatrix(rs)[1][1]).toBe(0);
    expect(isReviewOverdue(rs[1], now)).toBe(false);
    expect(isReviewOverdue(rs[2], now)).toBe(true);
    expect(isReviewOverdue({ status: "OPEN", reviewDate: new Date("2026-06-15") }, now)).toBe(false);
    expect(risksHealth(rs, now)).toMatchObject({ level: "critical", critical: 1, high: 1, overdue: 1, open: 2 });
    expect(risksHealth([rs[2]], now).level).toBe("watch");
    expect(risksHealth([], now).level).toBe("unknown");
  });
});
