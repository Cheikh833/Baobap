"use server";
import { navigateTo, runAction, type ActionState } from "@/server/action";
import { requireTenant } from "@/server/context";
import { formToObject } from "@/lib/validation/common";
import { PROJECT_LAST_EDIT_STEP, type ProjectStep } from "@/lib/validation/schemas";
import { changeProjectStatus, createProjectDraft, deleteProject, saveProjectStep } from "@/server/services/projects";

export async function createDraftAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireTenant();
  return runAction(async () => navigateTo(`/projects/new/${(await createProjectDraft(ctx, formToObject(fd))).id}/2`));
}

/** Assistant : enregistre l'étape puis passe à la suivante (ou revient en arrière si demandé). */
export async function wizardStepAction(id: string, step: ProjectStep, _: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireTenant();
  return runAction(async () => {
    await saveProjectStep(ctx, id, step, formToObject(fd));
    const dir = fd.get("intent");
    const next = dir === "back" ? Math.max(1, step - 1) : dir === "exit" ? null : Math.min(step + 1, PROJECT_LAST_EDIT_STEP + 1);
    return navigateTo(next ? `/projects/new/${id}/${next}` : `/projects/${id}`);
  });
}

export async function editStepAction(id: string, step: ProjectStep, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => saveProjectStep(ctx, id, step, formToObject(fd)).then(() => {}), "Modifications enregistrées.");
}

export async function statusAction(id: string, status: string, _: ActionState) {
  const ctx = await requireTenant();
  return runAction(() => changeProjectStatus(ctx, id, status), "Statut mis à jour.");
}

export async function deleteProjectAction(id: string, _: ActionState): Promise<ActionState> {
  const ctx = await requireTenant();
  return runAction(async () => { await deleteProject(ctx, id); return navigateTo("/projects"); });
}
