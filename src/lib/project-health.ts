import { isOverdue, timeProgress } from "./metrics";

// Santé du projet : chaque dimension est calculée par une règle documentée, à partir des données réelles.
// Les dimensions dont les données n'existent pas encore sont explicitement « non évaluées ».
export type HealthLevel = "good" | "watch" | "critical" | "unknown";
export type HealthDimension = { key: string; label: string; level: HealthLevel; detail: string };

type P = {
  status: string; startDate: Date | null; endDate: Date | null; name: string; code: string;
  managerId: string | null; generalObjective: string | null; context: string | null; plannedBudget: unknown;
  shortDescription: string | null; specificObjectives: string[]; country: string | null; directBeneficiaries: number | null;
};

export const COMPLETENESS_FIELDS: [keyof P, string][] = [
  ["managerId", "Chef de projet"], ["shortDescription", "Description courte"], ["context", "Contexte"],
  ["generalObjective", "Objectif général"], ["specificObjectives", "Objectifs spécifiques"], ["country", "Pays"],
  ["directBeneficiaries", "Bénéficiaires directs"], ["startDate", "Date de début"], ["endDate", "Date de fin"], ["plannedBudget", "Budget"],
];

export function completeness(p: P) {
  const missing = COMPLETENESS_FIELDS.filter(([k]) => {
    const v = p[k];
    return v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
  }).map(([, l]) => l);
  return { pct: Math.round(((COMPLETENESS_FIELDS.length - missing.length) / COMPLETENESS_FIELDS.length) * 100), missing };
}

export function projectHealth(p: P, now = new Date()): HealthDimension[] {
  // Planning — règle : en retard si fin dépassée et non clôturé (critique) ;
  // vigilance si < 15 % du temps restant ou < 30 jours avant la fin ; inconnu sans dates.
  let planning: HealthDimension;
  if (!p.startDate || !p.endDate) planning = { key: "planning", label: "Planning", level: "unknown", detail: "Dates de début et de fin non renseignées." };
  else if (isOverdue(p.status, p.endDate, now)) planning = { key: "planning", label: "Planning", level: "critical", detail: "Date de fin dépassée sans clôture du projet." };
  else {
    const t = timeProgress(p.startDate, p.endDate, now)!;
    const daysLeft = Math.ceil((p.endDate.getTime() - now.getTime()) / 86_400_000);
    planning = ["CLOSED", "ARCHIVED"].includes(p.status)
      ? { key: "planning", label: "Planning", level: "good", detail: "Projet clôturé." }
      : daysLeft <= 30 || t >= 85
        ? { key: "planning", label: "Planning", level: "watch", detail: `${t} % du temps écoulé, ${daysLeft} jour(s) restant(s).` }
        : { key: "planning", label: "Planning", level: "good", detail: `${t} % du temps écoulé.` };
  }
  // Qualité des données de la fiche — règle : ≥ 80 % bon, ≥ 50 % vigilance, sinon critique.
  const c = completeness(p);
  const data: HealthDimension = {
    key: "data", label: "Complétude de la fiche",
    level: c.pct >= 80 ? "good" : c.pct >= 50 ? "watch" : "critical",
    detail: c.missing.length ? `${c.pct} % — manquant : ${c.missing.join(", ")}.` : "100 % des champs clés renseignés.",
  };
  const pending = (key: string, label: string, module: string): HealthDimension => ({ key, label, level: "unknown", detail: `Non évalué : nécessite le module ${module}.` });
  return [
    planning,
    data,
    pending("activities", "Activités", "Planification (phase 3)"),
    pending("budget", "Budget", "Finances (phase 5)"),
    pending("indicators", "Indicateurs & résultats", "MEAL (phase 4)"),
    pending("risks", "Risques", "Risques (phase 5)"),
  ];
}
