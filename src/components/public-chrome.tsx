import Link from "next/link";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { deviceHints, getSessionUser } from "@/server/auth/session";
import { getMessages } from "@/i18n/server";

export async function PublicHeader() {
  const [user, { m }, hints] = await Promise.all([getSessionUser(), getMessages(), deviceHints()]);
  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-white/80 shadow-[0_1px_0_rgba(16,42,67,.03)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
        <Link href="/" aria-label="BAOBAB"><Logo /></Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/demo" className="hidden px-2 text-sm font-semibold text-brand hover:text-brand-deep md:block">▶ {m.guest.cta}</Link>
          <Link href="/pricing" className="hidden px-2 text-sm font-medium text-navy hover:text-brand sm:block">{m.common.pricing}</Link>
          <LanguageSwitcher className="hidden sm:flex" />
          {user ? (
            <ButtonLink href="/dashboard" size="sm">{m.common.openWorkspace}</ButtonLink>
          ) : (
            <>
              {/* Appareil déjà utilisé : la connexion passe au premier plan. */}
              <ButtonLink href="/login" variant={hints.known ? "primary" : "ghost"} size="sm">{m.common.signIn}</ButtonLink>
              {!hints.known && <ButtonLink href="/signup" size="sm">{m.common.signUp}</ButtonLink>}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export async function PublicFooter() {
  const { m } = await getMessages();
  return (
    <footer className="bg-navy py-10 text-sm text-slate-300">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
        <Logo light />
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/pricing" className="hover:text-white">{m.common.pricing}</Link>
          <Link href="/legal/terms" className="hover:text-white">{m.legal.terms}</Link>
          <Link href="/legal/privacy" className="hover:text-white">{m.legal.privacy}</Link>
          <Link href="/legal/notice" className="hover:text-white">{m.legal.notice}</Link>
          <LanguageSwitcher className="[&_select]:bg-navy [&_select]:text-white" />
        </div>
        <p>© {new Date().getFullYear()} BAOBAB — {m.landing.tagline}</p>
      </div>
    </footer>
  );
}
