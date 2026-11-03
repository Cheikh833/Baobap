// Catalogue des permissions BAOBAB : codes "ressource:action".
// Les permissions sont vérifiées côté serveur dans chaque service (jamais uniquement dans l'interface).

export const RESOURCES = [
  "organization",
  "units",
  "members",
  "roles",
  "audit",
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
  audit: ["view", "export"],
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

const VIEW_ALL: Permission[] = RESOURCES.filter((r) => r !== "audit").map((r) => `${r}:view` as Permission);

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
    permissions: [...VIEW_ALL, "audit:view", "project:approve", "portfolio:edit", "program:edit"],
  },
  {
    key: "PORTFOLIO_MANAGER",
    name: "Responsable de portefeuille",
    description: "Gère portefeuilles, programmes et projets.",
    permissions: [...VIEW_ALL, "portfolio:create", "portfolio:edit", "program:create", "program:edit", "project:create", "project:edit"],
  },
  {
    key: "PROGRAM_MANAGER",
    name: "Responsable de programme",
    description: "Gère programmes et projets.",
    permissions: [...VIEW_ALL, "program:create", "program:edit", "project:create", "project:edit"],
  },
  {
    key: "PROJECT_MANAGER",
    name: "Chef de projet",
    description: "Crée et pilote des projets.",
    permissions: [...VIEW_ALL, "project:create", "project:edit"],
  },
  { key: "MEAL_MANAGER", name: "Responsable MEAL", description: "Suivi-évaluation (modules MEAL à venir).", permissions: [...VIEW_ALL] },
  { key: "FINANCE_MANAGER", name: "Responsable financier", description: "Finances (module à venir).", permissions: [...VIEW_ALL] },
  { key: "TEAM_MEMBER", name: "Membre d'équipe", description: "Consultation et contribution.", permissions: [...VIEW_ALL] },
  { key: "VIEWER", name: "Lecteur", description: "Consultation seule.", permissions: [...VIEW_ALL] },
  {
    key: "DONOR_VIEWER",
    name: "Bailleur (lecture)",
    description: "Consultation des portefeuilles, programmes et projets.",
    permissions: ["organization:view", "portfolio:view", "program:view", "project:view"],
  },
];

export const OWNER_ROLE_KEY = "ORG_OWNER";

export const PERMISSION_LABELS: Record<Resource, string> = {
  organization: "Organisation",
  units: "Structures internes",
  members: "Membres",
  roles: "Rôles",
  audit: "Journal d'audit",
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
