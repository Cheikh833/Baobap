import { redirect } from "next/navigation";
import { deviceHints, getSessionUser } from "@/server/auth/session";
import { safeNext } from "@/lib/safe-next";
import { getMessages } from "@/i18n/server";
import { SignupForm } from "../auth-forms";
import { SocialButtons } from "../social-buttons";

export const metadata = { title: "Créer un compte" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string; new?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next) ?? undefined;
  if (await getSessionUser()) redirect(next ?? "/dashboard");
  const hints = await deviceHints();
  // Appareil déjà utilisé : on ne repropose pas l'inscription, on renvoie vers la connexion
  // (un lien permet tout de même de créer un autre compte).
  if (hints.known && !sp.new) redirect(`/login?known=1${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  const { m } = await getMessages();
  return (
    <>
      <h1 className="text-xl font-semibold">{m.auth.signupTitle}</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">{m.auth.signupSubtitle}</p>
      <SocialButtons m={m} next={next} lastMethod={hints.method} />
      <SignupForm next={next} />
    </>
  );
}
