import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "../auth-forms";

export const metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next) ?? undefined;
  if (await getSessionUser()) redirect(next ?? "/dashboard");
  return (
    <>
      <h1 className="text-xl font-semibold">Connexion</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">Accédez à votre espace de pilotage.</p>
      <LoginForm next={next} />
    </>
  );
}
