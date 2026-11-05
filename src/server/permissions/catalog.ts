// Catalogue des permissions BAOBAB : codes "ressource:action".
// Les permissions sont vérifiées côté serveur dans chaque service (jamais uniquement dans l'interface).

export const RESOURCES = [
  "organization",
  "units",
  "members",
  "roles",
  "audit",
  "billing",
  "strategy",
  "meal",
  "analytics",
  "finance",
  "risk",
  "portfolio",
  "program",
  "project",
] as const;
export type Resource = (typeof RESOURCES)[number];

export const ACTIONS = ["view", "create", "edit", "delete", "approve", "export", "share", "manage"] as const;
export type Action = (typeof ACTIONS)[number];

export type Permission = `${Resource}:${Action}`;

// Actions pertinentes par ressource (évite de proposer des permissions sans effet).
export const RESOURCE_ACTIONS: Record<Resource, readonly Action[]> = {
  organization: ["view", "edit", "manage"],
  units: ["view", "create", "edit", "delete"],
  members: ["view", "manage"],
  roles: ["view", "manage"],
  audit: ["view"], // « export » sera ajouté avec la fonction d'export (phase 9)
  billing: ["view", "manage"],
  strategy: ["view", "create", "edit", "delete"],
  meal: ["view", "create", "edit", "delete", "approve"],
  analytics: ["view", "create", "delete"],
  // finance:create = saisir des dépenses ; edit = budget et financements ; approve = valider / annuler des dépenses
  finance: ["view", "create", "edit", "delete", "approve"],
  risk: ["view", "create", "edit", "delete"],
  portfolio: ["view", "create", "edit", "delete"],
  program: ["view", "create", "edit", "delete"],
  project: ["view", "create", "edit", "delete", "approve"],
};

export const ALL_PERMISSIONS: Permission[] = RESOURCES.flatMap((r) =>
  RESOURCE_ACTIONS[r].map((a) => `${r}:${a}` as Permission),
);

export function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as string[]).includes(value);
}

const VIEW_ALL: Permission[] = RESOURCES.filter((r) => r !== "audit" && r !== "billing").map((r) => `${r}:view` as Permission);

type SystemRole = { key: string; name: string; description: string; permissions: Permission[] };

// Rôles système créés pour chaque nouvelle organisation. Ils restent modifiables (sauf ORG_OWNER).
export const SYSTEM_ROLES: SystemRole[] = [
  { key: "ORG_OWNER", name: "Propriétaire de l'organisation", description: "Tous les droits, non modifiable.", permissions: ALL_PERMISSIONS },
  {
    key: "ORG_ADMIN",
    name: "Administrateur",
    description: "Administre l'organisation, les membres et toutes les données.",
    permissions: ALL_PERMISSIONS.filter((p) => p !== "organization:manage"),
  },
  {
    key: "EXECUTIVE_DIRECTOR",
    name: "Directeur exécutif",
    description: "Vision globale, validation des projets, consultation de l'audit.",
    permissions: [...VIEW_ALL, "audit:view", "billing:view", "project:approve", "portfolio:edit", "program:edit", "strategy:create", "strategy:edit", "meal:approve", "finance:approve", "risk:edit"],
  },
  {
    key: "PORTFOLIO_MANAGER",
    name: "Responsable de portefeuille",
    description: "Gère portefeuilles, programmes et projets.",
    permissions: [...VIEW_ALL, "strategy:edit", "portfolio:create", "portfolio:edit", "program:create", "program:edit", "project:create", "project:edit", "meal:create", "meal:edit", "risk:create", "risk:edit"],
  },
  {
    key: "PROGRAM_MANAGER",
    name: "Responsable de programme",
    description: "Gère programmes et projets.",
    permissions: [...VIEW_ALL, "program:create", "program:edit", "project:create", "project:edit", "meal:create", "meal:edit", "risk:create", "risk:edit"],
  },
  {
    key: "PROJECT_MANAGER",
    name: "Chef de projet",
    description: "Crée et pilote des projets.",
    permissions: [...VIEW_ALL, "project:create", "project:edit", "meal:create", "meal:edit", "analytics:create", "finance:create", "finance:edit", "risk:create", "risk:edit"],
  },
  { key: "MEAL_MANAGER", name: "Responsable MEAL", description: "Cadres logiques, indicateurs, validation des données, analyses.", permissions: [...VIEW_ALL, "meal:create", "meal:edit", "meal:delete", "meal:approve", "analytics:create", "analytics:delete"] },
  { key: "FINANCE_MANAGER", name: "Responsable financier", description: "Budgets, financements, saisie et validation des dépenses.", permissions: [...VIEW_ALL, "finance:create", "finance:edit", "finance:delete", "finance:approve", "risk:create"] },
  { key: "TEAM_MEMBER", name: "Membre d'équipe", description: "Consultation, saisie des données de suivi.", permissions: [...VIEW_ALL, "meal:create", "finance:create", "risk:create"] },
  { key: "VIEWER", name: "Lecteur", description: "Consultation seule.", permissions: [...VIEW_ALL] },
  {
    key: "DONOR_VIEWER",
    name: "Bailleur (lecture)",
    description: "Consultation des portefeuilles, programmes et projets.",
    permissions: ["organization:view", "strategy:view", "meal:view", "finance:view", "portfolio:view", "program:view", "project:view"],
  },
];

export const OWNER_ROLE_KEY = "ORG_OWNER";

export const PERMISSION_LABELS: Record<Resource, string> = {
  organization: "Organisation",
  units: "Structures internes",
  members: "Membres",
  roles: "Rôles",
  audit: "Journal d'audit",
  billing: "Abonnement",
  strategy: "Stratégie",
  meal: "Suivi-évaluation",
  analytics: "Analyse de données",
  finance: "Finances",
  risk: "Risques",
  portfolio: "Portefeuilles",
  program: "Programmes",
  project: "Projets",
};

export const ACTION_LABELS: Record<Action, string> = {
  view: "Consulter",
  create: "Créer",
  edit: "Modifier",
  delete: "Supprimer",
  approve: "Valider",
  export: "Exporter",
  share: "Partager",
  manage: "Gérer",
};
