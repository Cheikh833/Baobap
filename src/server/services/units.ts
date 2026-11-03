import type { z } from "zod";
import type { UnitType } from "@prisma/client";
import { db } from "@/server/db";
import { AppError, notFound } from "@/server/errors";
import { audit, diff } from "@/server/audit";
import { assertCan, type TenantContext } from "@/server/permissions/check";
import { unitSchema } from "@/lib/validation/schemas";

export async function listUnits(ctx: TenantContext) {
  assertCan(ctx, "units:view");
  return db.organizationalUnit.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null },
    include: { _count: { select: { members: true } } },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

async function assertParent(ctx: TenantContext, parentId: string | undefined, selfId?: string) {
  if (!parentId) return;
  // Remonte l'arbre pour refuser un parent hors organisation ou un cycle.
  let cursor: string | null = parentId;
  for (let depth = 0; cursor && depth < 50; depth++) {
    if (cursor === selfId) throw new AppError("VALIDATION", "Une structure ne peut pas être rattachée à elle-même ou à l'une de ses sous-structures.");
    const u: { parentId: string | null } | null = await db.organizationalUnit.findFirst({
      where: { id: cursor, organizationId: ctx.organizationId, deletedAt: null },
      select: { parentId: true },
    });
    if (!u) throw new AppError("VALIDATION", "Structure parente introuvable.");
    cursor = u.parentId;
  }
}

export async function createUnit(ctx: TenantContext, input: z.input<typeof unitSchema>) {
  assertCan(ctx, "units:create");
  const data = unitSchema.parse(input);
  await assertParent(ctx, data.parentId);
  return db.$transaction(async (tx) => {
    const unit = await tx.organizationalUnit.create({
      data: { ...data, type: data.type as UnitType, organizationId: ctx.organizationId, createdById: ctx.userId, updatedById: ctx.userId },
    });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "unit.create", entityType: "OrganizationalUnit", entityId: unit.id, summary: `Création de la structure « ${unit.name} »` });
    return unit;
  });
}

export async function updateUnit(ctx: TenantContext, id: string, input: z.input<typeof unitSchema>) {
  assertCan(ctx, "units:edit");
  const data = unitSchema.parse(input);
  const before = await db.organizationalUnit.findFirst({ where: { id, organizationId: ctx.organizationId, deletedAt: null } });
  if (!before) throw notFound();
  await assertParent(ctx, data.parentId, id);
  return db.$transaction(async (tx) => {
    const unit = await tx.organizationalUnit.update({ where: { id }, data: { ...data, parentId: data.parentId ?? null, type: data.type as UnitType, updatedById: ctx.userId } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "unit.update", entityType: "OrganizationalUnit", entityId: id, summary: `Modification de la structure « ${unit.name} »`, changes: diff(before, data) });
    return unit;
  });
}

export async function deleteUnit(ctx: TenantContext, id: string) {
  assertCan(ctx, "units:delete");
  const unit = await db.organizationalUnit.findFirst({ where: { id, organizationId: ctx.organizationId, deletedAt: null }, include: { children: { where: { deletedAt: null } } } });
  if (!unit) throw notFound();
  if (unit.children.length) throw new AppError("CONFLICT", "Supprimez ou déplacez d'abord les sous-structures.");
  await db.$transaction(async (tx) => {
    await tx.organizationalUnit.update({ where: { id }, data: { deletedAt: new Date(), updatedById: ctx.userId } });
    await tx.unitMembership.deleteMany({ where: { unitId: id } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "unit.delete", entityType: "OrganizationalUnit", entityId: id, summary: `Suppression de la structure « ${unit.name} »` });
  });
}
