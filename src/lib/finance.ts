// Finances — formules (docs/product/business-rules.md, section Finances).
// Tous les montants d'un projet sont exprimés dans la devise du projet : aucune conversion implicite.
// « Dépensé » = dépenses VALIDÉES uniquement ; les brouillons sont « à valider », les rejetées / annulées sont exclues.

export type FExpense = { amount: unknown; status: string; budgetLineId: string };
export type FLine = { id: string; plannedAmount: unknown; fundingId: string | null };

const n = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const round2 = (x: number) => Math.round(x * 100) / 100;

export function lineTotals(line: FLine, expenses: FExpense[]) {
  const mine = expenses.filter((e) => e.budgetLineId === line.id);
  const planned = n(line.plannedAmount);
  const spent = round2(mine.filter((e) => e.status === "VALIDATED").reduce((s, e) => s + n(e.amount), 0));
  const pending = round2(mine.filter((e) => e.status === "DRAFT").reduce((s, e) => s + n(e.amount), 0));
  return { planned, spent, pending, remaining: round2(planned - spent), rate: planned > 0 ? Math.round((spent / planned) * 1000) / 10 : null, overspent: spent > planned };
}

export function projectFinance(lines: FLine[], expenses: FExpense[], fundings: { amount: unknown }[]) {
  const perLine = lines.map((l) => ({ id: l.id, ...lineTotals(l, expenses) }));
  const planned = round2(perLine.reduce((s, l) => s + l.planned, 0));
  const spent = round2(perLine.reduce((s, l) => s + l.spent, 0));
  const pending = round2(perLine.reduce((s, l) => s + l.pending, 0));
  const funded = round2(fundings.reduce((s, f) => s + n(f.amount), 0));
  return {
    perLine, planned, spent, pending, funded,
    remaining: round2(planned - spent),
    execution: planned > 0 ? Math.round((spent / planned) * 1000) / 10 : null,
    // Financement manquant (> 0) ou excédentaire (< 0) par rapport au budget détaillé.
    fundingGap: round2(planned - funded),
    overspentLines: perLine.filter((l) => l.overspent).length,
  };
}

/**
 * Santé « Budget » : critique si une ligne est en dépassement ; vigilance si l'exécution devance le temps écoulé
 * de plus de 15 points (consommation trop rapide) ou accuse plus de 25 points de retard (sous-consommation) ;
 * bon sinon ; non évalué sans budget détaillé.
 */
export function budgetHealth(execution: number | null, elapsed: number | null, overspentLines: number): "good" | "watch" | "critical" | "unknown" {
  if (execution === null) return "unknown";
  if (overspentLines > 0) return "critical";
  if (elapsed === null) return "good";
  const gap = execution - elapsed;
  return gap > 15 || gap < -25 ? "watch" : "good";
}
