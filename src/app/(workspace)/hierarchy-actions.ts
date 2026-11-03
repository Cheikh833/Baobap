"use server";
import { navigateTo, runAction, type ActionState } from "@/server/action";
import { requireTenant } from "@/server/context";
import { formToObject } from "@/lib/validation/common";
import { createPortfolio, deletePortfolio, updatePortfolio } from "@/server/services/portfolios";
import { createProgram, deleteProgram, updateProgram } from "@/server/services/programs";

const input = (fd: FormData) => formToObject(fd) as never;

export async function createPortfolioAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireTenant();
  return runAction(async () => navigateTo(`/portfolios/${(await createPortfolio(ctx, input(fd))).id}`));
}
export async function updatePortfolioAction(id: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => updatePortfolio(ctx, id, input(fd)).then(() => {}), "Portefeuille enregistré.");
}
export async function deletePortfolioAction(id: string, _: ActionState): Promise<ActionState> {
  const ctx = await requireTenant();
  return runAction(async () => { await deletePortfolio(ctx, id); return navigateTo("/portfolios"); });
}

export async function createProgramAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireTenant();
  return runAction(async () => navigateTo(`/programs/${(await createProgram(ctx, input(fd))).id}`));
}
export async function updateProgramAction(id: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => updateProgram(ctx, id, input(fd)).then(() => {}), "Programme enregistré.");
}
export async function deleteProgramAction(id: string, _: ActionState): Promise<ActionState> {
  const ctx = await requireTenant();
  return runAction(async () => { await deleteProgram(ctx, id); return navigateTo("/programs"); });
}
