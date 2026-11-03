import Link from "next/link";
import { getMessages } from "@/i18n/server";
import { isResetTokenValid } from "@/server/services/password-reset";
import { ResetPasswordForm } from "../../password-forms";

export const metadata = { title: "Nouveau mot de passe" };

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [{ m }, valid] = await Promise.all([getMessages(), isResetTokenValid(token)]);
  return (
    <>
      <h1 className="text-xl font-semibold">{m.auth.resetTitle}</h1>
      {valid ? (
        <div className="mt-6"><ResetPasswordForm token={token} /></div>
      ) : (
        <>
          <p className="mt-2 text-sm text-slate-600">{m.auth.resetInvalid}</p>
          <Link className="mt-6 inline-block text-sm font-medium text-brand hover:underline" href="/forgot-password">{m.auth.forgotLink}</Link>
        </>
      )}
    </>
  );
}
