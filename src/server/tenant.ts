import { db } from "@/server/db";
import type { TenantContext } from "@/server/permissions/check";

// Charge le contexte d'un utilisateur dans une organisation, uniquement s'il en est membre actif.
export async function loadTenantContext(userId: string, organizationId: string): Promise<TenantContext | null> {
  const m = await db.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    include: { role: true, organization: true, user: true },
  });
  if (!m || m.status !== "ACTIVE") return null;
  return {
    userId,
    userName: m.user.name,
    organizationId,
    organizationName: m.organization.name,
    membershipId: m.id,
    roleKey: m.role.key,
    roleName: m.role.name,
    permissions: new Set(m.role.permissions),
  };
}
