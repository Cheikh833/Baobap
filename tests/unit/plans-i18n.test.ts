import { describe, expect, it } from "vitest";
import { PLANS, subscriptionState, xofToEur } from "@/lib/plans";
import { LOCALES, negotiate } from "@/i18n/config";
import { fill, messagesFor } from "@/i18n/translate";
import fr from "@/i18n/messages/fr";
import en from "@/i18n/messages/en";
import { can } from "@/server/permissions/check";

const now = new Date("2026-06-15T12:00:00Z");
const d = (s: string) => new Date(`${s}T12:00:00Z`);

describe("état d'abonnement", () => {
  it("essai en cours puis lecture seule à la fin de l'essai", () => {
    expect(subscriptionState({ subscriptionStatus: "TRIALING", trialEndsAt: d("2026-06-20"), currentPeriodEnd: null }, now)).toEqual({ phase: "trial", daysLeft: 5, readOnly: false });
    expect(subscriptionState({ subscriptionStatus: "TRIALING", trialEndsAt: d("2026-06-10"), currentPeriodEnd: null }, now).readOnly).toBe(true);
  });
  it("abonnement actif, puis 7 jours de grâce, puis lecture seule", () => {
    expect(subscriptionState({ subscriptionStatus: "ACTIVE", trialEndsAt: null, currentPeriodEnd: d("2026-07-01") }, now).phase).toBe("active");
    expect(subscriptionState({ subscriptionStatus: "ACTIVE", trialEndsAt: null, currentPeriodEnd: d("2026-06-12") }, now).phase).toBe("grace");
    expect(subscriptionState({ subscriptionStatus: "ACTIVE", trialEndsAt: null, currentPeriodEnd: d("2026-06-01") }, now).readOnly).toBe(true);
  });
  it("résilié : pas de période de grâce après la fin de période", () => {
    expect(subscriptionState({ subscriptionStatus: "CANCELED", trialEndsAt: null, currentPeriodEnd: d("2026-06-12") }, now).readOnly).toBe(true);
  });
  it("lecture seule : consultation permise, écriture refusée même pour le propriétaire", () => {
    const ctx = { roleKey: "ORG_OWNER", permissions: new Set<string>(), readOnly: true };
    expect(can(ctx, "project:view")).toBe(true);
    expect(can(ctx, "project:create")).toBe(false);
  });
});

describe("catalogue des tarifs", () => {
  it("annuel = 10 mois (2 mois offerts) et équivalent euro à parité fixe", () => {
    for (const p of PLANS) if (p.monthlyXof !== null) expect(p.yearlyXof).toBe(p.monthlyXof * 10);
    expect(xofToEur(655_957)).toBe(1000);
  });
  it("chaque fonctionnalité de plan a un libellé dans chaque langue complète", () => {
    for (const p of PLANS) for (const f of p.features) expect(messagesFor("en").plans.features[f.key]).toBeTruthy();
  });
});

describe("langues", () => {
  it("négociation Accept-Language avec repli sur le français", () => {
    expect(negotiate("en-US,en;q=0.9,fr;q=0.8")).toBe("en");
    expect(negotiate("de-DE,wo;q=0.5")).toBe("wo");
    expect(negotiate("de-DE")).toBe("fr");
    expect(negotiate(undefined)).toBe("fr");
  });
  it("une langue « complete » couvre toutes les clés du français", () => {
    const keys = (o: unknown, p = ""): string[] =>
      Array.isArray(o) || typeof o !== "object" || o === null ? [p] : Object.entries(o).flatMap(([k, v]) => keys(v, p ? `${p}.${k}` : k));
    const complete = LOCALES.filter((l) => l.status === "complete" && l.code === "en");
    expect(complete.length).toBe(1);
    expect(keys(en).sort()).toEqual(keys(fr).sort());
  });
  it("une langue bêta retombe sur le français pour les clés manquantes", () => {
    const wo = messagesFor("wo");
    expect(wo.common.signIn).toBe("Dugg");
    expect(wo.dashboard.title).toBe(fr.dashboard.title);
  });
  it("remplacement des variables", () => {
    expect(fill("Fin le {date} ({n})", { date: "1 mai", n: 3 })).toBe("Fin le 1 mai (3)");
  });
});
