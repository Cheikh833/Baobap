import { Fragment } from "react";
import Link from "next/link";
import {
  ArrowRight, BarChart3, Check, ChevronDown, CheckCircle2, ClipboardCheck, FileText, FolderTree, Gauge, Languages, Layers, LineChart, Lock, Rocket, ShieldCheck, Sparkles, Target, Wallet, X,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import { HeroMockup } from "@/components/landing/hero-mockup";
import { CeremonyTree, Fireflies } from "@/components/landing/ceremony-tree";
import { CountUp } from "@/components/charts/count-up";
import { ALL_PERMISSIONS, SYSTEM_ROLES } from "@/server/permissions/catalog";
import { LOCALES } from "@/i18n/config";
import { Ring } from "@/components/charts/charts";
import { PLANS } from "@/lib/plans";
import { getMessages } from "@/i18n/server";

// Page d'accueil publique. Aucun client, témoignage ou logo partenaire n'est inventé ;
// l'aperçu du produit est explicitement présenté comme une illustration de l'interface.
const MODULE_ICONS = [Target, FolderTree, Layers, Wallet, ShieldCheck, BarChart3, Sparkles, FileText];
const READY = [true, true, true, true, true, true, false, false];
// Modules utilisables aujourd'hui : organisation, stratégie, portefeuilles-programmes-projets, planification,
// suivi-évaluation, finances, risques, analyse de données.
const OPERATIONAL_MODULES = 8;
const CYCLE_ICONS = [Target, Layers, FolderTree, Rocket, ClipboardCheck, Gauge, LineChart, CheckCircle2, Sparkles];

export default async function LandingPage() {
  const { m, locale } = await getMessages();
  const L = m.landing;
  const fmt = (n: number) => new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(n);
  return (
    <div className="overflow-x-clip bg-white">
      <PublicHeader />
      <main>
        {/* ───── Cérémonie d'ouverture ───── */}
        <section className="relative isolate overflow-hidden bg-[radial-gradient(ellipse_at_50%_110%,#0F5A50_0%,#0B2E3A_45%,#081B28_100%)] text-white">
          <div className="mesh -z-10" aria-hidden>
            <span className="left-[0%] top-[5%] h-[45%] w-[40%] animate-drift bg-brand-400/35" />
            <span className="right-[0%] top-[10%] h-[50%] w-[40%] animate-drift bg-[#1E6FA0]/35 [animation-delay:-6s]" />
            <span className="bottom-[0%] left-[30%] h-[45%] w-[40%] animate-drift bg-ochre/25 [animation-delay:-12s]" />
          </div>
          {/* rayons lumineux tournant lentement */}
          <div className="pointer-events-none absolute left-1/2 top-[55%] -z-10 h-[160vmax] w-[160vmax] -translate-x-1/2 -translate-y-1/2 opacity-[.045]" aria-hidden>
            <div className="h-full w-full animate-spin-slow rounded-full [background:repeating-conic-gradient(from_0deg,#F6C66B_0deg_4deg,transparent_4deg_18deg)]" />
          </div>
          <Fireflies />

          <div className="relative mx-auto grid min-h-[calc(100svh-64px)] max-w-6xl items-center gap-4 px-4 pb-24 pt-6 sm:gap-8 sm:pt-12 lg:grid-cols-[1.1fr_1fr] lg:pb-28 lg:pt-8">
            <div className="text-center lg:text-left">
              <p className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-brand-100 backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse2 rounded-full bg-ochre" />{L.heroBadge}
              </p>
              <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl">
                {L.tagline.split(" ").map((w, i, all) => (
                  <span key={w} className={`block animate-word-in ${i === all.length - 1 ? "text-gradient" : ""}`} style={{ animationDelay: `${0.3 + i * 0.45}s` }}>{w}</span>
                ))}
              </h1>
              <p className="mt-6 animate-fade-up font-display text-xl font-semibold text-white sm:text-2xl" style={{ animationDelay: "1.6s" }}>{L.ceremony.lead}</p>
              <p className="mx-auto mt-3 max-w-xl animate-fade-up text-base leading-relaxed text-white/75 sm:text-lg lg:mx-0" style={{ animationDelay: "1.8s" }}>{L.heroText}</p>
              <div className="mt-8 flex animate-fade-up flex-wrap justify-center gap-3 lg:justify-start" style={{ animationDelay: "2.1s" }}>
                <ButtonLink href="/signup" size="lg" className="relative !bg-none bg-white !text-brand-deep shadow-[0_0_0_0_rgba(246,198,107,.6)] hover:!bg-brand-50 hover:shadow-[0_0_40px_4px_rgba(246,198,107,.45)]">{L.ctaStart}<ArrowRight className="h-4 w-4" /></ButtonLink>
                <ButtonLink href="#cockpit" size="lg" variant="ghost" className="!text-white ring-1 ring-white/30 hover:!bg-white/10">{L.ctaDiscover}</ButtonLink>
              </div>
              <ul className="mt-8 flex animate-fade-up flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/80 lg:justify-start" style={{ animationDelay: "2.4s" }}>
                {[L.trustTrial, L.trustNoCard, L.trustSecure].map((t) => <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-brand-300" aria-hidden />{t}</li>)}
              </ul>
            </div>
            <div className="order-first mx-auto w-full max-w-[300px] sm:max-w-md lg:order-none lg:max-w-none">
              <CeremonyTree nodes={L.ceremony.nodes} roots={L.ceremony.roots} impact={L.ceremony.impact} aria={L.ceremony.aria} />
            </div>
          </div>
          <a href="#cockpit" className="absolute bottom-16 left-1/2 hidden -translate-x-1/2 animate-fade-in flex-col items-center gap-1 text-[11px] font-semibold uppercase tracking-[.2em] text-white/60 hover:text-white sm:flex" style={{ animationDelay: "5s" }}>
            {L.ceremony.scroll}<ChevronDown className="h-4 w-4 animate-bounce-soft" aria-hidden />
          </a>
          <svg className="absolute -bottom-px left-0 w-full text-[#0B2233]" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden><path fill="currentColor" d="M0 80V40c240 30 480 40 720 20S1200 0 1440 30v50Z" /></svg>
        </section>

        {/* ───── Le cockpit ───── */}
        <section id="cockpit" className="relative isolate scroll-mt-16 overflow-hidden bg-[#0B2233] pb-24 pt-12 text-white">
          <div className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-96 w-[70%] -translate-x-1/2 rounded-full bg-brand/30 blur-3xl" aria-hidden />
          <div className="mx-auto max-w-6xl px-4">
            <div className="reveal mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-ochre">{L.cockpitKicker}</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">{L.cockpitTitle}</h2>
              <p className="mt-4 text-white/75">{L.cockpitText}</p>
            </div>
            <div className="reveal mx-auto mt-12 max-w-3xl [perspective:1600px]">
              <div className="transition-transform duration-700 [transform:rotateX(10deg)] hover:[transform:rotateX(0deg)]"><HeroMockup m={m} /></div>
            </div>
          </div>
          <svg className="absolute -bottom-px left-0 w-full text-white" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden><path fill="currentColor" d="M0 80V50c260-40 520-40 760-10s460 30 680-10v50Z" /></svg>
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

        {/* ───── Focus Suivi-évaluation ───── */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-12 lg:grid-cols-2">
          <div className="reveal">
            <h2 className="font-display text-3xl font-bold tracking-tight">{L.spotMealTitle}</h2>
            <p className="mt-4 text-slate-600">{L.spotMealText}</p>
            <ul className="mt-6 space-y-3">{L.spotMealPoints.map((p) => <li key={p} className="flex items-center gap-3 font-medium"><CheckCircle2 className="h-5 w-5 text-brand" aria-hidden />{p}</li>)}</ul>
          </div>
          <div className="reveal relative rounded-3xl border border-line bg-gradient-to-br from-white to-brand-50/60 p-6 shadow-soft" aria-hidden>
            <div className="flex items-baseline justify-between">
              <p className="font-display text-sm font-semibold">IND-1 · {m.meal.rate}</p>
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">{m.meal.track.good}</span>
            </div>
            <svg viewBox="0 0 400 170" className="mt-3 h-auto w-full">
              <defs><linearGradient id="spot-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#087F68" stopOpacity=".28" /><stop offset="100%" stopColor="#087F68" stopOpacity="0" /></linearGradient></defs>
              <line x1="10" x2="390" y1="30" y2="30" stroke="#D99A2B" strokeWidth="2" strokeDasharray="6 4" />
              <text x="390" y="22" textAnchor="end" fontSize="11" fontWeight="600" fill="#9A6A12">{m.meal.fields.target}</text>
              <line x1="10" x2="390" y1="140" y2="140" stroke="#94A3B8" strokeWidth="1.5" />
              <path d="M10 132 L70 118 L130 104 L190 88 L250 74 L310 60 L370 48 L370 150 L10 150 Z" fill="url(#spot-area)" className="animate-fade-in" />
              <path d="M10 132 L70 118 L130 104 L190 88 L250 74 L310 60 L370 48" fill="none" stroke="#087F68" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="animate-draw" style={{ strokeDasharray: 1, ["--dash" as string]: 1, ["--dash-to" as string]: 0 }} />
              {[[10, 132], [70, 118], [130, 104], [190, 88], [250, 74], [310, 60], [370, 48]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4.5" fill="#fff" stroke="#087F68" strokeWidth="2.5" className="fb animate-node" style={{ animationDelay: `${0.4 + i * 0.12}s` }} />)}
            </svg>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[78%] origin-left animate-grow-x rounded-full bg-success" /></div>
            <p className="mt-4 text-right text-[10px] text-slate-400">{L.illustration}</p>
          </div>
        </section>

        {/* ───── Focus Analyse de données ───── */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-12 lg:grid-cols-2">
          <div className="reveal order-2 lg:order-1" aria-hidden>
            <div className="rounded-3xl border border-line bg-canvas p-5 shadow-soft">
              <div className="grid grid-cols-[auto_1fr_1fr] gap-1 text-center text-xs">
                <span />
                <span className="py-1 font-semibold text-slate-500">A</span><span className="py-1 font-semibold text-slate-500">B</span>
                {[["X", 72, 28], ["Y", 31, 69]].map(([r, a, b]) => (
                  <Fragment key={r}><span className="px-2 py-3 text-left font-semibold text-slate-500">{r}</span>
                  {[a, b].map((v, j) => <span key={j} className="rounded-lg py-3 font-display text-base font-bold tabular text-navy" style={{ background: `rgba(8,127,104,${(v as number) / 220})` }}>{v} %</span>)}</Fragment>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-white p-3 text-xs">
                <p className="font-mono">χ² = 13,85 · ddl = 1 · p &lt; 0,001</p>
                <p className="mt-1 text-slate-500">V de Cramér = 0,24</p>
              </div>
              <div className="mt-4 flex h-20 items-end gap-1.5">
                {[30, 56, 44, 22, 20, 21, 20, 12, 15].map((h, i) => <span key={i} className="flex-1 origin-bottom animate-grow-y rounded-t bg-gradient-to-t from-brand to-brand-400" style={{ height: `${h * 1.6}%`, animationDelay: `${i * 60}ms` }} />)}
              </div>
              <p className="mt-3 text-right text-[10px] text-slate-400">{L.illustration}</p>
            </div>
          </div>
          <div className="reveal order-1 lg:order-2">
            <h2 className="font-display text-3xl font-bold tracking-tight">{L.spotDataTitle}</h2>
            <p className="mt-4 text-slate-600">{L.spotDataText}</p>
            <ul className="mt-6 space-y-3">{L.spotDataPoints.map((p) => <li key={p} className="flex items-center gap-3 font-medium"><CheckCircle2 className="h-5 w-5 text-brand" aria-hidden />{p}</li>)}</ul>
          </div>
        </section>

        {/* ───── BAOBAB, concrètement (faits vérifiables, aucun chiffre d'audience) ───── */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="reveal text-center font-display text-3xl font-bold tracking-tight">{L.factsTitle}</h2>
          <p className="reveal mx-auto mt-2 max-w-xl text-center text-sm text-slate-500">{L.factsNote}</p>
          <dl className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {([[OPERATIONAL_MODULES, L.facts.modules], [SYSTEM_ROLES.length, L.facts.roles], [ALL_PERMISSIONS.length, L.facts.permissions], [LOCALES.length, L.facts.languages], [0, L.facts.invented]] as const).map(([v, l], i) => (
              <div key={l} className={`reveal rounded-2xl border p-5 text-center ${i === 4 ? "border-ochre/40 bg-amber-50/60" : "border-line bg-white"}`}>
                <dt className="sr-only">{l}</dt>
                <dd className="font-display text-4xl font-extrabold text-brand-deep"><CountUp value={v} locale={locale === "en" ? "en-US" : "fr-FR"} /></dd>
                <dd className="mt-1 text-sm text-slate-600">{l}</dd>
              </div>
            ))}
          </dl>
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
