import type { z } from "zod";
import { db } from "@/server/db";
import { AppError, notFound } from "@/server/errors";
import { audit, diff } from "@/server/audit";
import { assertCan, type TenantContext } from "@/server/permissions/check";
import { programSchema } from "@/lib/validation/schemas";
import { assertMember, assertPortfolio, isUniqueViolation } from "./guards";

const live = (ctx: TenantContext) => ({ organizationId: ctx.organizationId, deletedAt: null });

export async function listPrograms(ctx: TenantContext, filter: { portfolioId?: string } = {}) {
  assertCan(ctx, "program:view");
  return db.program.findMany({
    where: { ...live(ctx), ...(filter.portfolioId ? { portfolioId: filter.portfolioId } : {}) },
    include: { portfolio: { select: { id: true, name: true } }, _count: { select: { projects: { where: { deletedAt: null } } } } },
    orderBy: { name: "asc" },
  });
}

export async function getProgram(ctx: TenantContext, id: string) {
  assertCan(ctx, "program:view");
  const p = await db.program.findFirst({
    where: { id, ...live(ctx) },
    include: { portfolio: { select: { id: true, name: true } }, projects: { where: { deletedAt: null }, orderBy: { name: "asc" } } },
  });
  if (!p) throw notFound("Programme introuvable.");
  return p;
}

async function checkRefs(tx: Parameters<Parameters<typeof db.$transaction>[0]>[0], ctx: TenantContext, data: z.infer<typeof programSchema>) {
  await assertPortfolio(tx, ctx.organizationId, data.portfolioId);
  await assertMember(tx, ctx.organizationId, data.managerId, "Le responsable");
  await assertMember(tx, ctx.organizationId, data.coordinatorId, "Le coordinateur");
}

export async function createProgram(ctx: TenantContext, input: z.input<typeof programSchema>) {
  assertCan(ctx, "program:create");
  const data = programSchema.parse(input);
  try {
    return await db.$transaction(async (tx) => {
      await checkRefs(tx, ctx, data);
      const p = await tx.program.create({ data: { ...data, organizationId: ctx.organizationId, createdById: ctx.userId, updatedById: ctx.userId } });
      await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "program.create", entityType: "Program", entityId: p.id, summary: `Création du programme « ${p.name} »` });
      return p;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("CONFLICT", "Ce code est déjà utilisé par un autre programme.");
    throw e;
  }
}

export async function updateProgram(ctx: TenantContext, id: string, input: z.input<typeof programSchema>) {
  assertCan(ctx, "program:edit");
  const data = programSchema.parse(input);
  try {
    return await db.$transaction(async (tx) => {
      const before = await tx.program.findFirst({ where: { id, ...live(ctx) } });
      if (!before) throw notFound("Programme introuvable.");
      await checkRefs(tx, ctx, data);
      const full = { portfolioId: null, managerId: null, coordinatorId: null, context: null, problemStatement: null, generalObjective: null, startDate: null, endDate: null, plannedBudget: null, ...data };
      const p = await tx.program.update({ where: { id }, data: { ...full, updatedById: ctx.userId } });
      // Cohérence hiérarchique : les projets du programme suivent son portefeuille.
      if (before.portfolioId !== p.portfolioId) {
        await tx.project.updateMany({ where: { programId: id, organizationId: ctx.organizationId }, data: { portfolioId: p.portfolioId } });
      }
      await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "program.update", entityType: "Program", entityId: id, summary: `Modification du programme « ${p.name} »`, changes: diff(before, full) });
      return p;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("CONFLICT", "Ce code est déjà utilisé par un autre programme.");
    throw e;
  }
}

export async function deleteProgram(ctx: TenantContext, id: string) {
  assertCan(ctx, "program:delete");
  const p = await db.program.findFirst({ where: { id, ...live(ctx) }, include: { _count: { select: { projects: { where: { deletedAt: null } } } } } });
  if (!p) throw notFound("Programme introuvable.");
  if (p._count.projects) throw new AppError("CONFLICT", "Ce programme contient des projets : détachez-les d'abord.");
  await db.$transaction(async (tx) => {
    await tx.program.update({ where: { id }, data: { deletedAt: new Date(), updatedById: ctx.userId } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "program.delete", entityType: "Program", entityId: id, summary: `Suppression (archivage logique) du programme « ${p.name} »` });
  });
}
