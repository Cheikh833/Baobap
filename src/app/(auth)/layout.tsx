import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getMessages } from "@/i18n/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { m } = await getMessages();
  const L = m.landing;
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      {/* Panneau de marque */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-deep via-[#0B4A4A] to-navy-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="mesh" aria-hidden>
          <span className="left-[10%] top-[15%] h-1/2 w-1/2 animate-drift bg-brand-400/50" />
          <span className="bottom-[5%] right-[5%] h-1/2 w-1/2 animate-drift bg-ochre/30 [animation-delay:-9s]" />
        </div>
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:40px_40px]" aria-hidden />
        <Link href="/" className="relative" aria-label={m.common.backHome}><Logo light /></Link>
        <div className="relative animate-fade-up">
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-brand-100">{L.tagline}</p>
          <p className="mt-4 font-display text-4xl font-extrabold leading-tight">{L.heroTitle1}<br /><span className="text-gradient">{L.heroTitle2}</span></p>
          <ul className="mt-8 space-y-3 text-white/85">
            {[L.trustTrial, L.trustNoCard, L.trustSecure].map((t) => <li key={t} className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-brand-300" aria-hidden />{t}</li>)}
          </ul>
        </div>
        <p className="relative text-xs text-white/50">© {new Date().getFullYear()} BAOBAB</p>
      </aside>
      {/* Formulaire */}
      <div className="flex flex-col items-center justify-center bg-canvas px-4 py-10">
        <Link href="/" className="mb-8 lg:hidden" aria-label={m.common.backHome}><Logo /></Link>
        <div className="w-full max-w-md animate-fade-up rounded-3xl border border-line/80 bg-white p-6 shadow-lift sm:p-8">{children}</div>
        <LanguageSwitcher className="mt-6" />
      </div>
    </div>
  );
}
