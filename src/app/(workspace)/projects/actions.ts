"use server";
import {
  addDependency, createActivity, createMilestone, createPhase, createTask, deleteActivity, deleteMilestone, deletePhase, deleteTask, moveTask, setMilestoneAchieved, updateActivity, updateTask,
} from "@/server/services/planning";
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

// ───────────── Planification ─────────────


const form = (fd: FormData) => formToObject(fd);

export async function createPhaseAction(projectId: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => createPhase(ctx, projectId, form(fd)).then(() => {}), "Phase ajoutée.");
}
export async function deletePhaseAction(id: string, _: ActionState) {
  const ctx = await requireTenant();
  return runAction(() => deletePhase(ctx, id), "Phase supprimée.");
}
export async function createActivityAction(projectId: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => createActivity(ctx, projectId, form(fd)).then(() => {}), "Activité ajoutée.");
}
export async function updateActivityAction(id: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => updateActivity(ctx, id, form(fd)).then(() => {}), "Activité enregistrée.");
}
export async function deleteActivityAction(id: string, _: ActionState) {
  const ctx = await requireTenant();
  return runAction(() => deleteActivity(ctx, id), "Activité supprimée.");
}
export async function addDependencyAction(_: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => addDependency(ctx, String(fd.get("predecessorId") ?? ""), String(fd.get("successorId") ?? "")), "Dépendance ajoutée.");
}
export async function createTaskAction(projectId: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => createTask(ctx, projectId, form(fd)).then(() => {}), "Tâche créée.");
}
export async function updateTaskAction(id: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => updateTask(ctx, id, form(fd)).then(() => {}), "Tâche enregistrée.");
}
export async function deleteTaskAction(id: string, _: ActionState) {
  const ctx = await requireTenant();
  return runAction(() => deleteTask(ctx, id), "Tâche supprimée.");
}
/** Appelée directement par le Kanban (glisser-déposer). */
export async function moveTaskAction(id: string, status: string, beforeTaskId: string | null) {
  const ctx = await requireTenant();
  return runAction(() => moveTask(ctx, id, status, beforeTaskId));
}
export async function createMilestoneAction(projectId: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => createMilestone(ctx, projectId, form(fd)).then(() => {}), "Jalon ajouté.");
}
export async function milestoneAchievedAction(id: string, achieved: boolean, _: ActionState) {
  const ctx = await requireTenant();
  return runAction(() => setMilestoneAchieved(ctx, id, achieved), "Jalon mis à jour.");
}
export async function deleteMilestoneAction(id: string, _: ActionState) {
  const ctx = await requireTenant();
  return runAction(() => deleteMilestone(ctx, id), "Jalon supprimé.");
}
