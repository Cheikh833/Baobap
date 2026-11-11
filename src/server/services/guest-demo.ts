import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { createDemoOrganization } from "./demo";

// Démo instantanée pour les visiteurs (salons, foires) : un compte visiteur et un espace fictif complet,
// sans inscription. Chaque visiteur a son propre espace ; tout est supprimé automatiquement après 24 h.

export const GUEST_DOMAIN = "demo.baobab.invalid";
export const isGuestEmail = (email: string) => email.endsWith(`@${GUEST_DOMAIN}`);
const GUEST_TTL_MS = 24 * 3_600_000;

export async function startGuestDemo() {
  const user = await db.user.create({
    data: { email: `visiteur-${randomBytes(6).toString("hex")}@${GUEST_DOMAIN}`, name: "Visiteur", passwordHash: null, termsAcceptedAt: new Date() },
  });
  const org = await createDemoOrganization(user.id);
  return { user, org };
}

/** Supprime entièrement une organisation et toutes ses données (ordre : des plus dépendantes aux moins dépendantes). */
export async function purgeOrganization(tx: Prisma.TransactionClient, organizationId: string) {
  const o = { organizationId };
  const projectIds = (await tx.project.findMany({ where: o, select: { id: true } })).map((p) => p.id);
  const activityIds = (await tx.activity.findMany({ where: o, select: { id: true } })).map((a) => a.id);
  const unitIds = (await tx.organizationalUnit.findMany({ where: o, select: { id: true } })).map((u) => u.id);
  await tx.aiMessage.deleteMany({ where: o });
  await tx.aiConversation.deleteMany({ where: o });
  await tx.report.deleteMany({ where: o });
  await tx.documentVersion.deleteMany({ where: o });
  await tx.document.deleteMany({ where: o });
  await tx.knowledgeArticle.deleteMany({ where: o });
  await tx.stakeholder.deleteMany({ where: o });
  await tx.projectMember.deleteMany({ where: o });
  await tx.expense.deleteMany({ where: o });
  await tx.budgetLine.deleteMany({ where: o });
  await tx.funding.deleteMany({ where: o });
  await tx.risk.deleteMany({ where: o });
  await tx.dataset.deleteMany({ where: o });
  await tx.indicatorValue.updateMany({ where: o, data: { supersedesId: null } });
  await tx.indicatorValue.deleteMany({ where: o });
  await tx.indicator.deleteMany({ where: o });
  await tx.logframeItem.updateMany({ where: o, data: { parentId: null } });
  await tx.logframeItem.deleteMany({ where: o });
  await tx.activityDependency.deleteMany({ where: { OR: [{ predecessorId: { in: activityIds } }, { successorId: { in: activityIds } }] } });
  await tx.task.deleteMany({ where: o });
  await tx.activity.deleteMany({ where: o });
  await tx.projectPhase.deleteMany({ where: o });
  await tx.milestone.deleteMany({ where: o });
  await tx.projectObjectiveContribution.deleteMany({ where: { projectId: { in: projectIds } } });
  await tx.strategicObjective.deleteMany({ where: o });
  await tx.strategicAxis.deleteMany({ where: o });
  await tx.strategicPlan.deleteMany({ where: o });
  await tx.project.deleteMany({ where: o });
  await tx.program.deleteMany({ where: o });
  await tx.portfolio.deleteMany({ where: o });
  await tx.payment.deleteMany({ where: o });
  await tx.planRequest.deleteMany({ where: o });
  await tx.auditLog.deleteMany({ where: o });
  await tx.invitation.deleteMany({ where: o });
  await tx.unitMembership.deleteMany({ where: { unitId: { in: unitIds } } });
  await tx.membership.deleteMany({ where: o });
  await tx.organizationalUnit.updateMany({ where: o, data: { parentId: null } });
  await tx.organizationalUnit.deleteMany({ where: o });
  await tx.role.deleteMany({ where: o });
  await tx.organization.delete({ where: { id: organizationId } });
}

/** Purge des visiteurs de plus de 24 h (par lots, appelée à chaque nouvelle visite). */
export async function purgeExpiredGuests(now = new Date(), batch = 10) {
  const old = await db.user.findMany({ where: { email: { endsWith: `@${GUEST_DOMAIN}` }, createdAt: { lt: new Date(now.getTime() - GUEST_TTL_MS) } }, select: { id: true }, take: batch });
  for (const u of old) {
    await db.$transaction(async (tx) => {
      const orgs = await tx.organization.findMany({ where: { createdById: u.id }, select: { id: true } });
      for (const org of orgs) await purgeOrganization(tx, org.id);
      await tx.user.delete({ where: { id: u.id } });
    }, { timeout: 30_000 });
  }
  return old.length;
}
