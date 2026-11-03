import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { safeNext } from "@/lib/safe-next";
import { SignupForm } from "../auth-forms";

export const metadata = { title: "Créer un compte" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next) ?? undefined;
  if (await getSessionUser()) redirect(next ?? "/dashboard");
  return (
    <>
      <h1 className="text-xl font-semibold">Créer un compte</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">Vous pourrez ensuite créer votre organisation ou rejoindre une organisation qui vous a invité.</p>
      <SignupForm next={next} />
    </>
  );
}
