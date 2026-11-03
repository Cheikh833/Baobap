import Link from "next/link";
import { getMessages } from "@/i18n/server";
import { ForgotPasswordForm } from "../password-forms";

export const metadata = { title: "Mot de passe oublié" };

export default async function ForgotPasswordPage() {
  const { m } = await getMessages();
  return (
    <>
      <h1 className="text-xl font-semibold">{m.auth.forgotTitle}</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">{m.auth.forgotText}</p>
      <ForgotPasswordForm />
      <p className="mt-4 text-center text-sm"><Link className="font-medium text-brand hover:underline" href="/login">{m.auth.goLogin}</Link></p>
    </>
  );
}
