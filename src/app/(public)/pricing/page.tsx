import { Check, Clock } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import { ButtonLink } from "@/components/ui/button";
import { PlanPrice } from "@/components/plan-price";
import { cn } from "@/components/ui/cn";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";
import Link from "next/link";

export const metadata = { title: "Tarifs" };

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ cycle?: string }> }) {
  const { m, locale } = await getMessages();
  const cycle = (await searchParams).cycle === "monthly" ? "MONTHLY" : "YEARLY";
  const P = m.pricing;
  return (
    <div className="bg-white">
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="animate-fade-up text-center font-display text-3xl font-extrabold tracking-tight sm:text-5xl">{P.title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">{P.subtitle}</p>
        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-lg border border-line bg-canvas p-1 text-sm" role="group" aria-label="Facturation">
            <Link href="?cycle=monthly" aria-current={cycle === "MONTHLY" ? "true" : undefined} className={cn("rounded-md px-3 py-1.5 font-medium", cycle === "MONTHLY" ? "bg-white shadow-sm" : "text-slate-600")}>{P.monthly}</Link>
            <Link href="?cycle=yearly" aria-current={cycle === "YEARLY" ? "true" : undefined} className={cn("rounded-md px-3 py-1.5 font-medium", cycle === "YEARLY" ? "bg-white shadow-sm" : "text-slate-600")}>{P.yearly}</Link>
          </div>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <article key={plan.code} className={cn("relative flex animate-fade-up flex-col rounded-2xl border bg-white p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lift", plan.highlighted ? "border-brand bg-gradient-to-b from-brand-50/70 to-white shadow-glow ring-1 ring-brand" : "border-line shadow-soft")}>
              {plan.highlighted && <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-0.5 text-xs font-medium text-white">{P.popular}</span>}
              <h2 className="text-lg font-semibold">{m.plans[plan.code].name}</h2>
              <p className="mt-1 min-h-10 text-sm text-slate-600">{m.plans[plan.code].audience}</p>
              <div className="mt-4"><PlanPrice plan={plan} m={m} locale={locale} cycle={cycle} /></div>
              <ul className="mt-4 space-y-1 text-sm font-medium">
                <li>{plan.limits.members === null ? P.membersUnlimited : fill(P.members, { n: plan.limits.members })}</li>
                <li>{plan.limits.projects === null ? P.projectsUnlimited : fill(P.projects, { n: plan.limits.projects })}</li>
                {plan.limits.storageGb !== null && <li>{fill(P.storage, { n: plan.limits.storageGb })}</li>}
              </ul>
              <ul className="mt-4 flex-1 space-y-2 border-t border-line pt-4 text-sm">
                {plan.features.map((f) => (
                  <li key={f.key} className="flex gap-2">
                    {f.available ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label={P.availableNow} /> : <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-label={P.comingSoon} />}
                    <span className={f.available ? "" : "text-slate-500"}>{m.plans.features[f.key]}{!f.available && <span className="ml-1 text-xs">({P.comingSoon})</span>}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {plan.monthlyXof === null
                  ? <ButtonLink href="/signup" variant="secondary" className="w-full">{P.contactUs}</ButtonLink>
                  : <ButtonLink href="/signup" variant={plan.highlighted ? "primary" : "secondary"} className="w-full">{P.startTrial}</ButtonLink>}
              </div>
            </article>
          ))}
        </div>
        <section className="mt-12 rounded-2xl bg-canvas p-6">
          <h2 className="font-semibold">{P.notesTitle}</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
            <li>{fill(P.trialNote, { days: TRIAL_DAYS })}</li>
            {P.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
