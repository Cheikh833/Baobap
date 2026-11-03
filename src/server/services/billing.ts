import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { AppError, forbidden } from "@/server/errors";
import { audit } from "@/server/audit";
import { assertCan, can, type TenantContext } from "@/server/permissions/check";
import { getPlan, planName, PLANS } from "@/lib/plans";
import { optText } from "@/lib/validation/common";

type Tx = Prisma.TransactionClient | typeof db;

/** Les rôles en lecture seule pour l'externe (bailleurs) ne sont jamais facturés. */
export const FREE_ROLE_KEYS = ["DONOR_VIEWER"];

export async function usage(tx: Tx, organizationId: string) {
  const [members, invitations, projects] = await Promise.all([
    tx.membership.count({ where: { organizationId, status: "ACTIVE", role: { key: { notIn: FREE_ROLE_KEYS } } } }),
    tx.invitation.count({ where: { organizationId, status: "PENDING", expiresAt: { gt: new Date() }, role: { key: { notIn: FREE_ROLE_KEYS } } } }),
    tx.project.count({ where: { organizationId, deletedAt: null, status: { not: "ARCHIVED" } } }),
  ]);
  return { members: members + invitations, activeMembers: members, pendingInvitations: invitations, projects };
}

async function planOf(tx: Tx, organizationId: string) {
  const org = await tx.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { plan: true } });
  return getPlan(org.plan);
}

/** Refuse un nouveau membre facturable au-delà de la limite du plan (invitations en attente comprises). */
export async function assertMemberCapacity(tx: Tx, organizationId: string, roleKey: string) {
  if (FREE_ROLE_KEYS.includes(roleKey)) return;
  const plan = await planOf(tx, organizationId);
  if (plan.limits.members === null) return;
  const u = await usage(tx, organizationId);
  if (u.members >= plan.limits.members) {
    throw new AppError("CONFLICT", `Limite de ${plan.limits.members} membres du plan ${planName(plan.code)} atteinte (invitations en attente comprises). Les bailleurs en lecture seule restent illimités. Passez à un plan supérieur pour ajouter des membres.`);
  }
}

export async function assertProjectCapacity(tx: Tx, organizationId: string) {
  const plan = await planOf(tx, organizationId);
  if (plan.limits.projects === null) return;
  const u = await usage(tx, organizationId);
  if (u.projects >= plan.limits.projects) {
    throw new AppError("CONFLICT", `Limite de ${plan.limits.projects} projets non archivés du plan ${planName(plan.code)} atteinte. Archivez un projet terminé ou passez à un plan supérieur.`);
  }
}

export async function getBillingOverview(ctx: TenantContext) {
  assertCan(ctx, "billing:view");
  const [org, u, requests] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: ctx.organizationId }, select: { plan: true, subscriptionStatus: true, billingCycle: true, trialEndsAt: true, currentPeriodEnd: true } }),
    usage(db, ctx.organizationId),
    db.planRequest.findMany({ where: { organizationId: ctx.organizationId }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  return { org, plan: getPlan(org.plan), state: ctx.subscription, usage: u, requests };
}

export const planRequestSchema = z.object({
  plan: z.enum(PLANS.map((p) => p.code) as [string, ...string[]]),
  cycle: z.enum(["MONTHLY", "YEARLY"]).default("YEARLY"),
  solidarity: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()).default(false),
  contactPhone: optText(40),
  message: optText(1000),
});

/**
 * Demande d'activation ou de changement de plan. Autorisée même en lecture seule
 * (c'est précisément le moyen d'en sortir). Traitée par l'équipe BAOBAB (scripts/billing.ts).
 */
export async function requestPlan(ctx: TenantContext, input: unknown) {
  if (!can({ ...ctx, readOnly: false }, "billing:manage")) throw forbidden();
  const data = planRequestSchema.parse(input);
  const pending = await db.planRequest.count({ where: { organizationId: ctx.organizationId, status: "PENDING" } });
  if (pending) throw new AppError("CONFLICT", "Une demande est déjà en cours de traitement pour cette organisation.");
  return db.$transaction(async (tx) => {
    const r = await tx.planRequest.create({
      data: { organizationId: ctx.organizationId, plan: data.plan as never, cycle: data.cycle, solidarity: data.solidarity, contactPhone: data.contactPhone, message: data.message, requestedById: ctx.userId },
    });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "billing.request", entityType: "PlanRequest", entityId: r.id, summary: `Demande d'activation du plan ${planName(data.plan)} (${data.cycle === "YEARLY" ? "annuel" : "mensuel"}${data.solidarity ? ", tarif solidaire" : ""})` });
    return r;
  });
}

/**
 * Active (ou prolonge) un abonnement dans une transaction existante.
 * Renouvellement anticipé : la nouvelle période démarre à la fin de la période payée en cours.
 */
export async function activateIn(tx: Prisma.TransactionClient, organizationId: string, plan: string, cycle: "MONTHLY" | "YEARLY", now = new Date(), source = "manuel") {
  const p = getPlan(plan);
  const current = await tx.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { subscriptionStatus: true, currentPeriodEnd: true } });
  const start = current.subscriptionStatus === "ACTIVE" && current.currentPeriodEnd && current.currentPeriodEnd > now ? new Date(current.currentPeriodEnd) : new Date(now);
  const end = new Date(start);
  if (cycle === "YEARLY") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  const org = await tx.organization.update({
    where: { id: organizationId },
    data: { plan: p.code, billingCycle: cycle, subscriptionStatus: "ACTIVE", currentPeriodEnd: end },
  });
  await tx.planRequest.updateMany({ where: { organizationId, status: "PENDING" }, data: { status: "DONE", processedAt: now } });
  await audit(tx, { organizationId, actorId: null, action: "billing.activate", entityType: "Organization", entityId: organizationId, summary: `Abonnement ${planName(p.code)} actif jusqu'au ${end.toISOString().slice(0, 10)} (${source})` });
  return org;
}

/** Opération plateforme (équipe BAOBAB) : active un abonnement après réception d'un paiement hors ligne. */
export async function activateSubscription(organizationId: string, plan: string, cycle: "MONTHLY" | "YEARLY", now = new Date()) {
  return db.$transaction((tx) => activateIn(tx, organizationId, plan, cycle, now));
}
