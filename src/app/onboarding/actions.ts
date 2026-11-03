"use server";
import { navigateTo, runAction, type ActionState } from "@/server/action";
import { requireUser } from "@/server/context";
import { setActiveOrganization } from "@/server/auth/session";
import { createOrganization } from "@/server/services/organization";
import { formToObject } from "@/lib/validation/common";

export async function createOrganizationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  return runAction(async () => {
    const org = await createOrganization(user.id, formToObject(fd) as never);
    await setActiveOrganization(org.id);
    return navigateTo("/dashboard?welcome=1");
  });
}
