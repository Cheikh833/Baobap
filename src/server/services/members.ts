import type { z } from "zod";
import { db } from "@/server/db";
import { AppError, forbidden, notFound } from "@/server/errors";
import { audit } from "@/server/audit";
import { generateToken, hashToken } from "@/server/auth/tokens";
import { OWNER_ROLE_KEY } from "@/server/permissions/catalog";
import { assertCan, type TenantContext } from "@/server/permissions/check";
import { invitationSchema } from "@/lib/validation/schemas";
import { assertMemberCapacity, FREE_ROLE_KEYS } from "./billing";

const INVITE_DAYS = 7;

export async function listMembers(ctx: TenantContext) {
  assertCan(ctx, "members:view");
  return db.membership.findMany({
    where: { organizationId: ctx.organizationId },
    include: {
      user: { select: { id: true, name: true, email: true, jobTitle: true, lastLoginAt: true } },
      role: { select: { id: true, name: true, key: true } },
      units: { include: { unit: { select: { id: true, name: true, deletedAt: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
}

/** Membres actifs (pour les sélecteurs de responsables). */
export async function listActiveMemberOptions(ctx: TenantContext) {
  const ms = await db.membership.findMany({
    where: { organizationId: ctx.organizationId, status: "ACTIVE" },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return ms.map((m) => ({ id: m.user.id, name: m.user.name }));
}

export async function listInvitations(ctx: TenantContext) {
  assertCan(ctx, "members:view");
  await db.invitation.updateMany({
    where: { organizationId: ctx.organizationId, status: "PENDING", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
  return db.invitation.findMany({
    where: { organizationId: ctx.organizationId, status: "PENDING" },
    include: { role: { select: { name: true, key: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Crée une invitation et renvoie le jeton brut (affiché une seule fois à l'administrateur).
 * Aucun email n'est envoyé : le service d'envoi n'est pas encore configuré (voir docs).
 */
export async function inviteMember(ctx: TenantContext, input: z.input<typeof invitationSchema>) {
  assertCan(ctx, "members:manage");
  const data = invitationSchema.parse(input);
  const role = await db.role.findFirst({ where: { id: data.roleId, organizationId: ctx.organizationId } });
  if (!role) throw new AppError("VALIDATION", "Rôle introuvable.");
  if (role.key === OWNER_ROLE_KEY && ctx.roleKey !== OWNER_ROLE_KEY) throw forbidden("Seul un propriétaire peut inviter un autre propriétaire.");
  const existing = await db.membership.findFirst({ where: { organizationId: ctx.organizationId, user: { email: data.email } } });
  if (existing) throw new AppError("CONFLICT", "Cette personne est déjà membre de l'organisation.");

  const token = generateToken();
  await db.$transaction(async (tx) => {
    // Une nouvelle invitation remplace l'éventuelle invitation en attente pour le même email.
    await tx.invitation.updateMany({
      where: { organizationId: ctx.organizationId, email: data.email, status: "PENDING" },
      data: { status: "REVOKED" },
    });
    await assertMemberCapacity(tx, ctx.organizationId, role.key);
    const inv = await tx.invitation.create({
      data: {
        organizationId: ctx.organizationId,
        email: data.email,
        roleId: role.id,
        tokenHash: hashToken(token),
        invitedById: ctx.userId,
        expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000),
      },
    });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "invitation.create", entityType: "Invitation", entityId: inv.id, summary: `Invitation de ${data.email} (${role.name})` });
  });
  return { token };
}

export async function revokeInvitation(ctx: TenantContext, id: string) {
  assertCan(ctx, "members:manage");
  const inv = await db.invitation.findFirst({ where: { id, organizationId: ctx.organizationId, status: "PENDING" } });
  if (!inv) throw notFound("Invitation introuvable.");
  await db.$transaction(async (tx) => {
    await tx.invitation.update({ where: { id }, data: { status: "REVOKED" } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "invitation.revoke", entityType: "Invitation", entityId: id, summary: `Révocation de l'invitation de ${inv.email}` });
  });
}

/** Invitation déjà acceptée par cet email (pour rediriger proprement après acceptation). */
export async function wasAcceptedBy(token: string, email: string) {
  const inv = await db.invitation.findUnique({ where: { tokenHash: hashToken(token) }, select: { status: true, email: true } });
  return inv?.status === "ACCEPTED" && inv.email === email.toLowerCase();
}

export async function getInvitationByToken(token: string) {
  const inv = await db.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { organization: { select: { name: true } }, role: { select: { name: true, key: true } } },
  });
  if (!inv || inv.status !== "PENDING" || inv.expiresAt < new Date()) return null;
  return inv;
}

export async function acceptInvitation(user: { id: string; email: string }, token: string) {
  const inv = await getInvitationByToken(token);
  if (!inv) throw new AppError("NOT_FOUND", "Invitation invalide, expirée ou déjà utilisée.");
  if (inv.email !== user.email.toLowerCase()) {
    throw forbidden(`Cette invitation est destinée à ${inv.email}. Connectez-vous avec ce compte.`);
  }
  return db.$transaction(async (tx) => {
    await tx.membership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: inv.organizationId } },
      create: { userId: user.id, organizationId: inv.organizationId, roleId: inv.roleId },
      update: {},
    });
    await tx.invitation.update({ where: { id: inv.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
    await audit(tx, { organizationId: inv.organizationId, actorId: user.id, action: "invitation.accept", entityType: "Invitation", entityId: inv.id, summary: `${inv.email} a rejoint l'organisation` });
    return inv.organizationId;
  });
}

async function countActiveOwners(organizationId: string) {
  return db.membership.count({ where: { organizationId, status: "ACTIVE", role: { key: OWNER_ROLE_KEY } } });
}

async function loadTarget(ctx: TenantContext, membershipId: string) {
  const m = await db.membership.findFirst({ where: { id: membershipId, organizationId: ctx.organizationId }, include: { role: true, user: true } });
  if (!m) throw notFound("Membre introuvable.");
  return m;
}

export async function changeMemberRole(ctx: TenantContext, membershipId: string, roleId: string) {
  assertCan(ctx, "members:manage");
  const target = await loadTarget(ctx, membershipId);
  const role = await db.role.findFirst({ where: { id: roleId, organizationId: ctx.organizationId } });
  if (!role) throw new AppError("VALIDATION", "Rôle introuvable.");
  const touchesOwner = role.key === OWNER_ROLE_KEY || target.role.key === OWNER_ROLE_KEY;
  if (touchesOwner && ctx.roleKey !== OWNER_ROLE_KEY) throw forbidden("Seul un propriétaire peut attribuer ou retirer le rôle de propriétaire.");
  if (target.role.key === OWNER_ROLE_KEY && role.key !== OWNER_ROLE_KEY && (await countActiveOwners(ctx.organizationId)) <= 1) {
    throw new AppError("CONFLICT", "L'organisation doit conserver au moins un propriétaire actif.");
  }
  await db.$transaction(async (tx) => {
    // Passer d'un rôle gratuit (bailleur) à un rôle facturable consomme une place du plan.
    if (FREE_ROLE_KEYS.includes(target.role.key) && !FREE_ROLE_KEYS.includes(role.key)) await assertMemberCapacity(tx, ctx.organizationId, role.key);
    await tx.membership.update({ where: { id: membershipId }, data: { roleId } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "member.role_change", entityType: "Membership", entityId: membershipId, summary: `${target.user.name} : ${target.role.name} → ${role.name}`, changes: { role: { from: target.role.key, to: role.key } } });
  });
}

export async function setMemberStatus(ctx: TenantContext, membershipId: string, status: "ACTIVE" | "SUSPENDED") {
  assertCan(ctx, "members:manage");
  const target = await loadTarget(ctx, membershipId);
  if (target.userId === ctx.userId) throw new AppError("CONFLICT", "Vous ne pouvez pas modifier votre propre statut.");
  if (target.role.key === OWNER_ROLE_KEY) {
    if (ctx.roleKey !== OWNER_ROLE_KEY) throw forbidden();
    if (status === "SUSPENDED" && (await countActiveOwners(ctx.organizationId)) <= 1) throw new AppError("CONFLICT", "L'organisation doit conserver au moins un propriétaire actif.");
  }
  await db.$transaction(async (tx) => {
    if (status === "ACTIVE") await assertMemberCapacity(tx, ctx.organizationId, target.role.key);
    await tx.membership.update({ where: { id: membershipId }, data: { status } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: status === "SUSPENDED" ? "member.suspend" : "member.reactivate", entityType: "Membership", entityId: membershipId, summary: `${status === "SUSPENDED" ? "Suspension" : "Réactivation"} de ${target.user.name}` });
  });
}

export async function setMemberUnits(ctx: TenantContext, membershipId: string, unitIds: string[]) {
  assertCan(ctx, "members:manage");
  const target = await loadTarget(ctx, membershipId);
  const units = await db.organizationalUnit.findMany({ where: { id: { in: unitIds }, organizationId: ctx.organizationId, deletedAt: null }, select: { id: true } });
  if (units.length !== new Set(unitIds).size) throw new AppError("VALIDATION", "Structure introuvable.");
  await db.$transaction(async (tx) => {
    await tx.unitMembership.deleteMany({ where: { membershipId } });
    if (units.length) await tx.unitMembership.createMany({ data: units.map((u) => ({ membershipId, unitId: u.id })) });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "member.units", entityType: "Membership", entityId: membershipId, summary: `Rattachement de ${target.user.name} à ${units.length} structure(s)` });
  });
}
