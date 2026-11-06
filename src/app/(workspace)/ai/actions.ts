"use server";
import { navigateTo, runAction, type ActionState } from "@/server/action";
import { requireTenant } from "@/server/context";
import { ask, deleteConversation } from "@/server/services/ai";
import { getLocale } from "@/i18n/server";

export async function askAction(conversationId: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireTenant();
  const locale = await getLocale();
  return runAction(async () => {
    const r = await ask(ctx, conversationId, String(fd.get("question") ?? ""), locale);
    return navigateTo(`/ai?c=${r.conversationId}#fin`);
  });
}
export async function deleteChatAction(id: string, _: ActionState): Promise<ActionState> {
  const ctx = await requireTenant();
  return runAction(async () => { await deleteConversation(ctx, id); return navigateTo("/ai"); });
}
