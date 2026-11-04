import { isOverdue, timeProgress } from "./metrics";
import { activitiesHealth } from "./planning";

// Santé du projet : chaque dimension est calculée par une règle documentée, à partir des données réelles.
// Les dimensions dont les données n'existent pas encore sont explicitement « non évaluées ».
// Les textes sont des clés de traduction (project.health.*) avec leurs variables.
export type HealthLevel = "good" | "watch" | "critical" | "unknown";
export type HealthKey = "planning" | "data" | "activities" | "budget" | "indicators" | "risks";
export type HealthDimension = { key: HealthKey; level: HealthLevel; detail: { k: string; vars?: Record<string, string | number> }; missing?: string[] };

type P = {
  status: string; startDate: Date | null; endDate: Date | null; name: string; code: string;
  managerId: string | null; generalObjective: string | null; context: string | null; plannedBudget: unknown;
  shortDescription: string | null; specificObjectives: string[]; country: string | null; directBeneficiaries: number | null;
};

/** Champs clés de la fiche → clé de libellé (wizard.fields.*). */
export const COMPLETENESS_FIELDS: [keyof P, string][] = [
  ["managerId", "manager"], ["shortDescription", "shortDescription"], ["context", "context"],
  ["generalObjective", "generalObjective"], ["specificObjectives", "specificObjectives"], ["country", "country"],
  ["directBeneficiaries", "direct"], ["startDate", "start"], ["endDate", "end"], ["plannedBudget", "budget"],
];

export function completeness(p: P) {
  const missing = COMPLETENESS_FIELDS.filter(([k]) => {
    const v = p[k];
    return v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
  }).map(([, l]) => l);
  return { pct: Math.round(((COMPLETENESS_FIELDS.length - missing.length) / COMPLETENESS_FIELDS.length) * 100), missing };
}

export type PlanningInfo = { actual: number | null; late: number } | null;

export function projectHealth(p: P, now = new Date(), planning: PlanningInfo = null): HealthDimension[] {
  // Planning — règle : critique si en retard ; vigilance si ≤ 30 jours restants ou ≥ 85 % du temps écoulé ; inconnu sans dates.
  let planning_: HealthDimension;
  if (!p.startDate || !p.endDate) planning_ = { key: "planning", level: "unknown", detail: { k: "noDates" } };
  else if (isOverdue(p.status, p.endDate, now)) planning_ = { key: "planning", level: "critical", detail: { k: "overdue" } };
  else {
    const t = timeProgress(p.startDate, p.endDate, now)!;
    const daysLeft = Math.ceil((p.endDate.getTime() - now.getTime()) / 86_400_000);
    planning_ = ["CLOSED", "ARCHIVED"].includes(p.status)
      ? { key: "planning", level: "good", detail: { k: "closed" } }
      : daysLeft <= 30 || t >= 85
        ? { key: "planning", level: "watch", detail: { k: "ending", vars: { pct: t, days: daysLeft } } }
        : { key: "planning", level: "good", detail: { k: "onTrack", vars: { pct: t } } };
  }
  // Complétude de la fiche — règle : ≥ 80 % bon, ≥ 50 % vigilance, sinon critique.
  const c = completeness(p);
  const data: HealthDimension = {
    key: "data",
    level: c.pct >= 80 ? "good" : c.pct >= 50 ? "watch" : "critical",
    detail: c.missing.length ? { k: "completeMissing", vars: { pct: c.pct } } : { k: "completeAll" },
    missing: c.missing,
  };
  const pending = (key: "activities" | "budget" | "indicators" | "risks"): HealthDimension => ({ key, level: "unknown", detail: { k: "pending", vars: { module: key } } });
  // Activités — règle : écart entre temps écoulé et avancement réel (≤ 10 pts bon, ≤ 25 vigilance, au-delà critique),
  // vigilance dès qu'une activité est en retard ; non évalué sans activité.
  const elapsed = timeProgress(p.startDate, p.endDate, now);
  const activities: HealthDimension = !planning || planning.actual === null
    ? { key: "activities", level: "unknown", detail: { k: "activitiesNone" } }
    : { key: "activities", level: activitiesHealth(planning.actual, elapsed, planning.late), detail: { k: "activitiesValue", vars: { actual: planning.actual, elapsed: elapsed ?? "—", late: planning.late } } };
  return [planning_, data, activities, pending("budget"), pending("indicators"), pending("risks")];
}
