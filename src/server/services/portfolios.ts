import type { z } from "zod";
import { db } from "@/server/db";
import { AppError, notFound } from "@/server/errors";
import { audit, diff } from "@/server/audit";
import { assertCan, type TenantContext } from "@/server/permissions/check";
import { portfolioSchema } from "@/lib/validation/schemas";
import { assertMember, isUniqueViolation } from "./guards";

const live = (ctx: TenantContext) => ({ organizationId: ctx.organizationId, deletedAt: null });

export async function listPortfolios(ctx: TenantContext) {
  assertCan(ctx, "portfolio:view");
  return db.portfolio.findMany({
    where: live(ctx),
    include: { _count: { select: { programs: { where: { deletedAt: null } }, projects: { where: { deletedAt: null } } } } },
    orderBy: { name: "asc" },
  });
}

export async function getPortfolio(ctx: TenantContext, id: string) {
  assertCan(ctx, "portfolio:view");
  const p = await db.portfolio.findFirst({
    where: { id, ...live(ctx) },
    include: {
      programs: { where: { deletedAt: null }, orderBy: { name: "asc" } },
      projects: { where: { deletedAt: null }, orderBy: { name: "asc" } },
    },
  });
  if (!p) throw notFound("Portefeuille introuvable.");
  return p;
}

export async function createPortfolio(ctx: TenantContext, input: z.input<typeof portfolioSchema>) {
  assertCan(ctx, "portfolio:create");
  const data = portfolioSchema.parse(input);
  try {
    return await db.$transaction(async (tx) => {
      await assertMember(tx, ctx.organizationId, data.managerId);
      const p = await tx.portfolio.create({ data: { ...data, organizationId: ctx.organizationId, createdById: ctx.userId, updatedById: ctx.userId } });
      await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "portfolio.create", entityType: "Portfolio", entityId: p.id, summary: `Création du portefeuille « ${p.name} »` });
      return p;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("CONFLICT", "Ce code est déjà utilisé par un autre portefeuille.");
    throw e;
  }
}

export async function updatePortfolio(ctx: TenantContext, id: string, input: z.input<typeof portfolioSchema>) {
  assertCan(ctx, "portfolio:edit");
  const data = portfolioSchema.parse(input);
  try {
    return await db.$transaction(async (tx) => {
      const before = await tx.portfolio.findFirst({ where: { id, ...live(ctx) } });
      if (!before) throw notFound("Portefeuille introuvable.");
      await assertMember(tx, ctx.organizationId, data.managerId);
      const full = { managerId: null, startDate: null, endDate: null, plannedBudget: null, description: null, objective: null, ...data };
      const p = await tx.portfolio.update({ where: { id }, data: { ...full, updatedById: ctx.userId } });
      await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "portfolio.update", entityType: "Portfolio", entityId: id, summary: `Modification du portefeuille « ${p.name} »`, changes: diff(before, full) });
      return p;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("CONFLICT", "Ce code est déjà utilisé par un autre portefeuille.");
    throw e;
  }
}

export async function deletePortfolio(ctx: TenantContext, id: string) {
  assertCan(ctx, "portfolio:delete");
  const p = await db.portfolio.findFirst({ where: { id, ...live(ctx) }, include: { _count: { select: { programs: { where: { deletedAt: null } }, projects: { where: { deletedAt: null } } } } } });
  if (!p) throw notFound("Portefeuille introuvable.");
  if (p._count.programs || p._count.projects) throw new AppError("CONFLICT", "Ce portefeuille contient des programmes ou projets : détachez-les d'abord.");
  await db.$transaction(async (tx) => {
    await tx.portfolio.update({ where: { id }, data: { deletedAt: new Date(), updatedById: ctx.userId } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "portfolio.delete", entityType: "Portfolio", entityId: id, summary: `Suppression (archivage logique) du portefeuille « ${p.name} »` });
  });
}
