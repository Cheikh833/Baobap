import { forbidden } from "@/server/errors";
import { OWNER_ROLE_KEY, type Permission } from "./catalog";

// Contexte d'exécution d'une requête : qui agit, dans quelle organisation, avec quels droits.
export type TenantContext = {
  userId: string;
  userName: string;
  organizationId: string;
  organizationName: string;
  membershipId: string;
  roleKey: string;
  roleName: string;
  permissions: ReadonlySet<string>;
};

export function can(ctx: Pick<TenantContext, "permissions" | "roleKey">, permission: Permission): boolean {
  return ctx.roleKey === OWNER_ROLE_KEY || ctx.permissions.has(permission);
}

export function assertCan(ctx: Pick<TenantContext, "permissions" | "roleKey">, permission: Permission): void {
  if (!can(ctx, permission)) throw forbidden();
}
