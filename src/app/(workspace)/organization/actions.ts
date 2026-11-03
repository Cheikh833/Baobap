"use server";
import { runAction, type ActionState } from "@/server/action";
import { requireTenant } from "@/server/context";
import { formToObject } from "@/lib/validation/common";
import { updateOrganizationProfile } from "@/server/services/organization";
import { createUnit, deleteUnit, updateUnit } from "@/server/services/units";
import { changeMemberRole, inviteMember, revokeInvitation, setMemberStatus, setMemberUnits } from "@/server/services/members";
import { createRole, deleteRole, updateRole } from "@/server/services/roles";
import { requestPlan } from "@/server/services/billing";
import { startOnlinePayment } from "@/server/services/payments";
import { baseUrl } from "@/server/base-url";
import { navigateTo } from "@/server/action";
import { layout, sendMail } from "@/server/mail/mailer";
import { getMessages } from "@/i18n/server";

const input = (fd: FormData) => formToObject(fd) as never;

export async function updateProfileAction(_: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => updateOrganizationProfile(ctx, input(fd)).then(() => {}), "Profil enregistré.");
}

export async function createUnitAction(_: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => createUnit(ctx, input(fd)).then(() => {}), "Structure créée.");
}
export async function updateUnitAction(id: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => updateUnit(ctx, id, input(fd)).then(() => {}), "Structure modifiée.");
}
export async function deleteUnitAction(id: string, _: ActionState) {
  const ctx = await requireTenant();
  return runAction(() => deleteUnit(ctx, id), "Structure supprimée.");
}

export async function inviteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireTenant();
  return runAction(async () => {
    const { token } = await inviteMember(ctx, input(fd));
    const url = `${await baseUrl()}/invitation/${token}`;
    const { html, text } = layout(`Invitation à rejoindre ${ctx.organizationName} sur BAOBAB`, [
      `${ctx.userName} vous invite à rejoindre l'organisation ${ctx.organizationName} sur BAOBAB, la plateforme de pilotage des projets et programmes.`,
      `${ctx.userName} invites you to join ${ctx.organizationName} on BAOBAB.`,
      "Ce lien est personnel et expire dans 7 jours. / This link is personal and expires in 7 days.",
    ], { label: "Rejoindre l'organisation / Join", url });
    const mail = await sendMail({ to: String(fd.get("email") ?? "").trim().toLowerCase(), subject: `Invitation — ${ctx.organizationName} (BAOBAB)`, html, text });
    return { ok: true, message: mail.sent ? "Invitation créée et envoyée par email." : "Invitation créée.", data: { inviteUrl: `/invitation/${token}` } };
  });
}
export async function revokeInvitationAction(id: string, _: ActionState) {
  const ctx = await requireTenant();
  return runAction(() => revokeInvitation(ctx, id), "Invitation révoquée.");
}
export async function changeRoleAction(membershipId: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => changeMemberRole(ctx, membershipId, String(fd.get("roleId") ?? "")), "Rôle modifié.");
}
export async function setStatusAction(membershipId: string, status: "ACTIVE" | "SUSPENDED", _: ActionState) {
  const ctx = await requireTenant();
  return runAction(() => setMemberStatus(ctx, membershipId, status), status === "ACTIVE" ? "Membre réactivé." : "Membre suspendu.");
}
export async function setUnitsAction(membershipId: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => setMemberUnits(ctx, membershipId, fd.getAll("unitIds").map(String)), "Rattachements enregistrés.");
}

export async function createRoleAction(_: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => createRole(ctx, input(fd)).then(() => {}), "Rôle créé.");
}
export async function updateRoleAction(id: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => updateRole(ctx, id, input(fd)), "Rôle enregistré.");
}
export async function deleteRoleAction(id: string, _: ActionState) {
  const ctx = await requireTenant();
  return runAction(() => deleteRole(ctx, id), "Rôle supprimé.");
}

export async function requestPlanAction(_: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  const { m } = await getMessages();
  return runAction(() => requestPlan(ctx, input(fd)).then(() => {}), m.billing.sent);
}

export async function startPaymentAction(_: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  const { locale } = await getMessages();
  return runAction(async () => {
    const { paymentUrl } = await startOnlinePayment(ctx, input(fd), { baseUrl: await baseUrl(), lang: locale === "en" ? "en" : "fr" });
    return navigateTo(paymentUrl);
  });
}
