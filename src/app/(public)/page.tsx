import { BarChart3, FileText, FolderTree, Languages, Layers, LineChart, ShieldCheck, Sparkles, Target, Wallet } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import { getMessages } from "@/i18n/server";

// Landing page publique. Aucun client, témoignage, chiffre ou logo partenaire n'est inventé.
const MODULE_ICONS = [Target, FolderTree, Layers, Wallet, ShieldCheck, BarChart3, Sparkles, FileText];
const READY = [false, true, false, false, false, false, false, false];

export default async function LandingPage() {
  const { m } = await getMessages();
  const L = m.landing;
  return (
    <div className="bg-white">
      <PublicHeader />
      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-brand-deep via-[#0B5B55] to-navy text-white">
          <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:40px_40px]" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">{L.tagline}</p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{L.heroTitle1}<br />{L.heroTitle2}</h1>
              <p className="mt-6 max-w-xl text-lg text-emerald-50/90">{L.heroText}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/signup" size="lg" className="bg-white !text-brand-deep hover:bg-emerald-50">{L.ctaStart}</ButtonLink>
                <ButtonLink href="#plateforme" size="lg" variant="ghost" className="!text-white ring-1 ring-white/40 hover:bg-white/10">{L.ctaDiscover}</ButtonLink>
              </div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/5 p-4 shadow-2xl backdrop-blur" aria-hidden>
              <div className="rounded-xl bg-white p-4 text-navy">
                <div className="mb-3 flex items-center gap-2 text-xs text-slate-500"><span className="h-2 w-2 rounded-full bg-brand" />{L.steps.slice(1, 4).join(" › ")}</div>
                <div className="space-y-2">
                  {[L.steps[1], L.steps[2], L.steps[3], L.steps[4]].map((l, i) => (
                    <div key={l} className="flex items-center gap-3 rounded-lg border border-line p-2.5" style={{ marginLeft: i * 16 }}>
                      <span className="h-6 w-6 rounded-md bg-brand-50" />
                      <span className="text-sm font-medium">{l}</span>
                      <span className="ml-auto h-1.5 w-20 rounded-full bg-slate-100"><span className="block h-full rounded-full bg-brand" style={{ width: `${70 - i * 12}%` }} /></span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-slate-400">{L.illustration}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">{L.problemsTitle}</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {L.problems.map((p) => <li key={p} className="rounded-xl border border-line bg-canvas p-5 text-sm">{p}</li>)}
          </ul>
        </section>

        <section className="bg-canvas py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-3xl font-semibold tracking-tight">{L.systemTitle}</h2>
            <p className="mt-3 max-w-2xl text-slate-600">{L.systemText}</p>
            <ol className="mt-8 flex flex-wrap items-center gap-2 text-sm">
              {L.steps.map((s, i) => (
                <li key={s} className="flex items-center gap-2">
                  <span className="rounded-full border border-brand/30 bg-white px-3 py-1 font-medium text-brand-deep">{s}</span>
                  {i < L.steps.length - 1 && <span className="text-slate-400" aria-hidden>→</span>}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="plateforme" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">{L.platformTitle}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {L.modules.map(([title, text], i) => {
              const Icon = MODULE_ICONS[i];
              return (
                <article key={title} className="rounded-xl border border-line p-5">
                  <Icon className="h-6 w-6 text-brand" aria-hidden />
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{text}</p>
                  <p className={`mt-3 text-xs font-medium ${READY[i] ? "text-success" : "text-slate-400"}`}>{READY[i] ? m.common.available : m.common.inProgress}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="bg-canvas py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">{L.trustTitle}</h2>
              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                {L.trust.map((t, i) => {
                  const Icon = i === 3 ? LineChart : i === 4 ? Sparkles : ShieldCheck;
                  return <li key={t} className="flex gap-3"><Icon className="h-5 w-5 shrink-0 text-brand" aria-hidden />{t}</li>;
                })}
              </ul>
              <h3 className="mt-10 flex items-center gap-2 text-xl font-semibold"><Languages className="h-5 w-5 text-brand" aria-hidden />{L.languagesTitle}</h3>
              <p className="mt-2 text-sm text-slate-700">{L.languagesText}</p>
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">{L.faqTitle}</h2>
              <div className="mt-6 space-y-3">
                {L.faq.map(([q, a]) => (
                  <details key={q} className="rounded-xl border border-line bg-white p-4">
                    <summary className="cursor-pointer font-medium">{q}</summary>
                    <p className="mt-2 text-sm text-slate-600">{a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">{L.finalTitle}</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/signup" size="lg">{L.finalCta}</ButtonLink>
            <ButtonLink href="/pricing" size="lg" variant="secondary">{m.common.pricing}</ButtonLink>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
