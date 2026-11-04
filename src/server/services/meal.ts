import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { AppError, forbidden, notFound } from "@/server/errors";
import { audit, diff } from "@/server/audit";
import { assertCan, can, type TenantContext } from "@/server/permissions/check";
import { OWNER_ROLE_KEY } from "@/server/permissions/catalog";
import { indicatorSchema, indicatorValueSchema, logframeItemSchema } from "@/lib/validation/schemas";
import { achievementRate, currentValue, disaggregationIssues, expectedRate, isStale, parseDimensions, toNum, trackStatus, type MValue } from "@/lib/meal";
import { assertMember } from "./guards";

type Tx = Prisma.TransactionClient;
const alive = { deletedAt: null };
const PARENT_LEVEL: Record<string, string | null> = { IMPACT: null, OUTCOME: "IMPACT", OUTPUT: "OUTCOME", ACTIVITY: "OUTPUT" };

async function loadProject(tx: Tx | typeof db, ctx: TenantContext, projectId: string) {
  const p = await tx.project.findFirst({ where: { id: projectId, organizationId: ctx.organizationId, deletedAt: null } });
  if (!p) throw notFound("Projet introuvable.");
  return p;
}
const log = (tx: Tx, ctx: TenantContext, action: string, entityType: string, entityId: string, summary: string, changes?: Prisma.InputJsonValue) =>
  audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action, entityType, entityId, summary, changes });

const valueInclude = { supersededBy: { select: { id: true, status: true } } } as const;

/** Convertit les valeurs Prisma (Decimal) pour les formules. */
const asM = (v: { id: string; periodStart: Date; periodEnd: Date; value: unknown; status: string; supersededBy?: { id: string; status: string } | null }): MValue =>
  ({ id: v.id, periodStart: v.periodStart, periodEnd: v.periodEnd, value: toNum(v.value), status: v.status, supersededBy: v.supersededBy ?? null });

/** Indicateur enrichi des calculs (valeur actuelle, taux, trajectoire, actualisation). */
export function computeIndicator<T extends { aggregation: string; baseline: unknown; target: unknown; baselineDate: Date | null; targetDate: Date | null; frequency: string; type: string; values: Parameters<typeof asM>[0][] }>(ind: T, now = new Date()) {
  const vals = ind.values.map(asM);
  const baseline = toNum(ind.baseline), target = toNum(ind.target);
  const current = currentValue(ind, vals);
  const rate = achievementRate(baseline, target, current);
  const expected = expectedRate(ind.baselineDate, ind.targetDate, now);
  return { baseline, target, current, rate, expected, status: trackStatus(rate, expected), stale: isStale(ind, vals, now), pending: ind.values.filter((v) => v.status === "DRAFT").length };
}

// ───────────── Cadre logique ─────────────

export async function getLogframe(ctx: TenantContext, projectId: string) {
  assertCan(ctx, "meal:view");
  const project = await loadProject(db, ctx, projectId);
  const [items, indicators] = await Promise.all([
    db.logframeItem.findMany({ where: { projectId, ...alive }, orderBy: [{ position: "asc" }, { code: "asc" }] }),
    db.indicator.findMany({ where: { projectId, ...alive }, include: { values: { include: valueInclude, orderBy: { periodEnd: "asc" } } }, orderBy: { code: "asc" } }),
  ]);
  return { project, items, indicators: indicators.map((i) => ({ ...i, calc: computeIndicator(i) })), checks: coherenceChecks(items, indicators) };
}

/** Cohérence verticale (Activités → Extrants → Effets → Impact) et horizontale (indicateurs, sources). */
export function coherenceChecks(items: { id: string; level: string; parentId: string | null; code: string }[], indicators: { logframeItemId: string | null; source: string | null; code: string }[]) {
  const issues: { code: string; kind: "orphan" | "noChild" | "noIndicator" | "noSource" | "noImpact" }[] = [];
  if (items.length && !items.some((i) => i.level === "IMPACT")) issues.push({ code: "—", kind: "noImpact" });
  for (const it of items) {
    if (it.level !== "IMPACT" && !it.parentId) issues.push({ code: it.code, kind: "orphan" });
    if (it.level !== "ACTIVITY" && !items.some((c) => c.parentId === it.id)) issues.push({ code: it.code, kind: "noChild" });
    if (it.level !== "ACTIVITY" && !indicators.some((ind) => ind.logframeItemId === it.id)) issues.push({ code: it.code, kind: "noIndicator" });
  }
  for (const ind of indicators) if (!ind.source) issues.push({ code: ind.code, kind: "noSource" });
  return issues;
}

async function checkItem(tx: Tx, ctx: TenantContext, projectId: string, data: ReturnType<typeof logframeItemSchema.parse>, exceptId?: string) {
  await loadProject(tx, ctx, projectId);
  const expected = PARENT_LEVEL[data.level];
  if (data.parentId) {
    const parent = await tx.logframeItem.findFirst({ where: { id: data.parentId, projectId, ...alive } });
    if (!parent) throw new AppError("VALIDATION", "Élément parent introuvable dans ce cadre logique.");
    if (parent.level !== expected) throw new AppError("VALIDATION", "Le parent doit être du niveau immédiatement supérieur (Activité → Extrant → Effet → Impact).");
    if (parent.id === exceptId) throw new AppError("VALIDATION", "Un élément ne peut pas être son propre parent.");
  } else if (expected === null && data.level !== "IMPACT") {
    throw new AppError("VALIDATION", "Niveau invalide.");
  }
  const dup = await tx.logframeItem.findFirst({ where: { projectId, code: data.code, ...alive, ...(exceptId ? { id: { not: exceptId } } : {}) } });
  if (dup) throw new AppError("CONFLICT", "Ce code est déjà utilisé dans le cadre logique.");
}

export async function createLogframeItem(ctx: TenantContext, projectId: string, input: unknown) {
  assertCan(ctx, "meal:edit");
  const data = logframeItemSchema.parse(input);
  return db.$transaction(async (tx) => {
    await checkItem(tx, ctx, projectId, data);
    const it = await tx.logframeItem.create({ data: { ...data, level: data.level as never, position: data.position ?? 0, projectId, organizationId: ctx.organizationId } });
    await log(tx, ctx, "meal.logframe.create", "LogframeItem", it.id, `Cadre logique : ${it.code} « ${it.title} » ajouté`);
    return it;
  });
}

export async function updateLogframeItem(ctx: TenantContext, id: string, input: unknown) {
  assertCan(ctx, "meal:edit");
  const data = logframeItemSchema.parse(input);
  return db.$transaction(async (tx) => {
    const before = await tx.logframeItem.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive } });
    if (!before) throw notFound("Élément introuvable.");
    if (data.level !== before.level && (await tx.logframeItem.count({ where: { parentId: id, ...alive } }))) throw new AppError("CONFLICT", "Impossible de changer le niveau d'un élément qui a des sous-éléments.");
    await checkItem(tx, ctx, before.projectId, data, id);
    const full = { parentId: null, description: null, assumptions: null, ...data, level: data.level as never, position: data.position ?? 0 };
    const it = await tx.logframeItem.update({ where: { id }, data: full });
    await log(tx, ctx, "meal.logframe.update", "LogframeItem", id, `Cadre logique : ${it.code} modifié`, diff(before, full));
    return it;
  });
}

export async function deleteLogframeItem(ctx: TenantContext, id: string) {
  assertCan(ctx, "meal:delete");
  await db.$transaction(async (tx) => {
    const it = await tx.logframeItem.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive } });
    if (!it) throw notFound("Élément introuvable.");
    if (await tx.logframeItem.count({ where: { parentId: id, ...alive } })) throw new AppError("CONFLICT", "Cet élément a des sous-éléments : supprimez-les d'abord.");
    if (await tx.indicator.count({ where: { logframeItemId: id, ...alive } })) throw new AppError("CONFLICT", "Des indicateurs sont rattachés à cet élément : rattachez-les ailleurs d'abord.");
    await tx.logframeItem.update({ where: { id }, data: { deletedAt: new Date() } });
    await log(tx, ctx, "meal.logframe.delete", "LogframeItem", id, `Cadre logique : ${it.code} supprimé`);
  });
}

// ───────────── Indicateurs ─────────────

async function checkIndicator(tx: Tx, ctx: TenantContext, projectId: string, data: ReturnType<typeof indicatorSchema.parse>, exceptId?: string) {
  await loadProject(tx, ctx, projectId);
  if (data.logframeItemId && !(await tx.logframeItem.findFirst({ where: { id: data.logframeItemId, projectId, ...alive } }))) throw new AppError("VALIDATION", "Élément du cadre logique introuvable dans ce projet.");
  await assertMember(tx, ctx.organizationId, data.responsibleId, "Le responsable");
  const dup = await tx.indicator.findFirst({ where: { projectId, code: data.code, ...alive, ...(exceptId ? { id: { not: exceptId } } : {}) } });
  if (dup) throw new AppError("CONFLICT", "Ce code d'indicateur est déjà utilisé dans ce projet.");
}

export async function createIndicator(ctx: TenantContext, projectId: string, input: unknown) {
  assertCan(ctx, "meal:edit");
  const data = indicatorSchema.parse(input);
  return db.$transaction(async (tx) => {
    await checkIndicator(tx, ctx, projectId, data);
    const ind = await tx.indicator.create({ data: { ...data, projectId, organizationId: ctx.organizationId, createdById: ctx.userId } });
    await log(tx, ctx, "meal.indicator.create", "Indicator", ind.id, `Indicateur ${ind.code} « ${ind.name} » créé`);
    return ind;
  });
}

export async function updateIndicator(ctx: TenantContext, id: string, input: unknown) {
  assertCan(ctx, "meal:edit");
  const data = indicatorSchema.parse(input);
  return db.$transaction(async (tx) => {
    const before = await tx.indicator.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive } });
    if (!before) throw notFound("Indicateur introuvable.");
    await checkIndicator(tx, ctx, before.projectId, data, id);
    const full = { logframeItemId: null, baseline: null, baselineDate: null, target: null, targetDate: null, source: null, method: null, responsibleId: null, ...data };
    const ind = await tx.indicator.update({ where: { id }, data: full });
    await log(tx, ctx, "meal.indicator.update", "Indicator", id, `Indicateur ${ind.code} modifié`, diff(before, full));
    return ind;
  });
}

export async function deleteIndicator(ctx: TenantContext, id: string) {
  assertCan(ctx, "meal:delete");
  await db.$transaction(async (tx) => {
    const ind = await tx.indicator.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive } });
    if (!ind) throw notFound("Indicateur introuvable.");
    if (await tx.indicatorValue.count({ where: { indicatorId: id, status: "VALIDATED" } })) throw new AppError("CONFLICT", "Cet indicateur a des valeurs validées : il ne peut pas être supprimé (traçabilité).");
    await tx.indicator.update({ where: { id }, data: { deletedAt: new Date() } });
    await log(tx, ctx, "meal.indicator.delete", "Indicator", id, `Indicateur ${ind.code} supprimé`);
  });
}

export async function getIndicator(ctx: TenantContext, id: string) {
  assertCan(ctx, "meal:view");
  const ind = await db.indicator.findFirst({
    where: { id, organizationId: ctx.organizationId, ...alive, project: { deletedAt: null } },
    include: { project: { select: { id: true, code: true, name: true } }, logframeItem: true, values: { include: valueInclude, orderBy: [{ periodEnd: "asc" }, { createdAt: "asc" }] } },
  });
  if (!ind) throw notFound("Indicateur introuvable.");
  return { ...ind, calc: computeIndicator(ind), dimensions: parseDimensions(ind.disaggregations) };
}

// ───────────── Valeurs ─────────────

async function loadIndicator(tx: Tx, ctx: TenantContext, id: string) {
  const ind = await tx.indicator.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive, project: { deletedAt: null } } });
  if (!ind) throw notFound("Indicateur introuvable.");
  return ind;
}

function checkValueContent(ind: { type: string; disaggregations: string[] }, data: ReturnType<typeof indicatorValueSchema.parse>) {
  if (ind.type === "QUANTITATIVE" && data.value === undefined) throw new AppError("VALIDATION", "La valeur est obligatoire pour un indicateur quantitatif.");
  if (ind.type === "QUALITATIVE" && !data.textValue) throw new AppError("VALIDATION", "Une description est obligatoire pour un indicateur qualitatif.");
  if (data.disaggregation) {
    const dims = parseDimensions(ind.disaggregations);
    for (const [dim, cats] of Object.entries(data.disaggregation)) {
      const d = dims.find((x) => x.name === dim);
      if (!d) throw new AppError("VALIDATION", `Ventilation inconnue pour cet indicateur : ${dim}.`);
      for (const c of Object.keys(cats)) if (!d.categories.includes(c)) throw new AppError("VALIDATION", `Catégorie inconnue : ${dim} / ${c}.`);
      if (Object.keys(cats).length !== d.categories.length) throw new AppError("VALIDATION", `Ventilation « ${dim} » incomplète : renseignez toutes les catégories.`);
    }
    const issues = disaggregationIssues(data.value ?? null, data.disaggregation);
    if (issues.length) throw new AppError("VALIDATION", `Ventilation incohérente : la somme « ${issues[0].dimension} » (${issues[0].sum}) diffère de la valeur totale.`);
  }
}

/** Saisie d'une valeur (brouillon). Une même période ne peut pas avoir deux valeurs actives. */
export async function addValue(ctx: TenantContext, indicatorId: string, input: unknown) {
  assertCan(ctx, "meal:create");
  const data = indicatorValueSchema.parse(input);
  return db.$transaction(async (tx) => {
    const ind = await loadIndicator(tx, ctx, indicatorId);
    checkValueContent(ind, data);
    const clash = await tx.indicatorValue.findFirst({ where: { indicatorId, periodStart: data.periodStart, periodEnd: data.periodEnd, status: { not: "REJECTED" }, supersededBy: null } });
    if (clash) throw new AppError("CONFLICT", clash.status === "VALIDATED" ? "Une valeur validée existe déjà pour cette période : utilisez « Corriger »." : "Une valeur est déjà en attente de validation pour cette période.");
    const v = await tx.indicatorValue.create({ data: { ...data, disaggregation: data.disaggregation ?? undefined, indicatorId, organizationId: ctx.organizationId, collectedById: ctx.userId } });
    await log(tx, ctx, "meal.value.create", "IndicatorValue", v.id, `Valeur saisie pour ${ind.code} (${data.periodEnd.toISOString().slice(0, 10)})`);
    return v;
  });
}

/** Correction d'une valeur validée : nouvelle valeur en brouillon ; l'ancienne reste valable jusqu'à validation de la correction. */
export async function correctValue(ctx: TenantContext, valueId: string, input: unknown) {
  assertCan(ctx, "meal:create");
  const data = indicatorValueSchema.parse(input);
  return db.$transaction(async (tx) => {
    const orig = await tx.indicatorValue.findFirst({ where: { id: valueId, organizationId: ctx.organizationId }, include: { supersededBy: true } });
    if (!orig) throw notFound("Valeur introuvable.");
    if (orig.status !== "VALIDATED") throw new AppError("CONFLICT", "Seule une valeur validée se corrige ; modifiez ou supprimez un brouillon directement.");
    if (orig.supersededBy && orig.supersededBy.status !== "REJECTED") throw new AppError("CONFLICT", "Une correction est déjà en cours pour cette valeur.");
    if (orig.supersededBy) await tx.indicatorValue.update({ where: { id: orig.supersededBy.id }, data: { supersedesId: null } });
    const ind = await loadIndicator(tx, ctx, orig.indicatorId);
    checkValueContent(ind, data);
    const v = await tx.indicatorValue.create({ data: { ...data, periodStart: orig.periodStart, periodEnd: orig.periodEnd, disaggregation: data.disaggregation ?? undefined, indicatorId: orig.indicatorId, organizationId: ctx.organizationId, collectedById: ctx.userId, supersedesId: orig.id } });
    await log(tx, ctx, "meal.value.correct", "IndicatorValue", v.id, `Correction proposée pour ${ind.code} (${orig.periodEnd.toISOString().slice(0, 10)})`, { from: toNum(orig.value), to: data.value ?? null });
    return v;
  });
}

/**
 * Validation ou rejet (meal:approve). Séparation des tâches : la personne qui a saisi la valeur ne peut pas
 * la valider elle-même, sauf le propriétaire de l'organisation (petites structures).
 */
export async function reviewValue(ctx: TenantContext, valueId: string, approve: boolean, comment?: string) {
  assertCan(ctx, "meal:approve");
  return db.$transaction(async (tx) => {
    const v = await tx.indicatorValue.findFirst({ where: { id: valueId, organizationId: ctx.organizationId }, include: { indicator: { select: { code: true } } } });
    if (!v) throw notFound("Valeur introuvable.");
    if (v.status !== "DRAFT") throw new AppError("CONFLICT", "Cette valeur a déjà été traitée.");
    if (approve && v.collectedById === ctx.userId && ctx.roleKey !== OWNER_ROLE_KEY) throw forbidden("Une valeur doit être validée par une autre personne que celle qui l'a saisie.");
    await tx.indicatorValue.update({ where: { id: valueId }, data: { status: approve ? "VALIDATED" : "REJECTED", validatedById: ctx.userId, validatedAt: new Date(), reviewComment: comment || null } });
    await log(tx, ctx, approve ? "meal.value.validate" : "meal.value.reject", "IndicatorValue", valueId, `${approve ? "Validation" : "Rejet"} d'une valeur de ${v.indicator.code} (${v.periodEnd.toISOString().slice(0, 10)})`);
  });
}

export async function deleteValue(ctx: TenantContext, valueId: string) {
  const v = await db.indicatorValue.findFirst({ where: { id: valueId, organizationId: ctx.organizationId } });
  if (!v) throw notFound("Valeur introuvable.");
  if (v.status === "VALIDATED") throw new AppError("CONFLICT", "Une valeur validée ne peut pas être supprimée : utilisez « Corriger ».");
  if (!(can(ctx, "meal:delete") || (v.collectedById === ctx.userId && can(ctx, "meal:create")))) throw forbidden();
  await db.$transaction(async (tx) => {
    await tx.indicatorValue.delete({ where: { id: valueId } });
    await log(tx, ctx, "meal.value.delete", "IndicatorValue", valueId, "Suppression d'une valeur non validée");
  });
}

// ───────────── Vue d'ensemble ─────────────

export async function mealOverview(ctx: TenantContext, now = new Date()) {
  assertCan(ctx, "meal:view");
  const indicators = await db.indicator.findMany({
    where: { organizationId: ctx.organizationId, ...alive, project: { deletedAt: null } },
    include: { project: { select: { id: true, code: true, name: true } }, logframeItem: { select: { level: true, code: true } }, values: { include: valueInclude } },
    orderBy: [{ project: { code: "asc" } }, { code: "asc" }],
  });
  const rows = indicators.map((i) => ({ ...i, calc: computeIndicator(i, now) }));
  const pending = await db.indicatorValue.findMany({
    where: { organizationId: ctx.organizationId, status: "DRAFT", indicator: { deletedAt: null, project: { deletedAt: null } } },
    include: { indicator: { select: { id: true, code: true, name: true, unit: true, project: { select: { code: true } } } } },
    orderBy: { createdAt: "asc" },
  });
  return { rows, pending };
}
