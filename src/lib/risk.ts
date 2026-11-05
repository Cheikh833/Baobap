// Risques — matrice probabilité × impact (1 à 5 chacun), score de 1 à 25.
// Niveaux : ≤ 4 faible, ≤ 9 modéré, ≤ 15 élevé, au-delà critique.

export type RiskLevel = "low" | "medium" | "high" | "critical";
export const riskScore = (probability: number, impact: number) => probability * impact;
export const riskLevel = (score: number): RiskLevel => (score <= 4 ? "low" : score <= 9 ? "medium" : score <= 15 ? "high" : "critical");
export const isReviewOverdue = (r: { status: string; reviewDate: Date | null }, now = new Date()) =>
  r.status !== "CLOSED" && !!r.reviewDate && r.reviewDate.getTime() < new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime();

/** Matrice 5×5 : nombre de risques non clôturés par case [probabilité][impact]. */
export function riskMatrix(risks: { probability: number; impact: number; status: string }[]) {
  const m = Array.from({ length: 5 }, () => Array(5).fill(0) as number[]);
  for (const r of risks) if (r.status !== "CLOSED") m[r.probability - 1][r.impact - 1]++;
  return m;
}

/**
 * Santé « Risques » : critique si un risque non clôturé est critique ; vigilance si un risque élevé est ouvert
 * ou si une revue est en retard ; bon sinon ; non évalué si aucun risque n'est enregistré.
 */
export function risksHealth(risks: { probability: number; impact: number; status: string; reviewDate: Date | null }[], now = new Date()) {
  if (!risks.length) return { level: "unknown" as const, critical: 0, high: 0, overdue: 0, open: 0 };
  const open = risks.filter((r) => r.status !== "CLOSED");
  const lv = open.map((r) => riskLevel(riskScore(r.probability, r.impact)));
  const critical = lv.filter((l) => l === "critical").length;
  const high = lv.filter((l) => l === "high").length;
  const overdue = risks.filter((r) => isReviewOverdue(r, now)).length;
  return { level: critical ? ("critical" as const) : high || overdue ? ("watch" as const) : ("good" as const), critical, high, overdue, open: open.length };
}
