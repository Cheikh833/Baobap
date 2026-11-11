import Link from "next/link";
import { redirect } from "next/navigation";
import { deviceHints, getSessionUser } from "@/server/auth/session";
import { safeNext } from "@/lib/safe-next";
import { getMessages } from "@/i18n/server";
import { LoginForm } from "../auth-forms";
import { SocialButtons } from "../social-buttons";

export const metadata = { title: "Connexion" };

const ERRORS = ["denied", "state", "verify", "email", "provider"] as const;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string; known?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next) ?? undefined;
  if (await getSessionUser()) redirect(next ?? "/dashboard");
  const [{ m }, hints] = await Promise.all([getMessages(), deviceHints()]);
  const error = ERRORS.find((e) => e === sp.error);
  return (
    <>
      <h1 className="text-xl font-semibold">{m.auth.loginTitle}</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">{m.auth.loginSubtitle}</p>
      {sp.known && <p role="status" className="mb-4 rounded-lg border border-brand/30 bg-brand-50 px-3 py-2 text-sm text-brand-deep">{m.auth.oauth.welcomeBack}</p>}
      {sp.reset && <p role="status" className="mb-4 rounded-lg border border-success/30 bg-green-50 px-3 py-2 text-sm text-green-800">{m.auth.resetDone}</p>}
      {error && <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-red-800">{m.auth.oauth.errors[error]}</p>}
      <SocialButtons m={m} next={next} lastMethod={hints.method} />
      <LoginForm next={next} />
      <p className="mt-6 border-t border-line pt-4 text-center text-sm"><Link href="/demo" className="font-semibold text-brand hover:underline">▶ {m.guest.cta}</Link> <span className="text-xs text-slate-500">· {m.guest.ctaHint}</span></p>
    </>
  );
}
