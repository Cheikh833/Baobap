import Link from "next/link";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getSessionUser } from "@/server/auth/session";
import { getMessages } from "@/i18n/server";

export async function PublicHeader() {
  const [user, { m }] = await Promise.all([getSessionUser(), getMessages()]);
  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
        <Link href="/" aria-label="BAOBAB"><Logo /></Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/pricing" className="hidden px-2 text-sm font-medium text-navy hover:text-brand sm:block">{m.common.pricing}</Link>
          <LanguageSwitcher className="hidden sm:flex" />
          {user ? (
            <ButtonLink href="/dashboard" size="sm">{m.common.openWorkspace}</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">{m.common.signIn}</ButtonLink>
              <ButtonLink href="/signup" size="sm">{m.common.signUp}</ButtonLink>
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
          <LanguageSwitcher className="[&_select]:bg-navy [&_select]:text-white" />
        </div>
        <p>© {new Date().getFullYear()} BAOBAB — {m.landing.tagline}</p>
      </div>
    </footer>
  );
}
