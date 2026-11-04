import { z } from "zod";
import { code, currency, dateRange, lifecycleStatus, list, optAmount, optDate, optId, optInt, optText, reqText } from "./common";

export const ORGANIZATION_TYPES = [
  ["NGO_NATIONAL", "ONG nationale"],
  ["NGO_INTERNATIONAL", "ONG internationale"],
  ["ASSOCIATION", "Association"],
  ["FOUNDATION", "Fondation"],
  ["COMMUNITY", "Organisation communautaire"],
  ["PUBLIC_INSTITUTION", "Institution publique"],
  ["MINISTRY", "Ministère"],
  ["LOCAL_GOVERNMENT", "Collectivité territoriale"],
  ["DEVELOPMENT_AGENCY", "Agence de développement"],
  ["UN_AGENCY", "Agence des Nations unies"],
  ["INTERNATIONAL_ORGANIZATION", "Organisation internationale"],
  ["DONOR", "Bailleur de fonds"],
  ["CONSULTING", "Cabinet de conseil / bureau d'études"],
  ["COMPANY", "Entreprise"],
  ["RESEARCH", "Structure de recherche"],
  ["OTHER", "Autre"],
] as const;
const orgType = z.enum(ORGANIZATION_TYPES.map(([k]) => k) as [string, ...string[]]);

export const signupSchema = z.object({
  name: reqText("Le nom", 120),
  email: z.string().trim().toLowerCase().email("Adresse email invalide."),
  password: z
    .string()
    .min(10, "Le mot de passe doit contenir au moins 10 caractères.")
    .max(200)
    .regex(/[A-Za-z]/, "Le mot de passe doit contenir au moins une lettre.")
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre."),
});

/** Inscription depuis le formulaire : acceptation explicite des conditions exigée. */
export const signupFormSchema = signupSchema.extend({
  terms: z.literal("on", { errorMap: () => ({ message: "Vous devez accepter les conditions d'utilisation." }) }),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse email invalide."),
  password: z.string().min(1, "Le mot de passe est obligatoire."),
});

export const organizationCreateSchema = z.object({
  name: reqText("Le nom de l'organisation"),
  shortName: optText(50),
  code: code,
  type: orgType,
  country: reqText("Le pays", 80),
  sectors: list,
  size: optText(50),
  defaultCurrency: currency,
});

export const organizationProfileSchema = organizationCreateSchema.omit({ code: true }).extend({
  description: optText(),
  region: optText(120),
  city: optText(120),
  address: optText(300),
  phone: optText(40),
  email: z.preprocess((v) => (v === "" ? undefined : v), z.string().email("Email invalide.").optional()),
  website: z.preprocess((v) => (v === "" ? undefined : v), z.string().url("URL invalide (https://…).").optional()),
  foundedYear: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.coerce.number().int().min(1800, "Année invalide.").max(new Date().getFullYear(), "Année invalide.").optional(),
  ),
  mission: optText(),
  vision: optText(),
  values: optText(),
});

export const UNIT_TYPES = [
  ["DIRECTORATE", "Direction"],
  ["DEPARTMENT", "Département"],
  ["SERVICE", "Service"],
  ["UNIT", "Unité"],
  ["BRANCH", "Antenne"],
  ["REGIONAL_OFFICE", "Bureau régional"],
  ["TEAM", "Équipe"],
  ["PROJECT_CELL", "Cellule de projet"],
] as const;

export const unitSchema = z.object({
  name: reqText("Le nom"),
  code: optText(30),
  type: z.enum(UNIT_TYPES.map(([k]) => k) as [string, ...string[]]),
  parentId: optId,
  description: optText(),
});

export const invitationSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse email invalide."),
  roleId: z.string().cuid("Rôle invalide."),
});

export const roleSchema = z.object({
  name: reqText("Le nom du rôle", 80),
  description: optText(300),
  permissions: z.preprocess((v) => (v === undefined ? [] : ([] as unknown[]).concat(v)), z.array(z.string())),
});

export const portfolioSchema = dateRange(
  z.object({
    name: reqText("Le nom"),
    code,
    description: optText(),
    objective: optText(),
    managerId: optId,
    startDate: optDate,
    endDate: optDate,
    plannedBudget: optAmount,
    currency,
    status: lifecycleStatus.default("DRAFT"),
  }),
);

export const programSchema = dateRange(
  z.object({
    name: reqText("Le nom"),
    code,
    portfolioId: optId,
    managerId: optId,
    coordinatorId: optId,
    sectors: list,
    zones: list,
    context: optText(),
    problemStatement: optText(),
    generalObjective: optText(),
    startDate: optDate,
    endDate: optDate,
    plannedBudget: optAmount,
    currency,
    status: lifecycleStatus.default("DRAFT"),
  }),
);

// Assistant de création de projet : chaque étape est validée séparément (brouillon progressif).
export const projectStepSchemas = {
  1: z.object({
    name: reqText("Le nom du projet"),
    code,
    portfolioId: optId,
    programId: optId,
    managerId: optId,
    type: optText(80),
    sectors: list,
    shortDescription: optText(500),
  }),
  2: z.object({
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
    sdgs: z.preprocess(
      (v) => (v === undefined ? [] : ([] as unknown[]).concat(v)),
      z.array(z.coerce.number().int().min(1).max(17)),
    ),
  }),
  3: z.object({ context: optText(), problemStatement: optText(), justification: optText() }),
  4: z.object({ generalObjective: optText(), specificObjectives: list }),
  5: z.object({
    country: optText(80),
    region: optText(120),
    zones: list,
    directBeneficiaries: optInt,
    indirectBeneficiaries: optInt,
  }),
  6: dateRange(z.object({ startDate: optDate, endDate: optDate })),
  7: z.object({ plannedBudget: optAmount, currency }),
} as const;
export type ProjectStep = keyof typeof projectStepSchemas;
export const PROJECT_STEPS = [
  { n: 1, label: "Identité" },
  { n: 2, label: "Positionnement" },
  { n: 3, label: "Contexte" },
  { n: 4, label: "Objectifs" },
  { n: 5, label: "Bénéficiaires & territoire" },
  { n: 6, label: "Période" },
  { n: 7, label: "Budget" },
  { n: 8, label: "Vérification" },
] as const;
export const PROJECT_LAST_EDIT_STEP = 7;

// Champs gérés par chaque étape (les autres champs du projet ne sont jamais touchés par l'étape).
export const PROJECT_STEP_FIELDS: Record<ProjectStep, readonly string[]> = {
  1: ["name", "code", "portfolioId", "programId", "managerId", "type", "sectors", "shortDescription"],
  2: ["priority", "sdgs"],
  3: ["context", "problemStatement", "justification"],
  4: ["generalObjective", "specificObjectives"],
  5: ["country", "region", "zones", "directBeneficiaries", "indirectBeneficiaries"],
  6: ["startDate", "endDate"],
  7: ["plannedBudget", "currency"],
};

// ───────────── Stratégie ─────────────
export const strategicPlanSchema = dateRange(
  z.object({
    title: reqText("Le titre", 200),
    reference: optText(60),
    startDate: optDate,
    endDate: optDate,
    context: optText(),
    vision: optText(),
    mission: optText(),
    status: lifecycleStatus.default("DRAFT"),
  }),
);

export const axisSchema = z.object({
  code,
  title: reqText("L'intitulé", 200),
  description: optText(),
  position: optInt,
});

export const objectiveSchema = z.object({
  axisId: z.string().cuid("Axe invalide."),
  code,
  title: reqText("L'intitulé", 300),
  description: optText(),
  expectedResult: optText(),
  ownerId: optId,
  position: optInt,
});

/**
 * Contributions d'un projet aux objectifs stratégiques, lues depuis le formulaire :
 * case « obj_<id> » cochée + champ « weight_<id> » (pourcentage, 100 par défaut).
 */
export function parseContributions(form: Record<string, unknown>) {
  const items: { objectiveId: string; weight: number }[] = [];
  for (const [k, v] of Object.entries(form)) {
    if (!k.startsWith("obj_") || v !== "on") continue;
    const id = k.slice(4);
    const raw = form[`weight_${id}`];
    const weight = raw === undefined || raw === "" ? 100 : Number(raw);
    items.push({ objectiveId: id, weight });
  }
  return items;
}

export const contributionsSchema = z
  .array(z.object({ objectiveId: z.string().cuid("Objectif invalide."), weight: z.number({ invalid_type_error: "Pourcentage invalide." }).int("Pourcentage entier attendu.").min(1, "Chaque contribution doit être d'au moins 1 %.").max(100, "Une contribution ne peut pas dépasser 100 %.") }))
  .max(30)
  .refine((items) => items.reduce((s, i) => s + i.weight, 0) <= 100, { message: "La somme des contributions d'un projet ne peut pas dépasser 100 %." });

// ───────────── Planification ─────────────
export const phaseSchema = z.object({ name: reqText("Le nom", 120), position: optInt });

export const activitySchema = dateRange(
  z.object({
    code: code,
    title: reqText("L'intitulé", 200),
    description: optText(),
    phaseId: optId,
    ownerId: optId,
    startDate: optDate,
    endDate: optDate,
    status: z.enum(["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELED"]).default("NOT_STARTED"),
    progress: z.preprocess((v) => (v === "" || v === undefined ? 0 : v), z.coerce.number().int().min(0, "Entre 0 et 100.").max(100, "Entre 0 et 100.")),
    position: optInt,
  }),
);

export const taskSchema = z.object({
  title: reqText("L'intitulé", 200),
  description: optText(),
  activityId: optId,
  assigneeId: optId,
  dueDate: optDate,
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).default("TODO"),
});

export const milestoneSchema = z.object({
  title: reqText("L'intitulé", 200),
  dueDate: z.coerce.date({ required_error: "La date est obligatoire.", invalid_type_error: "Date invalide." }),
});
