import type { z } from "zod";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { audit, diff } from "@/server/audit";
import { OWNER_ROLE_KEY, SYSTEM_ROLES } from "@/server/permissions/catalog";
import { assertCan, type TenantContext } from "@/server/permissions/check";
import { organizationCreateSchema, organizationProfileSchema } from "@/lib/validation/schemas";
import { isUniqueViolation } from "./guards";
import type { OrganizationType } from "@prisma/client";

export async function createOrganization(userId: string, input: z.input<typeof organizationCreateSchema>) {
  const data = organizationCreateSchema.parse(input);
  try {
    return await db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { ...data, type: data.type as OrganizationType, createdById: userId },
      });
      await tx.role.createMany({
        data: SYSTEM_ROLES.map((r) => ({ ...r, organizationId: org.id, isSystem: true })),
      });
      const owner = await tx.role.findUniqueOrThrow({
        where: { organizationId_key: { organizationId: org.id, key: OWNER_ROLE_KEY } },
      });
      await tx.membership.create({ data: { userId, organizationId: org.id, roleId: owner.id } });
      await audit(tx, {
        organizationId: org.id,
        actorId: userId,
        action: "organization.create",
        entityType: "Organization",
        entityId: org.id,
        summary: `Création de l'organisation « ${org.name} »`,
      });
      return org;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("CONFLICT", "Ce code d'organisation est déjà utilisé.");
    throw e;
  }
}

export async function getOrganization(ctx: TenantContext) {
  assertCan(ctx, "organization:view");
  return db.organization.findUniqueOrThrow({ where: { id: ctx.organizationId } });
}

export async function updateOrganizationProfile(ctx: TenantContext, input: z.input<typeof organizationProfileSchema>) {
  assertCan(ctx, "organization:edit");
  const data = organizationProfileSchema.parse(input);
  return db.$transaction(async (tx) => {
    const before = await tx.organization.findUniqueOrThrow({ where: { id: ctx.organizationId } });
    const after = await tx.organization.update({
      where: { id: ctx.organizationId },
      data: { ...data, type: data.type as OrganizationType },
    });
    const changes = diff(before, data);
    if (Object.keys(changes).length) {
      await audit(tx, {
        organizationId: ctx.organizationId,
        actorId: ctx.userId,
        action: "organization.update",
        entityType: "Organization",
        entityId: ctx.organizationId,
        summary: "Mise à jour du profil institutionnel",
        changes,
      });
    }
    return after;
  });
}

export function listUserOrganizations(userId: string) {
  return db.membership.findMany({
    where: { userId, status: "ACTIVE" },
    include: { organization: { select: { id: true, name: true, code: true } }, role: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
}
