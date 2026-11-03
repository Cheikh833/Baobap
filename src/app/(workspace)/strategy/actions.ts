"use server";
import { navigateTo, runAction, type ActionState } from "@/server/action";
import { requireTenant } from "@/server/context";
import { formToObject } from "@/lib/validation/common";
import { createAxis, createObjective, createPlan, deleteAxis, deleteObjective, deletePlan, updateAxis, updateObjective, updatePlan } from "@/server/services/strategy";

const input = (fd: FormData) => formToObject(fd);

export async function createPlanAction(_: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(async () => navigateTo(`/strategy/${(await createPlan(ctx, input(fd))).id}`));
}
export async function updatePlanAction(id: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => updatePlan(ctx, id, input(fd)).then(() => {}), "Plan enregistré.");
}
export async function deletePlanAction(id: string, _: ActionState) {
  const ctx = await requireTenant();
  return runAction(async () => { await deletePlan(ctx, id); return navigateTo("/strategy"); });
}
export async function createAxisAction(planId: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => createAxis(ctx, planId, input(fd)).then(() => {}), "Axe ajouté.");
}
export async function updateAxisAction(id: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => updateAxis(ctx, id, input(fd)).then(() => {}), "Axe enregistré.");
}
export async function deleteAxisAction(id: string, _: ActionState) {
  const ctx = await requireTenant();
  return runAction(() => deleteAxis(ctx, id), "Axe supprimé.");
}
export async function createObjectiveAction(_: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => createObjective(ctx, input(fd)).then(() => {}), "Objectif ajouté.");
}
export async function updateObjectiveAction(id: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => updateObjective(ctx, id, input(fd)).then(() => {}), "Objectif enregistré.");
}
export async function deleteObjectiveAction(id: string, _: ActionState) {
  const ctx = await requireTenant();
  return runAction(() => deleteObjective(ctx, id), "Objectif supprimé.");
}
