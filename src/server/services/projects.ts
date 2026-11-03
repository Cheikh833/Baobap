import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { AppError, notFound } from "@/server/errors";
import { audit, diff } from "@/server/audit";
import { assertCan, type TenantContext } from "@/server/permissions/check";
import { PROJECT_LAST_EDIT_STEP, PROJECT_STEP_FIELDS, projectStepSchemas, type ProjectStep } from "@/lib/validation/schemas";
import { lifecycleStatus } from "@/lib/validation/common";
import { assertMember, assertPortfolio, assertProgram, isUniqueViolation } from "./guards";
import { assertProjectCapacity } from "./billing";

/**
 * Deux projets d'un même programme (ou deux projets hors programme) ne peuvent pas porter le même nom :
 * chaque projet doit être identifiable. Le même intitulé reste possible dans deux programmes différents,
 * le code (unique dans l'organisation) les distingue alors.
 */
async function assertDistinctName(tx: Prisma.TransactionClient, ctx: TenantContext, name: string, programId: string | null, exceptId?: string) {
  const clash = await tx.project.findFirst({
    where: { organizationId: ctx.organizationId, deletedAt: null, programId, name: { equals: name, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { code: true },
  });
  if (clash) {
    throw new AppError("CONFLICT", programId
      ? `Un projet portant ce nom existe déjà dans ce programme (${clash.code}). Donnez-lui un nom distinctif.`
      : `Un projet hors programme portant ce nom existe déjà (${clash.code}). Donnez-lui un nom distinctif.`);
  }
}

const live = (ctx: TenantContext) => ({ organizationId: ctx.organizationId, deletedAt: null });

export type ProjectFilters = { status?: string; portfolioId?: string; programId?: string; managerId?: string; q?: string };

export async function listProjects(ctx: TenantContext, f: ProjectFilters = {}) {
  assertCan(ctx, "project:view");
  const status = lifecycleStatus.safeParse(f.status);
  const where: Prisma.ProjectWhereInput = {
    ...live(ctx),
    ...(status.success ? { status: status.data } : {}),
    ...(f.portfolioId ? { portfolioId: f.portfolioId } : {}),
    ...(f.programId ? { programId: f.programId } : {}),
    ...(f.managerId ? { managerId: f.managerId } : {}),
    ...(f.q ? { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { code: { contains: f.q, mode: "insensitive" } }] } : {}),
  };
  return db.project.findMany({
    where,
    include: { program: { select: { id: true, name: true } }, portfolio: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getProject(ctx: TenantContext, id: string) {
  assertCan(ctx, "project:view");
  const p = await db.project.findFirst({
    where: { id, ...live(ctx) },
    include: { program: { select: { id: true, name: true } }, portfolio: { select: { id: true, name: true } } },
  });
  if (!p) throw notFound("Projet introuvable.");
  return p;
}

/** Résout le rattachement : un projet d'un programme hérite du portefeuille de ce programme. */
async function resolveHierarchy(tx: Prisma.TransactionClient, ctx: TenantContext, data: { portfolioId?: string; programId?: string }) {
  const program = await assertProgram(tx, ctx.organizationId, data.programId);
  await assertPortfolio(tx, ctx.organizationId, data.portfolioId);
  if (program?.portfolioId && data.portfolioId && program.portfolioId !== data.portfolioId) {
    throw new AppError("VALIDATION", "Le programme choisi appartient à un autre portefeuille.");
  }
  return { programId: data.programId ?? null, portfolioId: program?.portfolioId ?? data.portfolioId ?? null };
}

/** Étape 1 de l'assistant : crée le projet en statut Brouillon. */
export async function createProjectDraft(ctx: TenantContext, input: unknown) {
  assertCan(ctx, "project:create");
  const data = projectStepSchemas[1].parse(input);
  try {
    return await db.$transaction(async (tx) => {
      await assertProjectCapacity(tx, ctx.organizationId);
      const h = await resolveHierarchy(tx, ctx, data);
      await assertMember(tx, ctx.organizationId, data.managerId, "Le chef de projet");
      await assertDistinctName(tx, ctx, data.name, h.programId);
      const org = await tx.organization.findUniqueOrThrow({ where: { id: ctx.organizationId }, select: { defaultCurrency: true } });
      const p = await tx.project.create({
        data: { ...data, ...h, currency: org.defaultCurrency, status: "DRAFT", wizardStep: 2, organizationId: ctx.organizationId, createdById: ctx.userId, updatedById: ctx.userId },
      });
      await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "project.create", entityType: "Project", entityId: p.id, summary: `Création du projet « ${p.name} » (brouillon)` });
      return p;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("CONFLICT", "Ce code est déjà utilisé par un autre projet.");
    throw e;
  }
}

/** Enregistre une étape (assistant ou édition). Les champs absents de l'étape ne sont pas touchés. */
export async function saveProjectStep(ctx: TenantContext, id: string, step: ProjectStep, input: unknown) {
  assertCan(ctx, "project:edit");
  const schema = projectStepSchemas[step];
  if (!schema) throw new AppError("VALIDATION", "Étape inconnue.");
  const data = schema.parse(input) as Record<string, unknown>;
  try {
    return await db.$transaction(async (tx) => {
      const before = await tx.project.findFirst({ where: { id, ...live(ctx) } });
      if (!before) throw notFound("Projet introuvable.");
      const fields = PROJECT_STEP_FIELDS[step];
      const full: Record<string, unknown> = Object.fromEntries(fields.map((k) => [k, data[k] ?? null]));
      if (step === 1) {
        const h = await resolveHierarchy(tx, ctx, data as { portfolioId?: string; programId?: string });
        Object.assign(full, h);
        await assertMember(tx, ctx.organizationId, data.managerId as string | undefined, "Le chef de projet");
        await assertDistinctName(tx, ctx, data.name as string, h.programId, id);
      }
      const nextStep = Math.max(before.wizardStep, Math.min(step + 1, PROJECT_LAST_EDIT_STEP + 1));
      const p = await tx.project.update({ where: { id }, data: { ...full, wizardStep: nextStep, updatedById: ctx.userId } as Prisma.ProjectUncheckedUpdateInput });
      const changes = diff(before, full);
      if (Object.keys(changes).length) {
        await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "project.update", entityType: "Project", entityId: id, summary: `Modification du projet « ${p.name} »`, changes: changes as Prisma.InputJsonValue });
      }
      return p;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("CONFLICT", "Ce code est déjà utilisé par un autre projet.");
    throw e;
  }
}

// Transitions de statut autorisées (cycle de vie). Passer en ACTIVE exige la permission de validation.
const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PREPARATION", "ACTIVE", "ARCHIVED"],
  PREPARATION: ["DRAFT", "ACTIVE", "ARCHIVED"],
  ACTIVE: ["SUSPENDED", "CLOSED"],
  SUSPENDED: ["ACTIVE", "CLOSED"],
  CLOSED: ["ARCHIVED"],
  ARCHIVED: [],
};
export const allowedTransitions = (status: string) => TRANSITIONS[status] ?? [];

export async function changeProjectStatus(ctx: TenantContext, id: string, status: string) {
  const target = lifecycleStatus.parse(status);
  assertCan(ctx, target === "ACTIVE" ? "project:approve" : "project:edit");
  const p = await db.project.findFirst({ where: { id, ...live(ctx) } });
  if (!p) throw notFound("Projet introuvable.");
  if (!allowedTransitions(p.status).includes(target)) throw new AppError("VALIDATION", "Cette transition de statut n'est pas autorisée.");
  if (target === "ACTIVE" && (!p.startDate || !p.endDate)) throw new AppError("VALIDATION", "Renseignez les dates de début et de fin avant d'activer le projet.");
  await db.$transaction(async (tx) => {
    await tx.project.update({ where: { id }, data: { status: target, updatedById: ctx.userId } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "project.status", entityType: "Project", entityId: id, summary: `Statut du projet « ${p.name} » : ${p.status} → ${target}`, changes: { status: { from: p.status, to: target } } });
  });
}

export async function deleteProject(ctx: TenantContext, id: string) {
  assertCan(ctx, "project:delete");
  const p = await db.project.findFirst({ where: { id, ...live(ctx) } });
  if (!p) throw notFound("Projet introuvable.");
  await db.$transaction(async (tx) => {
    await tx.project.update({ where: { id }, data: { deletedAt: new Date(), updatedById: ctx.userId } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "project.delete", entityType: "Project", entityId: id, summary: `Suppression (archivage logique) du projet « ${p.name} »` });
  });
}
