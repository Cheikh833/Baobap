"use server";
import { navigateTo, runAction, type ActionState } from "@/server/action";
import { requireUser } from "@/server/context";
import { setActiveOrganization } from "@/server/auth/session";
import { createDemoOrganization } from "@/server/services/demo";

/** Crée (ou rouvre) l'espace de démonstration de l'utilisateur et y bascule. */
export async function openDemoAction(_: ActionState): Promise<ActionState> {
  const user = await requireUser();
  return runAction(async () => {
    const demo = await createDemoOrganization(user.id);
    await setActiveOrganization(demo.id);
    return navigateTo("/dashboard");
  });
}
