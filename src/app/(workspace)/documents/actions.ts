"use server";
import { navigateTo, runAction, type ActionState } from "@/server/action";
import { requireTenant } from "@/server/context";
import { formToObject } from "@/lib/validation/common";
import { addVersion, createArticle, deleteArticle, deleteDocument, updateArticle, updateDocument, uploadDocument } from "@/server/services/documents";

async function fileOf(fd: FormData) {
  const f = fd.get("file");
  return f instanceof File && f.size ? { name: f.name, size: f.size, buffer: await f.arrayBuffer() } : null;
}
const fields = (fd: FormData) => { const { file: _f, ...rest } = formToObject(fd); void _f; return rest; };

export async function uploadAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireTenant();
  const file = await fileOf(fd);
  const back = fd.get("back");
  return runAction(async () => {
    const d = await uploadDocument(ctx, fields(fd), file);
    return typeof back === "string" && back.startsWith("/projects/") ? navigateTo(back) : navigateTo(`/documents/${d.id}`);
  });
}
export async function versionAction(id: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  const file = await fileOf(fd);
  return runAction(() => addVersion(ctx, id, file, String(fd.get("comment") ?? "")).then(() => {}), "Nouvelle version déposée.");
}
export async function updateDocAction(id: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => updateDocument(ctx, id, formToObject(fd)), "Document enregistré.");
}
export async function deleteDocAction(id: string, _: ActionState): Promise<ActionState> {
  const ctx = await requireTenant();
  return runAction(async () => { await deleteDocument(ctx, id); return navigateTo("/documents"); });
}
export async function createArticleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireTenant();
  return runAction(async () => navigateTo(`/documents/knowledge/${(await createArticle(ctx, formToObject(fd))).id}`));
}
export async function updateArticleAction(id: string, _: ActionState, fd: FormData) {
  const ctx = await requireTenant();
  return runAction(() => updateArticle(ctx, id, formToObject(fd)), "Fiche enregistrée.");
}
export async function deleteArticleAction(id: string, _: ActionState): Promise<ActionState> {
  const ctx = await requireTenant();
  return runAction(async () => { await deleteArticle(ctx, id); return navigateTo("/documents?tab=knowledge"); });
}
