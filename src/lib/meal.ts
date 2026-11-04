// Suivi-évaluation — formules (docs/product/business-rules.md, section MEAL).
//
// Valeur actuelle : uniquement des valeurs VALIDÉES et non remplacées par une correction.
//   - agrégation LATEST : valeur de la période la plus récente ;
//   - agrégation SUM    : somme des valeurs des périodes.
// Taux d'atteinte = (actuelle − référence) / (cible − référence) × 100. La formule couvre aussi les
//   indicateurs « à faire baisser » (cible < référence). Indéfini sans référence, cible ou valeur, ou si cible = référence.
// Taux attendu (trajectoire linéaire) = temps écoulé entre date de référence et date cible.
// Ce taux n'est ni l'avancement temporel du projet ni l'exécution budgétaire.

export type MValue = { id: string; periodStart: Date; periodEnd: Date; value: number | null; status: string; supersededBy?: { id: string; status: string } | null };
export type MIndicator = {
  aggregation: string; baseline: number | null; target: number | null; baselineDate: Date | null; targetDate: Date | null; frequency: string; type: string;
};

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export function effectiveValues(values: MValue[]) {
  // Une valeur n'est remplacée que lorsque sa correction est elle-même validée.
  return values.filter((v) => v.status === "VALIDATED" && v.supersededBy?.status !== "VALIDATED").sort((a, b) => a.periodEnd.getTime() - b.periodEnd.getTime());
}

export function currentValue(ind: Pick<MIndicator, "aggregation">, values: MValue[]): number | null {
  const ok = effectiveValues(values).filter((v) => v.value !== null);
  if (!ok.length) return null;
  if (ind.aggregation === "SUM") return Math.round(ok.reduce((s, v) => s + (v.value as number), 0) * 10000) / 10000;
  return ok[ok.length - 1].value;
}

export function achievementRate(baseline: number | null, target: number | null, current: number | null): number | null {
  if (baseline === null || target === null || current === null || target === baseline) return null;
  return Math.round(((current - baseline) / (target - baseline)) * 1000) / 10;
}

export function expectedRate(baselineDate: Date | null, targetDate: Date | null, now = new Date()): number | null {
  if (!baselineDate || !targetDate || targetDate <= baselineDate) return null;
  const r = ((now.getTime() - baselineDate.getTime()) / (targetDate.getTime() - baselineDate.getTime())) * 100;
  return Math.round(Math.max(0, Math.min(100, r)));
}

/** Situation par rapport à la trajectoire attendue : écart ≤ 10 pts bon, ≤ 25 vigilance, au-delà critique. */
export function trackStatus(rate: number | null, expected: number | null): "good" | "watch" | "critical" | "unknown" {
  if (rate === null) return "unknown";
  if (rate >= 100) return "good";
  if (expected === null) return "good";
  const gap = expected - rate;
  return gap <= 10 ? "good" : gap <= 25 ? "watch" : "critical";
}

export const FREQUENCY_DAYS: Record<string, number | null> = { MONTHLY: 31, QUARTERLY: 92, SEMIANNUAL: 183, ANNUAL: 366, ONE_TIME: null };
const GRACE_DAYS = 30;

/**
 * Indicateur « non actualisé » : la dernière période validée se termine il y a plus d'une période + 30 jours de grâce
 * (ou aucune valeur validée alors que la date de référence date de plus d'une période + grâce).
 */
export function isStale(ind: Pick<MIndicator, "frequency" | "baselineDate">, values: MValue[], now = new Date()) {
  const period = FREQUENCY_DAYS[ind.frequency];
  if (!period) return false;
  const last = effectiveValues(values).at(-1)?.periodEnd ?? ind.baselineDate;
  if (!last) return false;
  return (now.getTime() - last.getTime()) / 86_400_000 > period + GRACE_DAYS;
}

/** Contrôle de cohérence : pour chaque dimension, la somme des catégories doit égaler la valeur totale. */
export function disaggregationIssues(value: number | null, disagg: Record<string, Record<string, number>> | null | undefined) {
  if (value === null || !disagg) return [];
  const issues: { dimension: string; sum: number }[] = [];
  for (const [dim, cats] of Object.entries(disagg)) {
    const sum = Object.values(cats).reduce((s, v) => s + (Number(v) || 0), 0);
    if (Math.abs(sum - value) > 1e-6) issues.push({ dimension: dim, sum });
  }
  return issues;
}

export const toNum = num;

/** « Sexe : Femmes, Hommes » → { name: "Sexe", categories: ["Femmes", "Hommes"] } */
export function parseDimensions(lines: string[]) {
  return lines
    .map((l) => {
      const i = l.indexOf(":");
      if (i < 0) return null;
      return { name: l.slice(0, i).trim(), categories: l.slice(i + 1).split(",").map((c) => c.trim()).filter(Boolean) };
    })
    .filter((d): d is { name: string; categories: string[] } => !!d && !!d.name && d.categories.length >= 2);
}
