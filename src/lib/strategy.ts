// Alignement stratégique — formules (docs/product/business-rules.md, section Stratégie).
//
// - Un projet répartit au plus 100 % de lui-même entre des objectifs stratégiques (poids en %).
// - Budget aligné sur un objectif = Σ (budget prévu du projet × poids / 100), par devise, sans conversion.
//   Comme les poids d'un projet totalisent ≤ 100 %, la somme sur tous les objectifs n'excède jamais le budget
//   des projets : pas de double comptage.
// - Un objectif est « couvert » s'il reçoit au moins une contribution d'un projet non archivé.
// - Taux de couverture du plan = objectifs couverts / objectifs du plan.

export type AlignProject = { id: string; status: string; plannedBudget: { toString(): string } | number | null; currency: string };
export type AlignObjective = { id: string; contributions: { weight: number; project: AlignProject }[] };

const amount = (v: AlignProject["plannedBudget"]) => (v === null ? null : typeof v === "number" ? v : Number(v.toString()));

export function objectiveAlignment(o: AlignObjective) {
  const live = o.contributions.filter((c) => c.project.status !== "ARCHIVED");
  const budget: Record<string, number> = {};
  let withoutBudget = 0;
  for (const c of live) {
    const a = amount(c.project.plannedBudget);
    if (a === null) { withoutBudget++; continue; }
    budget[c.project.currency] = Math.round(((budget[c.project.currency] ?? 0) + (a * c.weight) / 100) * 100) / 100;
  }
  return { projects: live.length, covered: live.length > 0, budget, withoutBudget };
}

export function planCoverage(objectives: AlignObjective[]) {
  const per = objectives.map(objectiveAlignment);
  const covered = per.filter((p) => p.covered).length;
  const budget: Record<string, number> = {};
  for (const p of per) for (const [c, v] of Object.entries(p.budget)) budget[c] = Math.round(((budget[c] ?? 0) + v) * 100) / 100;
  return { objectives: objectives.length, covered, rate: objectives.length ? Math.round((covered / objectives.length) * 100) : null, budget };
}
