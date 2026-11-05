"use server";
import { runAction, type ActionState } from "@/server/action";
import { requireTenant } from "@/server/context";
import { formToObject } from "@/lib/validation/common";
import {
  cancelExpense, createBudgetLine, createExpense, createFunding, deleteBudgetLine, deleteExpense, deleteFunding, reviewExpense, updateBudgetLine, updateFunding,
} from "@/server/services/finance";

const form = (fd: FormData) => formToObject(fd);
const comment = (fd: FormData) => String(fd.get("comment") ?? "").trim() || undefined;

export async function createFundingAction(projectId: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => createFunding(ctx, projectId, form(fd)).then(() => {}), "Financement ajouté.");
}
export async function updateFundingAction(id: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => updateFunding(ctx, id, form(fd)).then(() => {}), "Financement enregistré.");
}
export async function deleteFundingAction(id: string, _: ActionState) {
  const ctx = await requireTenant();
  return runAction(() => deleteFunding(ctx, id), "Financement supprimé.");
}
export async function createLineAction(projectId: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => createBudgetLine(ctx, projectId, form(fd)).then(() => {}), "Ligne ajoutée.");
}
export async function updateLineAction(id: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => updateBudgetLine(ctx, id, form(fd)).then(() => {}), "Ligne enregistrée.");
}
export async function deleteLineAction(id: string, _: ActionState) {
  const ctx = await requireTenant();
  return runAction(() => deleteBudgetLine(ctx, id), "Ligne supprimée.");
}
export async function createExpenseAction(projectId: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => createExpense(ctx, projectId, form(fd)).then(() => {}), "Dépense enregistrée, en attente de validation.");
}
export async function reviewExpenseAction(id: string, approve: boolean, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => reviewExpense(ctx, id, approve, comment(fd)), approve ? "Dépense validée." : "Dépense rejetée.");
}
export async function cancelExpenseAction(id: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => cancelExpense(ctx, id, comment(fd)), "Dépense annulée.");
}
export async function deleteExpenseAction(id: string, _: ActionState) {
  const ctx = await requireTenant();
  return runAction(() => deleteExpense(ctx, id), "Dépense supprimée.");
}
