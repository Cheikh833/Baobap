"use server";
import { navigateTo, runAction, type ActionState } from "@/server/action";
import { requireTenant } from "@/server/context";
import { formToObject } from "@/lib/validation/common";
import { parseDisaggregation } from "@/lib/validation/schemas";
import {
  addValue, correctValue, createIndicator, createLogframeItem, deleteIndicator, deleteLogframeItem, deleteValue, reviewValue, updateIndicator, updateLogframeItem,
} from "@/server/services/meal";

const valueInput = (fd: FormData) => {
  const o = formToObject(fd);
  return { ...o, disaggregation: parseDisaggregation(o) };
};

export async function createItemAction(projectId: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => createLogframeItem(ctx, projectId, formToObject(fd)).then(() => {}), "Élément ajouté.");
}
export async function updateItemAction(id: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => updateLogframeItem(ctx, id, formToObject(fd)).then(() => {}), "Élément enregistré.");
}
export async function deleteItemAction(id: string, _: ActionState) {
  const ctx = await requireTenant();
  return runAction(() => deleteLogframeItem(ctx, id), "Élément supprimé.");
}
export async function createIndicatorAction(projectId: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => createIndicator(ctx, projectId, formToObject(fd)).then(() => {}), "Indicateur créé.");
}
export async function updateIndicatorAction(id: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => updateIndicator(ctx, id, formToObject(fd)).then(() => {}), "Indicateur enregistré.");
}
export async function deleteIndicatorAction(id: string, projectId: string, _: ActionState): Promise<ActionState> {
  const ctx = await requireTenant();
  return runAction(async () => { await deleteIndicator(ctx, id); return navigateTo(`/projects/${projectId}?tab=meal`); });
}
export async function addValueAction(indicatorId: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => addValue(ctx, indicatorId, valueInput(fd)).then(() => {}), "Valeur enregistrée, en attente de validation.");
}
export async function correctValueAction(valueId: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => correctValue(ctx, valueId, valueInput(fd)).then(() => {}), "Correction enregistrée, en attente de validation.");
}
export async function reviewValueAction(valueId: string, approve: boolean, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  const comment = String(fd.get("reviewComment") ?? "").trim() || undefined;
  return runAction(() => reviewValue(ctx, valueId, approve, comment), approve ? "Valeur validée." : "Valeur rejetée.");
}
export async function deleteValueAction(valueId: string, _: ActionState) {
  const ctx = await requireTenant();
  return runAction(() => deleteValue(ctx, valueId), "Valeur supprimée.");
}
