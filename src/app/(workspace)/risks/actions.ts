"use server";
import { runAction, type ActionState } from "@/server/action";
import { requireTenant } from "@/server/context";
import { formToObject } from "@/lib/validation/common";
import { createRisk, deleteRisk, updateRisk } from "@/server/services/risks";

export async function createRiskAction(projectId: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => createRisk(ctx, projectId, formToObject(fd)).then(() => {}), "Risque enregistré.");
}
export async function updateRiskAction(id: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => updateRisk(ctx, id, formToObject(fd)).then(() => {}), "Risque enregistré.");
}
export async function deleteRiskAction(id: string, _: ActionState) {
  const ctx = await requireTenant();
  return runAction(() => deleteRisk(ctx, id), "Risque supprimé.");
}
