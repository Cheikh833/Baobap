"use server";
import { navigateTo, runAction, type ActionState } from "@/server/action";
import { requireUser } from "@/server/context";
import { setActiveOrganization } from "@/server/auth/session";
import { acceptInvitation } from "@/server/services/members";

export async function acceptInvitationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  return runAction(async () => {
    const orgId = await acceptInvitation(user, String(fd.get("token") ?? ""));
    await setActiveOrganization(orgId);
    return navigateTo("/dashboard");
  });
}
