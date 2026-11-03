"use server";
import { headers } from "next/headers";
import { navigateTo, runAction, type ActionState } from "@/server/action";
import { createSession } from "@/server/auth/session";
import { authenticate, registerUser } from "@/server/services/auth";
import { formToObject } from "@/lib/validation/common";
import { safeNext } from "@/lib/safe-next";
import { signupFormSchema } from "@/lib/validation/schemas";

export async function signupAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const next = safeNext(fd.get("next"));
  return runAction(async () => {
    const data = signupFormSchema.parse(formToObject(fd));
    const user = await registerUser(data, { termsAccepted: true });
    await createSession(user.id);
    return navigateTo(next ?? "/onboarding");
  });
}

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const next = safeNext(fd.get("next"));
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return runAction(async () => {
    const user = await authenticate(formToObject(fd) as never, ip);
    await createSession(user.id);
    return navigateTo(next ?? "/dashboard");
  });
}
