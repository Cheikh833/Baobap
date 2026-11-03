"use server";
import { headers } from "next/headers";
import { navigateTo, runAction, type ActionState } from "@/server/action";
import { baseUrl } from "@/server/base-url";
import { requestPasswordReset, resetPassword } from "@/server/services/password-reset";
import { getMessages } from "@/i18n/server";

export async function forgotPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { m } = await getMessages();
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return runAction(async () => {
    const r = await requestPasswordReset(fd.get("email"), await baseUrl(), ip);
    return r.mail ? { ok: true, message: m.auth.forgotSent } : { ok: false, message: m.auth.forgotNoMail };
  });
}

export async function resetPasswordAction(token: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    await resetPassword(token, fd.get("password"));
    return navigateTo("/login?reset=1");
  });
}
