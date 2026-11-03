import { AppError, forbidden } from "@/server/errors";
import type { SubscriptionState } from "@/lib/plans";
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
  plan: string;
  subscription: SubscriptionState;
  /** Essai terminé ou abonnement expiré : consultation uniquement. */
  readOnly: boolean;
};

type Ctx = Pick<TenantContext, "permissions" | "roleKey"> & { readOnly?: boolean };

const isRead = (p: Permission) => p.endsWith(":view");

export function can(ctx: Ctx, permission: Permission): boolean {
  if (ctx.readOnly && !isRead(permission)) return false;
  return ctx.roleKey === OWNER_ROLE_KEY || ctx.permissions.has(permission);
}

export const READ_ONLY_MESSAGE =
  "La période d'essai ou l'abonnement de l'organisation est terminé : l'espace est en lecture seule. Vos données sont conservées ; activez un abonnement pour continuer à les modifier.";

export function assertCan(ctx: Ctx, permission: Permission): void {
  if (ctx.readOnly && !isRead(permission)) throw new AppError("FORBIDDEN", READ_ONLY_MESSAGE);
  if (!can(ctx, permission)) throw forbidden();
}
