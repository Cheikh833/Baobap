import Link from "next/link";
import { getSessionUser } from "@/server/auth/session";
import { getInvitationByToken } from "@/server/services/members";
import { ButtonLink } from "@/components/ui/button";
import { AcceptInvitationForm } from "./accept-form";

export const metadata = { title: "Invitation" };

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await getInvitationByToken(token);
  if (!inv) {
    return (
      <>
        <h1 className="text-xl font-semibold">Invitation invalide</h1>
        <p className="mt-2 text-sm text-slate-600">Cette invitation est expirée, révoquée ou déjà utilisée. Demandez une nouvelle invitation à l&apos;administrateur de l&apos;organisation.</p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-brand hover:underline">Retour à l&apos;accueil</Link>
      </>
    );
  }
  const user = await getSessionUser();
  const next = `/invitation/${token}`;
  return (
    <>
      <h1 className="text-xl font-semibold">Rejoindre {inv.organization.name}</h1>
      <p className="mt-2 text-sm text-slate-600">Vous êtes invité(e) avec le rôle <strong>{inv.role.name}</strong>. Invitation destinée à <strong>{inv.email}</strong>.</p>
      <div className="mt-6">
        {user ? (
          user.email === inv.email ? (
            <AcceptInvitationForm token={token} />
          ) : (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Vous êtes connecté(e) en tant que {user.email}. Déconnectez-vous puis connectez-vous avec {inv.email}.</p>
          )
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <ButtonLink href={`/signup?next=${encodeURIComponent(next)}`}>Créer mon compte</ButtonLink>
            <ButtonLink href={`/login?next=${encodeURIComponent(next)}`} variant="secondary">J&apos;ai déjà un compte</ButtonLink>
          </div>
        )}
      </div>
    </>
  );
}
