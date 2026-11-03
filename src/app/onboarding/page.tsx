import Link from "next/link";
import { Logo } from "@/components/logo";
import { requireUser } from "@/server/context";
import { listUserOrganizations } from "@/server/services/organization";
import { OrganizationForm } from "./org-form";

export const metadata = { title: "Créer une organisation" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const orgs = await listUserOrganizations(user.id);
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <Logo />
        {orgs.length > 0 && <Link href="/dashboard" className="text-sm text-brand hover:underline">Retour à mon espace</Link>}
      </div>
      <div className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-brand">Bienvenue, {user.name}</p>
        <h1 className="mt-1 text-xl font-semibold">Créer votre organisation</h1>
        <p className="mb-6 mt-1 text-sm text-slate-600">
          Vous en serez propriétaire. Vous pourrez compléter le profil institutionnel et inviter votre équipe ensuite.
          Si une organisation vous a invité, ouvrez plutôt le lien d&apos;invitation reçu.
        </p>
        <OrganizationForm />
      </div>
    </div>
  );
}
