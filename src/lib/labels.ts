import type { Tone } from "@/components/ui/display";

export const STATUS_LABELS: Record<string, [string, Tone]> = {
  DRAFT: ["Brouillon", "neutral"],
  PREPARATION: ["En préparation", "info"],
  ACTIVE: ["Actif", "success"],
  SUSPENDED: ["Suspendu", "warning"],
  CLOSED: ["Clôturé", "brand"],
  ARCHIVED: ["Archivé", "neutral"],
};
export const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([k, [l]]) => [k, l] as const);

export const PRIORITY_LABELS: Record<string, string> = { LOW: "Faible", MEDIUM: "Moyenne", HIGH: "Haute", CRITICAL: "Critique" };

export const SDG_LABELS = [
  "Pas de pauvreté", "Faim « zéro »", "Bonne santé et bien-être", "Éducation de qualité", "Égalité entre les sexes",
  "Eau propre et assainissement", "Énergie propre et d'un coût abordable", "Travail décent et croissance économique",
  "Industrie, innovation et infrastructure", "Inégalités réduites", "Villes et communautés durables",
  "Consommation et production responsables", "Mesures relatives à la lutte contre les changements climatiques",
  "Vie aquatique", "Vie terrestre", "Paix, justice et institutions efficaces", "Partenariats pour la réalisation des objectifs",
];
