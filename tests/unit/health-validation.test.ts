import { describe, expect, it } from "vitest";
import { completeness, projectHealth } from "@/lib/project-health";
import { organizationCreateSchema, portfolioSchema, projectStepSchemas, signupSchema } from "@/lib/validation/schemas";
import { safeNext } from "@/lib/safe-next";
import { can } from "@/server/permissions/check";
import { ALL_PERMISSIONS, SYSTEM_ROLES } from "@/server/permissions/catalog";

const base = {
  status: "ACTIVE", startDate: null, endDate: null, name: "P", code: "P1", managerId: null, generalObjective: null, context: null,
  plannedBudget: null, shortDescription: null, specificObjectives: [], country: null, directBeneficiaries: null,
};

describe("santé du projet", () => {
  it("planning non évalué sans dates, jamais inventé", () => {
    const h = projectHealth(base);
    expect(h.find((x) => x.key === "planning")!.level).toBe("unknown");
    expect(h.filter((x) => ["budget", "indicators", "risks", "activities"].includes(x.key)).every((x) => x.level === "unknown")).toBe(true);
  });
  it("planning critique si en retard", () => {
    const h = projectHealth({ ...base, startDate: new Date("2025-01-01"), endDate: new Date("2025-06-01") }, new Date("2026-01-01"));
    expect(h[0].level).toBe("critical");
  });
  it("complétude", () => {
    expect(completeness(base).pct).toBe(0);
    expect(completeness({ ...base, managerId: "x", specificObjectives: ["a"] }).pct).toBe(20);
  });
});

describe("validation", () => {
  it("mot de passe robuste exigé", () => {
    expect(signupSchema.safeParse({ name: "A", email: "a@b.sn", password: "court" }).success).toBe(false);
    expect(signupSchema.safeParse({ name: "A", email: "a@b.sn", password: "motdepasse12" }).success).toBe(true);
  });
  it("code normalisé en majuscules et format contrôlé", () => {
    const r = organizationCreateSchema.parse({ name: "Org", code: "asdev-1", type: "NGO_NATIONAL", country: "Sénégal" });
    expect(r.code).toBe("ASDEV-1");
    expect(organizationCreateSchema.safeParse({ name: "Org", code: "a b", type: "NGO_NATIONAL", country: "SN" }).success).toBe(false);
  });
  it("date de fin postérieure au début", () => {
    const r = portfolioSchema.safeParse({ name: "P", code: "PF", startDate: "2026-05-01", endDate: "2026-01-01" });
    expect(r.success).toBe(false);
  });
  it("champs facultatifs vides ne bloquent pas", () => {
    const r = projectStepSchemas[5].parse({ country: "", region: "", zones: "", directBeneficiaries: "", indirectBeneficiaries: "" });
    expect(r).toEqual({ country: undefined, region: undefined, zones: [], directBeneficiaries: undefined, indirectBeneficiaries: undefined });
  });
  it("montants avec espaces et virgule", () => {
    expect(projectStepSchemas[7].parse({ plannedBudget: "1 250 000,50", currency: "XOF" }).plannedBudget).toBe(1250000.5);
  });
});

describe("sécurité", () => {
  it("safeNext refuse les redirections externes", () => {
    expect(safeNext("/invitation/abc")).toBe("/invitation/abc");
    expect(safeNext("//evil.com")).toBeNull();
    expect(safeNext("https://evil.com")).toBeNull();
    expect(safeNext("/\\evil.com")).toBeNull();
  });
  it("le propriétaire a tous les droits ; le lecteur aucun droit d'écriture", () => {
    expect(can({ roleKey: "ORG_OWNER", permissions: new Set() }, "members:manage")).toBe(true);
    const viewer = SYSTEM_ROLES.find((r) => r.key === "VIEWER")!;
    expect(viewer.permissions.some((p) => /:(create|edit|delete|manage|approve)$/.test(p))).toBe(false);
  });
  it("les rôles système n'utilisent que des permissions du catalogue", () => {
    for (const r of SYSTEM_ROLES) for (const p of r.permissions) expect(ALL_PERMISSIONS).toContain(p);
  });
});
