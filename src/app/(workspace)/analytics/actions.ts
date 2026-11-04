"use server";
import { navigateTo, runAction, type ActionState } from "@/server/action";
import { requireTenant } from "@/server/context";
import { formToObject } from "@/lib/validation/common";
import { deleteDataset, importDataset, setColumnType } from "@/server/services/analytics";

export async function importDatasetAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireTenant();
  const f = fd.get("file");
  const file = f instanceof File && f.size ? { name: f.name, size: f.size, buffer: await f.arrayBuffer() } : null;
  const { file: _drop, ...rest } = formToObject(fd);
  void _drop;
  return runAction(async () => navigateTo(`/analytics/${(await importDataset(ctx, rest, file)).id}`));
}

export async function columnTypeAction(id: string, columnName: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => setColumnType(ctx, id, columnName, String(fd.get("type") ?? "")), "Type de colonne enregistré.");
}

export async function deleteDatasetAction(id: string, _: ActionState): Promise<ActionState> {
  const ctx = await requireTenant();
  return runAction(async () => { await deleteDataset(ctx, id); return navigateTo("/analytics"); });
}
