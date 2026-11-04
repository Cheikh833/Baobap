import Link from "next/link";
import { Logo } from "@/components/logo";
import { requireUser } from "@/server/context";
import { listUserOrganizations } from "@/server/services/organization";
import { OrganizationForm } from "./org-form";
import { ActionForm } from "@/components/forms/action-form";
import { openDemoAction } from "../demo-actions";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";
import { LanguageSwitcher } from "@/components/language-switcher";

export const metadata = { title: "Créer une organisation" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const orgs = await listUserOrganizations(user.id);
  const { m } = await getMessages();
  const O = m.onboarding;
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {orgs.length > 0 && <Link href="/dashboard" className="text-sm text-brand hover:underline">{O.back}</Link>}
        </div>
      </div>
      <div className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-brand">{fill(O.welcome, { name: user.name })}</p>
        <h1 className="mt-1 text-xl font-semibold">{O.title}</h1>
        <p className="mb-6 mt-1 text-sm text-slate-600">{O.text}</p>
        <OrganizationForm />
      </div>
      <div className="mt-6 rounded-2xl border border-ochre/30 bg-gradient-to-br from-white to-ochre-50 p-5">
        <p className="text-sm text-slate-700">{m.demo.onboarding}</p>
        <div className="mt-3"><ActionForm action={openDemoAction} submitLabel={m.demo.create} submitVariant="secondary" className="space-y-2" /></div>
      </div>
    </div>
  );
}
