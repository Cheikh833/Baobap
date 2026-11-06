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

// ───────────── Suivi-évaluation ─────────────
const optDecimal = z.preprocess(
  (v) => (typeof v === "string" ? (v.replace(/\s/g, "").replace(",", ".") === "" ? undefined : v.replace(/\s/g, "").replace(",", ".")) : v),
  z.coerce.number({ invalid_type_error: "Nombre invalide." }).finite("Nombre invalide.").optional(),
);

export const logframeItemSchema = z.object({
  level: z.enum(["IMPACT", "OUTCOME", "OUTPUT", "ACTIVITY"]),
  parentId: optId,
  code: code,
  title: reqText("L'intitulé", 300),
  description: optText(),
  assumptions: optText(),
  position: optInt,
});

export const indicatorSchema = z
  .object({
    code: code,
    name: reqText("Le nom de l'indicateur", 300),
    definition: reqText("La définition", 2000),
    unit: reqText("L'unité", 60),
    logframeItemId: optId,
    type: z.enum(["QUANTITATIVE", "QUALITATIVE"]).default("QUANTITATIVE"),
    direction: z.enum(["INCREASE", "DECREASE"]).default("INCREASE"),
    aggregation: z.enum(["LATEST", "SUM"]).default("LATEST"),
    baseline: optDecimal,
    baselineDate: optDate,
    target: optDecimal,
    targetDate: optDate,
    frequency: z.enum(["MONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL", "ONE_TIME"]).default("QUARTERLY"),
    source: optText(300),
    method: optText(500),
    responsibleId: optId,
    // Une dimension par ligne : « Sexe : Femmes, Hommes »
    disaggregations: z.preprocess(
      (v) => (typeof v === "string" ? v.split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : v ?? []),
      z.array(z.string().max(300).regex(/^[^:]+:\s*[^,]+(,[^,]+)+$/, "Ventilation : « Dimension : catégorie 1, catégorie 2 » (au moins deux catégories).")).max(8),
    ),
  })
  .refine((d) => !d.baselineDate || !d.targetDate || d.targetDate >= d.baselineDate, { message: "La date cible doit être postérieure à la date de référence.", path: ["targetDate"] })
  .refine((d) => d.baseline === undefined || d.target === undefined || d.direction !== "INCREASE" || d.target >= d.baseline, { message: "Pour un indicateur à augmenter, la cible doit être supérieure ou égale à la référence.", path: ["target"] })
  .refine((d) => d.baseline === undefined || d.target === undefined || d.direction !== "DECREASE" || d.target <= d.baseline, { message: "Pour un indicateur à faire baisser, la cible doit être inférieure ou égale à la référence.", path: ["target"] });

export const indicatorValueSchema = z
  .object({
    periodStart: z.coerce.date({ required_error: "Le début de période est obligatoire.", invalid_type_error: "Date invalide." }),
    periodEnd: z.coerce.date({ required_error: "La fin de période est obligatoire.", invalid_type_error: "Date invalide." }),
    value: optDecimal,
    textValue: optText(2000),
    source: reqText("La source", 300),
    comment: optText(1000),
    disaggregation: z.record(z.record(z.number())).optional(),
  })
  .refine((d) => d.periodEnd >= d.periodStart, { message: "La fin de période doit suivre le début.", path: ["periodEnd"] });

/** Ventilations saisies dans le formulaire : champs « dis__<dimension>__<catégorie> ». */
export function parseDisaggregation(form: Record<string, unknown>) {
  const out: Record<string, Record<string, number>> = {};
  for (const [k, v] of Object.entries(form)) {
    if (!k.startsWith("dis__") || v === "" || v === undefined) continue;
    const [, dim, cat] = k.split("__");
    const n = Number(String(v).replace(/\s/g, "").replace(",", "."));
    if (!dim || !cat || !Number.isFinite(n)) continue;
    (out[dim] ??= {})[cat] = n;
  }
  return Object.keys(out).length ? out : undefined;
}

// ───────────── Finances & risques ─────────────

const reqAmount = (label: string) => z.preprocess(
  (v) => (typeof v === "string" ? (v.replace(/[\s  ]/g, "").replace(",", ".") || undefined) : v),
  z.coerce.number({ required_error: `${label} est obligatoire.`, invalid_type_error: "Montant invalide." }).finite("Montant invalide.").min(0, "Le montant doit être positif.").max(1e15),
);

export const fundingSchema = dateRange(z.object({
  donor: reqText("Le bailleur", 200),
  reference: optText(120),
  amount: reqAmount("Le montant"),
  startDate: optDate,
  endDate: optDate,
  notes: optText(1000),
}));

export const BUDGET_CATEGORIES = ["HR", "TRAVEL", "EQUIPMENT", "SUPPLIES", "SERVICES", "ACTIVITIES", "OPERATING", "INDIRECT", "OTHER"] as const;
export const budgetLineSchema = z.object({
  code: code,
  label: reqText("L'intitulé", 200),
  category: z.enum(BUDGET_CATEGORIES).default("ACTIVITIES"),
  plannedAmount: reqAmount("Le montant prévu"),
  fundingId: optId,
  notes: optText(1000),
});

export const expenseSchema = z.object({
  budgetLineId: z.string({ required_error: "La ligne budgétaire est obligatoire." }).cuid("La ligne budgétaire est obligatoire."),
  date: z.coerce.date({ required_error: "La date est obligatoire.", invalid_type_error: "Date invalide." }),
  amount: reqAmount("Le montant").refine((x) => x > 0, "Le montant doit être supérieur à zéro."),
  description: reqText("La description", 300),
  supplier: optText(200),
  reference: optText(100),
});

export const RISK_CATEGORIES = ["STRATEGIC", "OPERATIONAL", "FINANCIAL", "SECURITY", "COMPLIANCE", "REPUTATION", "ENVIRONMENTAL", "OTHER"] as const;
const scale = (label: string) => z.coerce.number({ invalid_type_error: `${label} : choisissez une valeur de 1 à 5.` }).int().min(1, `${label} : choisissez une valeur de 1 à 5.`).max(5, `${label} : choisissez une valeur de 1 à 5.`);
export const riskSchema = z.object({
  code: code,
  title: reqText("L'intitulé", 200),
  description: optText(2000),
  category: z.enum(RISK_CATEGORIES).default("OPERATIONAL"),
  probability: scale("Probabilité"),
  impact: scale("Impact"),
  ownerId: optId,
  mitigation: optText(2000),
  contingency: optText(2000),
  status: z.enum(["OPEN", "MITIGATING", "CLOSED"]).default("OPEN"),
  reviewDate: optDate,
});

// ───────────── Équipe projet et parties prenantes ─────────────

export const projectMemberSchema = dateRange(z.object({
  userId: z.string({ required_error: "Choisissez un membre." }).cuid("Choisissez un membre."),
  role: reqText("Le rôle dans le projet", 120),
  allocation: z.preprocess((v) => (v === "" || v === undefined ? undefined : v), z.coerce.number().int("Nombre entier attendu.").min(1, "Affectation entre 1 et 100 %.").max(100, "Affectation entre 1 et 100 %.").optional()),
  startDate: optDate,
  endDate: optDate,
}));

export const STAKEHOLDER_TYPES = ["DONOR", "GOVERNMENT", "LOCAL_AUTHORITY", "COMMUNITY", "BENEFICIARY", "PARTNER", "PRIVATE", "MEDIA", "OTHER"] as const;
const level3 = (label: string) => z.coerce.number({ invalid_type_error: `${label} : choisissez une valeur de 1 à 3.` }).int().min(1, `${label} : choisissez une valeur de 1 à 3.`).max(3, `${label} : choisissez une valeur de 1 à 3.`);
export const stakeholderSchema = z.object({
  name: reqText("Le nom", 200),
  type: z.enum(STAKEHOLDER_TYPES).default("PARTNER"),
  organization: optText(200),
  influence: level3("Influence"),
  interest: level3("Intérêt"),
  contactName: optText(120),
  email: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().email("Adresse email invalide.").max(200).optional()),
  phone: optText(40),
  engagement: optText(2000),
});

// ───────────── Documents & connaissances ─────────────

export const DOCUMENT_CATEGORIES = ["REPORT", "CONTRACT", "AGREEMENT", "TERMS_OF_REFERENCE", "MINUTES", "PROCEDURE", "DATA", "PHOTO", "OTHER"] as const;
export const documentSchema = z.object({
  title: reqText("Le titre", 200),
  description: optText(2000),
  category: z.enum(DOCUMENT_CATEGORIES).default("OTHER"),
  tags: list,
  projectId: optId,
});

export const KNOWLEDGE_CATEGORIES = ["LESSON", "PROCEDURE", "GUIDE", "FAQ", "OTHER"] as const;
export const knowledgeSchema = z.object({
  title: reqText("Le titre", 200),
  category: z.enum(KNOWLEDGE_CATEGORIES).default("LESSON"),
  body: reqText("Le contenu", 20000),
  tags: list,
  projectId: optId,
});
