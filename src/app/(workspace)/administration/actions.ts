"use server";
import { runAction, type ActionState } from "@/server/action";
import { requireUser } from "@/server/context";
import { currentSessionId } from "@/server/auth/session";
import { revokeOtherSessions, unlinkAccount } from "@/server/services/administration";

export async function revokeOthersAction(_: ActionState) {
  const user = await requireUser();
  const current = await currentSessionId();
  return runAction(async () => { const n = await revokeOtherSessions(user.id, current); return { ok: true, message: `Déconnexion de ${n} autre(s) appareil(s).` }; });
}
export async function unlinkAction(accountId: string, _: ActionState) {
  const user = await requireUser();
  return runAction(() => unlinkAccount(user.id, accountId), "Compte détaché.");
}
