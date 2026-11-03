import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { safeNext } from "@/lib/safe-next";
import { getMessages } from "@/i18n/server";
import { SignupForm } from "../auth-forms";

export const metadata = { title: "Créer un compte" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next) ?? undefined;
  if (await getSessionUser()) redirect(next ?? "/dashboard");
  const { m } = await getMessages();
  return (
    <>
      <h1 className="text-xl font-semibold">{m.auth.signupTitle}</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">{m.auth.signupSubtitle}</p>
      <SignupForm next={next} />
    </>
  );
}
