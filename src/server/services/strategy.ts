import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { AppError, notFound } from "@/server/errors";
import { audit, diff } from "@/server/audit";
import { assertCan, can, type TenantContext } from "@/server/permissions/check";
import { axisSchema, contributionsSchema, objectiveSchema, strategicPlanSchema } from "@/lib/validation/schemas";
import { assertMember } from "./guards";

type Tx = Prisma.TransactionClient;
const live = (ctx: TenantContext) => ({ organizationId: ctx.organizationId, deletedAt: null });

// ───────────── Plans ─────────────

export async function listPlans(ctx: TenantContext) {
  assertCan(ctx, "strategy:view");
  return db.strategicPlan.findMany({
    where: live(ctx),
    include: { axes: { where: { deletedAt: null }, select: { _count: { select: { objectives: { where: { deletedAt: null } } } } } } },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
  });
}

const projectSelect = { id: true, code: true, name: true, status: true, plannedBudget: true, currency: true, deletedAt: true } as const;

export async function getPlan(ctx: TenantContext, id: string) {
  assertCan(ctx, "strategy:view");
  const plan = await db.strategicPlan.findFirst({
    where: { id, ...live(ctx) },
    include: {
      axes: {
        where: { deletedAt: null },
        orderBy: [{ position: "asc" }, { code: "asc" }],
        include: {
          objectives: {
            where: { deletedAt: null },
            orderBy: [{ position: "asc" }, { code: "asc" }],
            include: { contributions: { where: { project: { deletedAt: null } }, include: { project: { select: projectSelect } } } },
          },
        },
      },
    },
  });
  if (!plan) throw notFound("Plan stratégique introuvable.");
  return plan;
}

/** Une organisation n'a qu'un plan stratégique actif à la fois. */
async function assertSingleActive(tx: Tx, ctx: TenantContext, status: string, exceptId?: string) {
  if (status !== "ACTIVE") return;
  const other = await tx.strategicPlan.findFirst({ where: { ...live(ctx), status: "ACTIVE", ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { title: true } });
  if (other) throw new AppError("CONFLICT", `Un autre plan stratégique est déjà actif (« ${other.title} »). Clôturez-le avant d'en activer un nouveau.`);
}

export async function createPlan(ctx: TenantContext, input: unknown) {
  assertCan(ctx, "strategy:create");
  const data = strategicPlanSchema.parse(input);
  return db.$transaction(async (tx) => {
    await assertSingleActive(tx, ctx, data.status);
    const p = await tx.strategicPlan.create({ data: { ...data, organizationId: ctx.organizationId, createdById: ctx.userId, updatedById: ctx.userId } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "strategy.plan.create", entityType: "StrategicPlan", entityId: p.id, summary: `Création du plan stratégique « ${p.title} »` });
    return p;
  });
}

export async function updatePlan(ctx: TenantContext, id: string, input: unknown) {
  assertCan(ctx, "strategy:edit");
  const data = strategicPlanSchema.parse(input);
  return db.$transaction(async (tx) => {
    const before = await tx.strategicPlan.findFirst({ where: { id, ...live(ctx) } });
    if (!before) throw notFound("Plan stratégique introuvable.");
    await assertSingleActive(tx, ctx, data.status, id);
    const full = { reference: null, startDate: null, endDate: null, context: null, vision: null, mission: null, ...data };
    const p = await tx.strategicPlan.update({ where: { id }, data: { ...full, updatedById: ctx.userId } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "strategy.plan.update", entityType: "StrategicPlan", entityId: id, summary: `Modification du plan stratégique « ${p.title} »`, changes: diff(before, full) });
    return p;
  });
}

export async function deletePlan(ctx: TenantContext, id: string) {
  assertCan(ctx, "strategy:delete");
  const p = await db.strategicPlan.findFirst({ where: { id, ...live(ctx) } });
  if (!p) throw notFound("Plan stratégique introuvable.");
  if (p.status === "ACTIVE") throw new AppError("CONFLICT", "Un plan actif ne peut pas être supprimé : clôturez-le d'abord.");
  await db.$transaction(async (tx) => {
    await tx.strategicPlan.update({ where: { id }, data: { deletedAt: new Date(), updatedById: ctx.userId } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "strategy.plan.delete", entityType: "StrategicPlan", entityId: id, summary: `Suppression (archivage logique) du plan « ${p.title} »` });
  });
}

// ───────────── Axes ─────────────

async function loadPlan(tx: Tx, ctx: TenantContext, planId: string) {
  const p = await tx.strategicPlan.findFirst({ where: { id: planId, ...live(ctx) } });
  if (!p) throw notFound("Plan stratégique introuvable.");
  return p;
}

async function assertAxisCodeFree(tx: Tx, planId: string, code: string, exceptId?: string) {
  const c = await tx.strategicAxis.findFirst({ where: { planId, code, deletedAt: null, ...(exceptId ? { id: { not: exceptId } } : {}) } });
  if (c) throw new AppError("CONFLICT", "Ce code d'axe est déjà utilisé dans ce plan.");
}

export async function createAxis(ctx: TenantContext, planId: string, input: unknown) {
  assertCan(ctx, "strategy:edit");
  const data = axisSchema.parse(input);
  return db.$transaction(async (tx) => {
    await loadPlan(tx, ctx, planId);
    await assertAxisCodeFree(tx, planId, data.code);
    const a = await tx.strategicAxis.create({ data: { ...data, position: data.position ?? 0, planId, organizationId: ctx.organizationId } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "strategy.axis.create", entityType: "StrategicAxis", entityId: a.id, summary: `Axe ${a.code} « ${a.title} » ajouté` });
    return a;
  });
}

async function loadAxis(tx: Tx, ctx: TenantContext, id: string) {
  const a = await tx.strategicAxis.findFirst({ where: { id, ...live(ctx), plan: { deletedAt: null } } });
  if (!a) throw notFound("Axe introuvable.");
  return a;
}

export async function updateAxis(ctx: TenantContext, id: string, input: unknown) {
  assertCan(ctx, "strategy:edit");
  const data = axisSchema.parse(input);
  return db.$transaction(async (tx) => {
    const before = await loadAxis(tx, ctx, id);
    await assertAxisCodeFree(tx, before.planId, data.code, id);
    const full = { description: null, ...data, position: data.position ?? 0 };
    const a = await tx.strategicAxis.update({ where: { id }, data: full });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "strategy.axis.update", entityType: "StrategicAxis", entityId: id, summary: `Axe ${a.code} modifié`, changes: diff(before, full) });
    return a;
  });
}

export async function deleteAxis(ctx: TenantContext, id: string) {
  assertCan(ctx, "strategy:delete");
  await db.$transaction(async (tx) => {
    const a = await loadAxis(tx, ctx, id);
    const n = await tx.strategicObjective.count({ where: { axisId: id, deletedAt: null } });
    if (n) throw new AppError("CONFLICT", "Cet axe contient des objectifs : supprimez-les ou déplacez-les d'abord.");
    await tx.strategicAxis.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "strategy.axis.delete", entityType: "StrategicAxis", entityId: id, summary: `Axe ${a.code} supprimé` });
  });
}

// ───────────── Objectifs ─────────────

async function assertObjectiveCodeFree(tx: Tx, planId: string, code: string, exceptId?: string) {
  const c = await tx.strategicObjective.findFirst({ where: { code, deletedAt: null, axis: { planId, deletedAt: null }, ...(exceptId ? { id: { not: exceptId } } : {}) } });
  if (c) throw new AppError("CONFLICT", "Ce code d'objectif est déjà utilisé dans ce plan.");
}

export async function createObjective(ctx: TenantContext, input: unknown) {
  assertCan(ctx, "strategy:edit");
  const data = objectiveSchema.parse(input);
  return db.$transaction(async (tx) => {
    const axis = await loadAxis(tx, ctx, data.axisId);
    await assertObjectiveCodeFree(tx, axis.planId, data.code);
    await assertMember(tx, ctx.organizationId, data.ownerId, "Le responsable");
    const o = await tx.strategicObjective.create({ data: { ...data, position: data.position ?? 0, organizationId: ctx.organizationId } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "strategy.objective.create", entityType: "StrategicObjective", entityId: o.id, summary: `Objectif ${o.code} « ${o.title} » ajouté` });
    return o;
  });
}

async function loadObjective(tx: Tx, ctx: TenantContext, id: string) {
  const o = await tx.strategicObjective.findFirst({ where: { id, ...live(ctx), axis: { deletedAt: null, plan: { deletedAt: null } } }, include: { axis: true } });
  if (!o) throw notFound("Objectif introuvable.");
  return o;
}

export async function updateObjective(ctx: TenantContext, id: string, input: unknown) {
  assertCan(ctx, "strategy:edit");
  const data = objectiveSchema.parse(input);
  return db.$transaction(async (tx) => {
    const before = await loadObjective(tx, ctx, id);
    const axis = await loadAxis(tx, ctx, data.axisId);
    if (axis.planId !== before.axis.planId) throw new AppError("VALIDATION", "Un objectif ne peut être déplacé que vers un axe du même plan.");
    await assertObjectiveCodeFree(tx, axis.planId, data.code, id);
    await assertMember(tx, ctx.organizationId, data.ownerId, "Le responsable");
    const full = { description: null, expectedResult: null, ownerId: null, ...data, position: data.position ?? 0 };
    const o = await tx.strategicObjective.update({ where: { id }, data: full });
    const { axis: _axis, ...plain } = before;
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "strategy.objective.update", entityType: "StrategicObjective", entityId: id, summary: `Objectif ${o.code} modifié`, changes: diff(plain, full) });
    return o;
  });
}

export async function deleteObjective(ctx: TenantContext, id: string) {
  assertCan(ctx, "strategy:delete");
  await db.$transaction(async (tx) => {
    const o = await loadObjective(tx, ctx, id);
    const n = await tx.projectObjectiveContribution.count({ where: { objectiveId: id, project: { deletedAt: null } } });
    if (n) throw new AppError("CONFLICT", "Des projets contribuent à cet objectif : retirez d'abord leurs contributions.");
    await tx.strategicObjective.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "strategy.objective.delete", entityType: "StrategicObjective", entityId: id, summary: `Objectif ${o.code} supprimé` });
  });
}

// ───────────── Contributions des projets ─────────────

/** Objectifs proposés dans la fiche projet : plans non archivés, du plus récent au plus ancien. */
export async function objectiveOptions(ctx: TenantContext) {
  return db.strategicPlan.findMany({
    where: { ...live(ctx), status: { notIn: ["ARCHIVED", "CLOSED"] } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true, title: true, status: true,
      axes: {
        where: { deletedAt: null }, orderBy: [{ position: "asc" }, { code: "asc" }],
        select: { id: true, code: true, title: true, objectives: { where: { deletedAt: null }, orderBy: [{ position: "asc" }, { code: "asc" }], select: { id: true, code: true, title: true } } },
      },
    },
  });
}

/**
 * Remplace les contributions d'un projet (dans la transaction de l'enregistrement de l'étape).
 * Objectifs de la même organisation uniquement ; somme des poids ≤ 100 %.
 */
export async function setProjectContributions(tx: Tx, ctx: TenantContext, projectId: string, items: unknown) {
  const list = contributionsSchema.parse(items);
  const ids = list.map((i) => i.objectiveId);
  if (new Set(ids).size !== ids.length) throw new AppError("VALIDATION", "Objectif sélectionné plusieurs fois.");
  const found = await tx.strategicObjective.count({ where: { id: { in: ids }, ...live(ctx), axis: { deletedAt: null, plan: { deletedAt: null } } } });
  if (found !== ids.length) throw new AppError("VALIDATION", "Objectif stratégique introuvable dans cette organisation.");
  const before = await tx.projectObjectiveContribution.findMany({ where: { projectId }, select: { objectiveId: true, weight: true } });
  await tx.projectObjectiveContribution.deleteMany({ where: { projectId } });
  if (list.length) await tx.projectObjectiveContribution.createMany({ data: list.map((i) => ({ projectId, objectiveId: i.objectiveId, weight: i.weight })) });
  const key = (a: { objectiveId: string; weight: number }[]) => JSON.stringify([...a].sort((x, y) => x.objectiveId.localeCompare(y.objectiveId)));
  return key(before) !== key(list) ? { from: before, to: list } : null;
}

export async function getProjectContributions(ctx: TenantContext, projectId: string) {
  return db.projectObjectiveContribution.findMany({
    where: { projectId, project: { organizationId: ctx.organizationId }, objective: { deletedAt: null } },
    include: { objective: { select: { id: true, code: true, title: true, axis: { select: { code: true, plan: { select: { id: true, title: true } } } } } } },
  });
}

/** Projets non archivés qui ne contribuent à aucun objectif du plan. */
export async function unalignedProjects(ctx: TenantContext, planId: string) {
  assertCan(ctx, "strategy:view");
  return db.project.findMany({
    where: {
      ...live(ctx),
      status: { notIn: ["ARCHIVED", "CLOSED"] },
      objectiveContributions: { none: { objective: { deletedAt: null, axis: { planId, deletedAt: null } } } },
    },
    select: { id: true, code: true, name: true, status: true },
    orderBy: { code: "asc" },
  });
}

/** Résumé du plan actif pour le tableau de bord (null si aucun plan actif). */
export async function activePlanSummary(ctx: TenantContext) {
  if (!can(ctx, "strategy:view")) return null;
  const p = await db.strategicPlan.findFirst({ where: { ...live(ctx), status: "ACTIVE" }, select: { id: true } });
  return p ? getPlan(ctx, p.id) : null;
}
