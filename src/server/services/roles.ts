import type { z } from "zod";
import { db } from "@/server/db";
import { AppError, notFound } from "@/server/errors";
import { audit } from "@/server/audit";
import { isPermission, OWNER_ROLE_KEY } from "@/server/permissions/catalog";
import { assertCan, can, type TenantContext } from "@/server/permissions/check";
import { roleSchema } from "@/lib/validation/schemas";

export async function listRoles(ctx: TenantContext) {
  assertCan(ctx, "roles:view");
  return db.role.findMany({
    where: { organizationId: ctx.organizationId },
    include: { _count: { select: { memberships: true } } },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
}

function cleanPermissions(perms: string[]) {
  const bad = perms.filter((p) => !isPermission(p));
  if (bad.length) throw new AppError("VALIDATION", `Permission inconnue : ${bad.join(", ")}`);
  return [...new Set(perms)].sort();
}

export async function createRole(ctx: TenantContext, input: z.input<typeof roleSchema>) {
  assertCan(ctx, "roles:manage");
  const data = roleSchema.parse(input);
  const permissions = cleanPermissions(data.permissions);
  const key = `CUSTOM_${Date.now().toString(36).toUpperCase()}`;
  return db.$transaction(async (tx) => {
    const role = await tx.role.create({ data: { organizationId: ctx.organizationId, key, name: data.name, description: data.description, permissions } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "role.create", entityType: "Role", entityId: role.id, summary: `Création du rôle « ${role.name} »`, changes: { permissions } });
    return role;
  });
}

export async function updateRole(ctx: TenantContext, id: string, input: z.input<typeof roleSchema>) {
  assertCan(ctx, "roles:manage");
  const data = roleSchema.parse(input);
  const role = await db.role.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!role) throw notFound("Rôle introuvable.");
  if (role.key === OWNER_ROLE_KEY) throw new AppError("CONFLICT", "Le rôle Propriétaire n'est pas modifiable.");
  const permissions = cleanPermissions(data.permissions);
  await db.$transaction(async (tx) => {
    await tx.role.update({ where: { id }, data: { name: data.name, description: data.description, permissions } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "role.update", entityType: "Role", entityId: id, summary: `Modification du rôle « ${data.name} »`, changes: { permissions: { from: role.permissions, to: permissions } } });
  });
}

export async function deleteRole(ctx: TenantContext, id: string) {
  assertCan(ctx, "roles:manage");
  const role = await db.role.findFirst({ where: { id, organizationId: ctx.organizationId }, include: { _count: { select: { memberships: true } } } });
  if (!role) throw notFound("Rôle introuvable.");
  if (role.isSystem) throw new AppError("CONFLICT", "Les rôles système ne peuvent pas être supprimés.");
  if (role._count.memberships) throw new AppError("CONFLICT", "Ce rôle est attribué à des membres : réattribuez-les d'abord.");
  await db.$transaction(async (tx) => {
    await tx.invitation.updateMany({ where: { roleId: id, status: "PENDING" }, data: { status: "REVOKED" } });
    await tx.role.delete({ where: { id } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "role.delete", entityType: "Role", entityId: id, summary: `Suppression du rôle « ${role.name} »` });
  });
}

/** Rôles proposés dans les sélecteurs (invitation, changement de rôle). */
export async function listRoleOptions(ctx: TenantContext) {
  if (!can(ctx, "roles:view") && !can(ctx, "members:manage")) return [];
  return db.role.findMany({ where: { organizationId: ctx.organizationId }, select: { id: true, key: true, name: true }, orderBy: [{ isSystem: "desc" }, { name: "asc" }] });
}
