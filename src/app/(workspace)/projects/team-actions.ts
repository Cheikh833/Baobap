"use server";
import { runAction, type ActionState } from "@/server/action";
import { requireTenant } from "@/server/context";
import { formToObject } from "@/lib/validation/common";
import { addProjectMember, createStakeholder, deleteStakeholder, removeProjectMember, updateProjectMember, updateStakeholder } from "@/server/services/team";

export async function addMemberAction(projectId: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => addProjectMember(ctx, projectId, formToObject(fd)).then(() => {}), "Membre affecté.");
}
export async function updateMemberAction(id: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => updateProjectMember(ctx, id, formToObject(fd)), "Affectation enregistrée.");
}
export async function removeMemberAction(id: string, _: ActionState) {
  const ctx = await requireTenant();
  return runAction(() => removeProjectMember(ctx, id), "Membre retiré.");
}
export async function createStakeholderAction(projectId: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => createStakeholder(ctx, projectId, formToObject(fd)).then(() => {}), "Partie prenante enregistrée.");
}
export async function updateStakeholderAction(id: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => updateStakeholder(ctx, id, formToObject(fd)), "Partie prenante enregistrée.");
}
export async function deleteStakeholderAction(id: string, _: ActionState) {
  const ctx = await requireTenant();
  return runAction(() => deleteStakeholder(ctx, id), "Partie prenante supprimée.");
}
