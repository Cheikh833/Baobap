import type { Tone } from "@/components/ui/display";

// Couleur des badges de statut (les libellés sont dans les dictionnaires : status.*).
export const STATUS_LABELS: Record<string, [string, Tone]> = {
  DRAFT: ["Brouillon", "neutral"],
  PREPARATION: ["En préparation", "info"],
  ACTIVE: ["Actif", "success"],
  SUSPENDED: ["Suspendu", "warning"],
  CLOSED: ["Clôturé", "brand"],
  ARCHIVED: ["Archivé", "neutral"],
};
