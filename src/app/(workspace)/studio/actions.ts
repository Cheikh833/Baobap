"use server";
import { navigateTo, runAction, type ActionState } from "@/server/action";
import { requireTenant } from "@/server/context";
import { formToObject } from "@/lib/validation/common";
import { createReport, deleteReport, finalizeReport, updateNarrative } from "@/server/services/studio";

export async function createReportAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireTenant();
  return runAction(async () => navigateTo(`/studio/${(await createReport(ctx, formToObject(fd))).id}`));
}
export async function narrativeAction(id: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => updateNarrative(ctx, id, formToObject(fd)), "Texte enregistré.");
}
export async function finalizeAction(id: string, _: ActionState) {
  const ctx = await requireTenant();
  return runAction(() => finalizeReport(ctx, id), "Rapport validé : les données sont figées.");
}
export async function deleteReportAction(id: string, _: ActionState): Promise<ActionState> {
  const ctx = await requireTenant();
  return runAction(async () => { await deleteReport(ctx, id); return navigateTo("/studio"); });
}
