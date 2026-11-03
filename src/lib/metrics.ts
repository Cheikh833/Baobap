// Formules de pilotage BAOBAB (documentées dans docs/product/business-rules.md).
// Règle : ne jamais confondre progression temporelle, taux d'exécution budgétaire et taux d'atteinte d'une cible.

/** Progression temporelle (%) = (aujourd'hui − début) / (fin − début), bornée à [0, 100]. null si dates absentes. */
export function timeProgress(start: Date | null | undefined, end: Date | null | undefined, now = new Date()): number | null {
  if (!start || !end) return null;
  const total = end.getTime() - start.getTime();
  if (total <= 0) return now >= end ? 100 : 0;
  const pct = ((now.getTime() - start.getTime()) / total) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)));
}

/** Durée en jours calendaires, bornes incluses. */
export function durationDays(start: Date | null | undefined, end: Date | null | undefined): number | null {
  if (!start || !end) return null;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

/** Projet "en retard" : date de fin dépassée alors qu'il n'est ni clôturé ni archivé. */
export function isOverdue(status: string, end: Date | null | undefined, now = new Date()): boolean {
  return !!end && end < now && !["CLOSED", "ARCHIVED"].includes(status);
}

/**
 * Somme des budgets prévus par devise. Les montants de devises différentes ne sont jamais additionnés
 * entre eux (pas de conversion implicite). Les éléments sans budget sont comptés à part.
 */
export function sumByCurrency(items: { plannedBudget: { toString(): string } | number | null; currency: string }[]) {
  const totals: Record<string, number> = {};
  let missing = 0;
  for (const it of items) {
    if (it.plannedBudget === null || it.plannedBudget === undefined) {
      missing++;
      continue;
    }
    const v = typeof it.plannedBudget === "number" ? it.plannedBudget : Number(it.plannedBudget.toString());
    totals[it.currency] = (totals[it.currency] ?? 0) + v;
  }
  return { totals, missing };
}

/**
 * Progression temporelle consolidée d'un ensemble, pondérée par la durée de chaque élément
 * (évite qu'un projet de 2 semaines pèse autant qu'un projet de 3 ans). Éléments sans dates exclus.
 */
export function weightedTimeProgress(items: { startDate: Date | null; endDate: Date | null }[], now = new Date()) {
  let weighted = 0;
  let weights = 0;
  let excluded = 0;
  for (const it of items) {
    const p = timeProgress(it.startDate, it.endDate, now);
    const d = durationDays(it.startDate, it.endDate);
    if (p === null || !d || d <= 0) {
      excluded++;
      continue;
    }
    weighted += p * d;
    weights += d;
  }
  return { value: weights ? Math.round(weighted / weights) : null, excluded };
}

/** Locale Intl d'une langue de l'interface (le wolof utilise les conventions sénégalaises en français). */
export const intlLocale = (locale?: string) => (locale === "en" ? "en-GB" : "fr-FR");

export function formatMoney(amount: number, currency: string, locale?: string) {
  try {
    return new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount.toLocaleString("fr-FR")} ${currency}`;
  }
}

export function formatDate(d: Date | null | undefined, locale?: string) {
  return d ? new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium", timeZone: "UTC" }).format(d) : "—";
}
