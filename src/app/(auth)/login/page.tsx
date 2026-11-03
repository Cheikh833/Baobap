import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { safeNext } from "@/lib/safe-next";
import { getMessages } from "@/i18n/server";
import { LoginForm } from "../auth-forms";

export const metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next) ?? undefined;
  if (await getSessionUser()) redirect(next ?? "/dashboard");
  const { m } = await getMessages();
  return (
    <>
      <h1 className="text-xl font-semibold">{m.auth.loginTitle}</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">{m.auth.loginSubtitle}</p>
      {sp.reset && <p role="status" className="mb-4 rounded-lg border border-success/30 bg-green-50 px-3 py-2 text-sm text-green-800">{m.auth.resetDone}</p>}
      <LoginForm next={next} />
    </>
  );
}
