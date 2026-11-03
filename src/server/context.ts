import "server-only";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { getActiveOrganizationId, getSessionUser } from "@/server/auth/session";
import type { TenantContext } from "@/server/permissions/check";
import { loadTenantContext } from "@/server/tenant";

export { loadTenantContext };

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

// Point d'entrée de toutes les pages et actions de l'espace de travail.
export async function requireTenant(): Promise<TenantContext> {
  const user = await requireUser();
  const activeId = await getActiveOrganizationId();
  if (activeId) {
    const ctx = await loadTenantContext(user.id, activeId);
    if (ctx) return ctx;
  }
  // Pas d'organisation active valide : on prend la première adhésion active.
  const first = await db.membership.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  if (!first) redirect("/onboarding");
  const ctx = await loadTenantContext(user.id, first.organizationId);
  if (!ctx) redirect("/onboarding");
  return ctx;
}
