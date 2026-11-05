import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { getInvitationByToken, wasAcceptedBy } from "@/server/services/members";
import { ButtonLink } from "@/components/ui/button";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";
import { roleLabel } from "@/i18n/roles";
import { AcceptInvitationForm } from "./accept-form";

export const metadata = { title: "Invitation" };

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [inv, user, { m }] = await Promise.all([getInvitationByToken(token), getSessionUser(), getMessages()]);
  const I = m.invitation;
  // Invitation que cet utilisateur vient d'accepter : direction l'espace de travail.
  if (!inv && user && (await wasAcceptedBy(token, user.email))) redirect("/dashboard");
  if (!inv) {
    return (
      <>
        <h1 className="text-xl font-semibold">{I.invalidTitle}</h1>
        <p className="mt-2 text-sm text-slate-600">{I.invalidText}</p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-brand hover:underline">{m.common.backHome}</Link>
      </>
    );
  }
  const next = `/invitation/${token}`;
  return (
    <>
      <h1 className="text-xl font-semibold">{fill(I.join, { org: inv.organization.name })}</h1>
      <p className="mt-2 text-sm text-slate-600">{fill(I.invitedAs, { role: roleLabel(inv.role, m), email: inv.email })}</p>
      <div className="mt-6">
        {user ? (
          user.email === inv.email ? (
            <AcceptInvitationForm token={token} />
          ) : (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{fill(I.wrongAccount, { current: user.email, email: inv.email })}</p>
          )
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <ButtonLink href={`/signup?new=1&next=${encodeURIComponent(next)}`}>{I.createAccount}</ButtonLink>
            <ButtonLink href={`/login?next=${encodeURIComponent(next)}`} variant="secondary">{I.haveAccount}</ButtonLink>
          </div>
        )}
      </div>
    </>
  );
}
