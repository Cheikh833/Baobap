// Catalogue des plans BAOBAB — source unique pour la page Tarifs, la page Abonnement et les limites.
// Justification des prix : docs/product/tarification.md.

export type PlanCode = "ESSENTIEL" | "PROFESSIONNEL" | "INSTITUTION" | "ENTREPRISE";
export type Cycle = "MONTHLY" | "YEARLY";

export const TRIAL_DAYS = 30;
export const GRACE_DAYS = 7;
/** Parité fixe franc CFA (UEMOA/CEMAC) ↔ euro : l'équivalence en euros est donc exacte et stable. */
export const XOF_PER_EUR = 655.957;

import fr, { type Messages } from "@/i18n/messages/fr";

export type FeatureKey = keyof Messages["plans"]["features"];
export type Feature = { key: FeatureKey; available: boolean };

export type Plan = {
  code: PlanCode;
  /** Prix mensuel en FCFA (null = sur devis). */
  monthlyXof: number | null;
  /** Prix annuel en FCFA : 10 mois payés pour 12 (2 mois offerts). */
  yearlyXof: number | null;
  limits: {
    /** Membres comptés (hors bailleurs et partenaires en lecture seule, toujours gratuits). null = illimité. */
    members: number | null;
    /** Projets non archivés. null = illimité. */
    projects: number | null;
    storageGb: number | null;
    aiRequestsPerMonth: number | null;
  };
  features: Feature[];
  highlighted?: boolean;
};

const yes = (key: FeatureKey): Feature => ({ key, available: true });
const soon = (key: FeatureKey): Feature => ({ key, available: false });

const CORE = [
  yes("core_org"),
  yes("core_projects"),
  yes("core_dashboard"),
  yes("core_donors"),
];

export const PLANS: Plan[] = [
  {
    code: "ESSENTIEL",
    monthlyXof: 15_000,
    yearlyXof: 150_000,
    limits: { members: 5, projects: 10, storageGb: 5, aiRequestsPerMonth: 100 },
    features: [...CORE, yes("planning"), yes("meal_basic"), soon("ai_100")],
  },
  {
    code: "PROFESSIONNEL",
    monthlyXof: 49_000,
    yearlyXof: 490_000,
    limits: { members: 25, projects: null, storageGb: 50, aiRequestsPerMonth: 1_000 },
    features: [
      ...CORE,
      yes("planning"),
      yes("meal_full"),
      yes("fin_risk_docs"),
      yes("analytics"),
      soon("ai_1000"),
      soon("studio"),
    ],
    highlighted: true,
  },
  {
    code: "INSTITUTION",
    monthlyXof: 149_000,
    yearlyXof: 1_490_000,
    limits: { members: 100, projects: null, storageGb: 250, aiRequestsPerMonth: 5_000 },
    features: [
      ...CORE,
      soon("all_pro"),
      soon("consolidation"),
      soon("sharing"),
      soon("sso"),
      soon("ai_5000"),
    ],
  },
  {
    code: "ENTREPRISE",
    monthlyXof: null,
    yearlyXof: null,
    limits: { members: null, projects: null, storageGb: null, aiRequestsPerMonth: null },
    features: [
      ...CORE,
      soon("unlimited"),
      soon("sovereign"),
      soon("integrations"),
      soon("support"),
    ],
  },
];

export const TRIAL_PLAN: PlanCode = "PROFESSIONNEL";
export const SOLIDARITY_DISCOUNT = 0.3;

export const getPlan = (code: string) => PLANS.find((p) => p.code === code) ?? PLANS[1];

export const xofToEur = (xof: number) => Math.round(xof / XOF_PER_EUR);

export type SubscriptionState = {
  phase: "trial" | "active" | "grace" | "expired";
  /** Jours restants dans la phase actuelle (essai, période payée ou grâce). */
  daysLeft: number | null;
  readOnly: boolean;
};

type SubInput = { subscriptionStatus: string; trialEndsAt: Date | null; currentPeriodEnd: Date | null };

const days = (to: Date, now: Date) => Math.max(0, Math.ceil((to.getTime() - now.getTime()) / 86_400_000));

/**
 * État effectif de l'abonnement :
 * - essai en cours → accès complet ; essai terminé sans abonnement → lecture seule ;
 * - abonnement payé → accès complet jusqu'à la fin de période, puis 7 jours de grâce, puis lecture seule ;
 * - résilié → accès complet jusqu'à la fin de la période payée, puis lecture seule.
 * La lecture seule ne supprime jamais de données : l'organisation garde l'accès en consultation.
 */
export function subscriptionState(o: SubInput, now = new Date()): SubscriptionState {
  if (o.subscriptionStatus === "TRIALING") {
    if (o.trialEndsAt && o.trialEndsAt > now) return { phase: "trial", daysLeft: days(o.trialEndsAt, now), readOnly: false };
    return { phase: "expired", daysLeft: 0, readOnly: true };
  }
  const end = o.currentPeriodEnd;
  if (!end || end > now) {
    if (o.subscriptionStatus === "PAST_DUE" && end) return { phase: "grace", daysLeft: days(end, now), readOnly: false };
    return { phase: "active", daysLeft: end ? days(end, now) : null, readOnly: false };
  }
  if (o.subscriptionStatus !== "CANCELED") {
    const graceEnd = new Date(end.getTime() + GRACE_DAYS * 86_400_000);
    if (graceEnd > now) return { phase: "grace", daysLeft: days(graceEnd, now), readOnly: false };
  }
  return { phase: "expired", daysLeft: 0, readOnly: true };
}

/** Nom français du plan (journal d'audit, messages serveur). L'interface utilise le dictionnaire de la langue active. */
export const planName = (code: string) => fr.plans[getPlan(code).code].name;
