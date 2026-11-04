import Link from "next/link";
import {
  ArrowRight, BarChart3, Check, CheckCircle2, ClipboardCheck, FileText, FolderTree, Gauge, Languages, Layers, LineChart, Lock, Rocket, ShieldCheck, Sparkles, Target, Wallet, X,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import { HeroMockup } from "@/components/landing/hero-mockup";
import { Ring } from "@/components/charts/charts";
import { PLANS } from "@/lib/plans";
import { getMessages } from "@/i18n/server";

// Page d'accueil publique. Aucun client, témoignage ou logo partenaire n'est inventé ;
// l'aperçu du produit est explicitement présenté comme une illustration de l'interface.
const MODULE_ICONS = [Target, FolderTree, Layers, Wallet, ShieldCheck, BarChart3, Sparkles, FileText];
const READY = [true, true, false, false, false, false, false, false];
const CYCLE_ICONS = [Target, Layers, FolderTree, Rocket, ClipboardCheck, Gauge, LineChart, CheckCircle2, Sparkles];

export default async function LandingPage() {
  const { m, locale } = await getMessages();
  const L = m.landing;
  const fmt = (n: number) => new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(n);
  return (
    <div className="overflow-x-clip bg-white">
      <PublicHeader />
      <main>
        {/* ───── Hero ───── */}
        <section className="relative isolate overflow-hidden bg-gradient-to-br from-brand-deep via-[#0B4A4A] to-navy-900 text-white">
          <div className="mesh -z-10" aria-hidden>
            <span className="left-[5%] top-[10%] h-[45%] w-[40%] animate-drift bg-brand-400/60" />
            <span className="right-[0%] top-[0%] h-[50%] w-[40%] animate-drift bg-[#1E6FA0]/50 [animation-delay:-6s]" />
            <span className="bottom-[0%] left-[35%] h-[40%] w-[35%] animate-drift bg-ochre/35 [animation-delay:-12s]" />
          </div>
          <div className="absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" aria-hidden />

          <div className="relative mx-auto grid max-w-6xl gap-14 px-4 pb-24 pt-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pb-32 lg:pt-24">
            <div>
              <p className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-brand-100 backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse2 rounded-full bg-ochre" />{L.heroBadge}
              </p>
              <h1 className="mt-6 animate-fade-up font-display text-4xl font-extrabold leading-[1.05] tracking-tight [animation-delay:80ms] sm:text-6xl">
                {L.heroTitle1}<br /><span className="text-gradient">{L.heroTitle2}</span>
              </h1>
              <p className="mt-6 max-w-xl animate-fade-up text-lg leading-relaxed text-white/80 [animation-delay:160ms]">{L.heroText}</p>
              <div className="mt-8 flex animate-fade-up flex-wrap gap-3 [animation-delay:240ms]">
                <ButtonLink href="/signup" size="lg" className="!bg-none bg-white !text-brand-deep shadow-lift hover:!bg-brand-50">{L.ctaStart}<ArrowRight className="h-4 w-4" /></ButtonLink>
                <ButtonLink href="#plateforme" size="lg" variant="ghost" className="!text-white ring-1 ring-white/30 hover:!bg-white/10">{L.ctaDiscover}</ButtonLink>
              </div>
              <ul className="mt-8 flex animate-fade-up flex-wrap gap-x-6 gap-y-2 text-sm text-white/80 [animation-delay:320ms]">
                {[L.trustTrial, L.trustNoCard, L.trustSecure].map((t) => <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-brand-300" aria-hidden />{t}</li>)}
              </ul>
            </div>
            <HeroMockup m={m} />
          </div>
          {/* vague de transition */}
          <svg className="absolute -bottom-px left-0 w-full text-white" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden><path fill="currentColor" d="M0 80V40c240 30 480 40 720 20S1200 0 1440 30v50Z" /></svg>
        </section>

        {/* ───── Publics (défilement continu) ───── */}
        <section className="py-10" aria-label={L.audienceTitle}>
          <p className="text-center text-xs font-semibold uppercase tracking-[.18em] text-slate-500">{L.audienceTitle}</p>
          <div className="relative mt-6 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
            <ul className="flex w-max animate-marquee gap-3 hover:[animation-play-state:paused]">
              {[...L.audiences, ...L.audiences].map((a, i) => (
                <li key={i} className="whitespace-nowrap rounded-full border border-line bg-canvas px-4 py-2 text-sm font-medium text-navy">{a}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* ───── Avant / après ───── */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="reveal max-w-3xl font-display text-3xl font-bold tracking-tight sm:text-4xl">{L.problemsTitle}</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="reveal rounded-3xl border border-line bg-canvas p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{L.beforeTitle}</p>
              <ul className="mt-4 space-y-3">
                {L.problems.map((p) => <li key={p} className="flex gap-3 text-slate-700"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-danger"><X className="h-3 w-3" /></span>{p}</li>)}
              </ul>
            </div>
            <div className="reveal relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-deep to-navy p-6 text-white shadow-lift">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 animate-drift rounded-full bg-brand-400/40 blur-3xl" aria-hidden />
              <p className="relative text-sm font-semibold uppercase tracking-wide text-brand-100">{L.afterTitle}</p>
              <ul className="relative mt-4 space-y-3">
                {L.solutions.map((p) => <li key={p} className="flex gap-3"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-400 text-white"><Check className="h-3 w-3" /></span>{p}</li>)}
              </ul>
            </div>
          </div>
        </section>

        {/* ───── Cycle de pilotage ───── */}
        <section className="relative overflow-hidden bg-canvas py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="reveal max-w-3xl font-display text-3xl font-bold tracking-tight sm:text-4xl">{L.cycleTitle}</h2>
            <p className="reveal mt-3 max-w-2xl text-slate-600">{L.cycleText}</p>
            <ol className="relative mt-12 grid grid-cols-3 gap-y-8 sm:grid-cols-5 lg:grid-cols-9">
              <svg className="absolute left-0 top-6 hidden h-2 w-full lg:block" preserveAspectRatio="none" viewBox="0 0 100 2" aria-hidden>
                <line x1="5" y1="1" x2="95" y2="1" stroke="#087F68" strokeWidth="0.4" strokeDasharray="1.2 1.2" className="animate-[marquee_30s_linear_infinite]" />
              </svg>
              {L.steps.map((s, i) => {
                const Icon = CYCLE_ICONS[i];
                return (
                  <li key={s} className="reveal relative flex flex-col items-center text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand/20 bg-white text-brand shadow-soft transition duration-300 hover:-translate-y-1 hover:bg-brand hover:text-white hover:shadow-glow">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="mt-3 text-sm font-semibold text-navy">{s}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* ───── Modules ───── */}
        <section id="plateforme" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
          <h2 className="reveal font-display text-3xl font-bold tracking-tight sm:text-4xl">{L.platformTitle}</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {L.modules.map(([title, text], i) => {
              const Icon = MODULE_ICONS[i];
              return (
                <article key={title} className="reveal group relative overflow-hidden rounded-2xl border border-line bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-lift">
                  <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-50 opacity-0 transition duration-500 group-hover:opacity-100" aria-hidden />
                  <span className={`relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${READY[i] ? "from-brand to-brand-400 text-white shadow-glow" : "from-slate-100 to-slate-50 text-brand"}`}>
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="relative mt-4 font-display font-semibold">{title}</h3>
                  <p className="relative mt-1 text-sm text-slate-600">{text}</p>
                  <p className={`relative mt-4 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${READY[i] ? "bg-brand-50 text-brand-deep" : "bg-slate-100 text-slate-500"}`}>{READY[i] ? m.common.available : m.common.inProgress}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ───── Focus Stratégie ───── */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-12 lg:grid-cols-2">
          <div className="reveal">
            <h2 className="font-display text-3xl font-bold tracking-tight">{L.spotStrategyTitle}</h2>
            <p className="mt-4 text-slate-600">{L.spotStrategyText}</p>
            <ul className="mt-6 space-y-3">{L.spotStrategyPoints.map((p) => <li key={p} className="flex items-center gap-3 font-medium"><CheckCircle2 className="h-5 w-5 text-brand" aria-hidden />{p}</li>)}</ul>
          </div>
          <div className="reveal relative rounded-3xl border border-line bg-gradient-to-br from-white to-brand-50/60 p-6 shadow-soft" aria-hidden>
            <div className="flex flex-wrap items-center gap-6">
              <Ring value={75} label={m.strategy.coverage} size={132} />
              <ul className="min-w-0 flex-1 space-y-3 text-sm">
                {[["OS1.1", 100, "bg-brand"], ["OS1.2", 70, "bg-brand-400"], ["OS2.1", 45, "bg-ochre"], ["OS2.2", 0, "bg-slate-300"]].map(([c, w, col]) => (
                  <li key={c as string}>
                    <div className="flex justify-between text-xs"><span className="font-mono font-semibold">{c}</span><span className="text-slate-500">{w ? `${w} %` : m.strategy.notCovered}</span></div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full origin-left animate-grow-x rounded-full ${col}`} style={{ width: `${w || 4}%` }} /></div>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-4 text-right text-[10px] text-slate-400">{L.illustration}</p>
          </div>
        </section>

        {/* ───── Focus Projets ───── */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-12 lg:grid-cols-2">
          <div className="reveal order-2 lg:order-1" aria-hidden>
            <div className="grid grid-cols-3 gap-3 rounded-3xl border border-line bg-canvas p-4 shadow-soft">
              {[[m.status.PREPARATION, "bg-info", 2], [m.status.ACTIVE, "bg-brand", 3], [m.status.CLOSED, "bg-brand-deep", 1]].map(([col, color, n], ci) => (
                <div key={col as string} className="space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600"><span className={`h-2 w-2 rounded-full ${color}`} />{col}</p>
                  {Array.from({ length: n as number }).map((_, i) => (
                    <div key={i} className="animate-float rounded-xl border border-line bg-white p-2.5 shadow-sm" style={{ animationDelay: `${-(ci * 2 + i)}s` }}>
                      <span className="block h-2 w-3/4 rounded bg-slate-200" /><span className="mt-1.5 block h-2 w-1/2 rounded bg-slate-100" />
                      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full rounded-full ${color}`} style={{ width: `${40 + ((ci + i) * 17) % 55}%` }} /></span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="reveal order-1 lg:order-2">
            <h2 className="font-display text-3xl font-bold tracking-tight">{L.spotProjectsTitle}</h2>
            <p className="mt-4 text-slate-600">{L.spotProjectsText}</p>
            <ul className="mt-6 space-y-3">{L.spotProjectsPoints.map((p) => <li key={p} className="flex items-center gap-3 font-medium"><CheckCircle2 className="h-5 w-5 text-brand" aria-hidden />{p}</li>)}</ul>
          </div>
        </section>

        {/* ───── Confiance ───── */}
        <section className="relative mt-12 overflow-hidden bg-navy-900 py-20 text-white">
          <div className="pointer-events-none absolute -left-20 top-0 h-80 w-80 animate-drift rounded-full bg-brand/30 blur-3xl" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4">
            <h2 className="reveal font-display text-3xl font-bold tracking-tight sm:text-4xl">{L.trustTitle}</h2>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {L.trust.map((t, i) => {
                const Icon = [Lock, ShieldCheck, ClipboardCheck, LineChart, Sparkles][i] ?? ShieldCheck;
                return (
                  <li key={t} className="reveal rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:border-brand-300/40 hover:bg-white/[.08]">
                    <Icon className="h-6 w-6 text-brand-300" aria-hidden />
                    <p className="mt-3 text-sm leading-relaxed text-white/85">{t}</p>
                  </li>
                );
              })}
              <li className="reveal rounded-2xl border border-ochre/30 bg-ochre/10 p-5">
                <Languages className="h-6 w-6 text-ochre" aria-hidden />
                <p className="mt-3 font-semibold">{L.languagesTitle}</p>
                <p className="mt-1 text-sm text-white/80">{L.languagesText}</p>
              </li>
            </ul>
          </div>
        </section>

        {/* ───── Tarifs (aperçu) ───── */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <div className="reveal flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight">{L.pricingTeaserTitle}</h2>
              <p className="mt-2 text-slate-600">{L.pricingTeaserText}</p>
            </div>
            <Link href="/pricing" className="group inline-flex items-center gap-1 font-semibold text-brand">{L.seePricing}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PLANS.filter((p) => p.monthlyXof !== null).map((p) => (
              <Link key={p.code} href="/pricing" className={`reveal group rounded-2xl border p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lift ${p.highlighted ? "border-brand bg-gradient-to-br from-brand-50 to-white ring-1 ring-brand" : "border-line bg-white"}`}>
                <p className="font-display text-lg font-bold">{m.plans[p.code].name}</p>
                <p className="mt-1 min-h-10 text-sm text-slate-600">{m.plans[p.code].audience}</p>
                <p className="mt-4 text-xs text-slate-500">{L.from}</p>
                <p className="font-display text-3xl font-bold tabular">{fmt(p.monthlyXof!)} <span className="text-base font-semibold">FCFA</span><span className="text-sm font-medium text-slate-500"> {m.common.perMonth}</span></p>
              </Link>
            ))}
          </div>
        </section>

        {/* ───── FAQ ───── */}
        <section className="bg-canvas py-20">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="reveal text-center font-display text-3xl font-bold tracking-tight">{L.faqTitle}</h2>
            <div className="mt-8 space-y-3">
              {L.faq.map(([q, a]) => (
                <details key={q} className="reveal group rounded-2xl border border-line bg-white p-5 transition open:shadow-soft">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    {q}<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand transition-transform duration-300 group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ───── Appel final ───── */}
        <section className="px-4 py-20">
          <div className="reveal relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand via-brand-deep to-navy px-6 py-16 text-center text-white shadow-lift">
            <div className="mesh" aria-hidden>
              <span className="left-[10%] top-[10%] h-1/2 w-1/3 animate-drift bg-brand-300/50" />
              <span className="bottom-0 right-[10%] h-1/2 w-1/3 animate-drift bg-ochre/40 [animation-delay:-8s]" />
            </div>
            <div className="relative">
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{L.finalTitle}</h2>
              <p className="mx-auto mt-3 max-w-xl text-white/80">{L.trustTrial} · {L.trustNoCard}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <ButtonLink href="/signup" size="lg" className="!bg-none bg-white !text-brand-deep hover:!bg-brand-50">{L.finalCta}<ArrowRight className="h-4 w-4" /></ButtonLink>
                <ButtonLink href="/pricing" size="lg" variant="ghost" className="!text-white ring-1 ring-white/30 hover:!bg-white/10">{m.common.pricing}</ButtonLink>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
