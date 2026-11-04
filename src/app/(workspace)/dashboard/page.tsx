import Link from "next/link";
import { AlertTriangle, ArrowRight, Briefcase, CalendarClock, FolderKanban, Layers, Plus, Sparkles, Target, Users } from "lucide-react";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { db } from "@/server/db";
import { getDashboard } from "@/server/services/dashboard";
import { recentActivity } from "@/server/services/audit-log";
import { activePlanSummary } from "@/server/services/strategy";
import { planCoverage } from "@/lib/strategy";
import { Card, Stat } from "@/components/ui/display";
import { ButtonLink } from "@/components/ui/button";
import { CountUp } from "@/components/charts/count-up";
import { Bars, Donut, Meter, Ring } from "@/components/charts/charts";
import { formatDate, formatMoney, intlLocale } from "@/lib/metrics";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";
import { DemoCard } from "./demo-card";

export const metadata = { title: "Tableau de bord" };

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94A3B8", PREPARATION: "#2563EB", ACTIVE: "#087F68", SUSPENDED: "#F59E0B", CLOSED: "#073B3A", ARCHIVED: "#CBD5E1",
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const ctx = await requireTenant();
  const [d, activity, plan, { m, locale }, org] = await Promise.all([
    getDashboard(ctx),
    recentActivity(ctx),
    activePlanSummary(ctx),
    getMessages(),
    db.organization.findUniqueOrThrow({ where: { id: ctx.organizationId }, select: { defaultCurrency: true } }),
  ]);
  const D = m.dashboard;
  const welcome = (await searchParams).welcome;
  const empty = d.projects?.total === 0 && !d.portfolios && !d.programs;
  const loc = intlLocale(locale);
  const firstName = ctx.userName.split(/\s+/)[0];
  const cov = plan ? planCoverage(plan.axes.flatMap((x) => x.objectives)) : null;
  const statusData = d.projects ? Object.entries(m.status).map(([k, label]) => ({ label, value: d.projects!.byStatus[k] ?? 0, color: STATUS_COLORS[k] })).filter((x) => x.value > 0) : [];
  const portfolioBars = d.projects
    ? d.projects.byPortfolio
        .map((p) => ({ label: p.name ?? D.outsidePortfolio, value: p.totals[org.defaultCurrency] ?? 0, hint: fill(D.projectsN, { n: p.count }) }))
        .filter((p) => p.value > 0)
        .sort((a, b) => b.value - a.value)
    : [];

  return (
    <div className="space-y-6">
      {/* Bandeau d'accueil */}
      <section className="relative animate-fade-up overflow-hidden rounded-3xl bg-gradient-to-br from-brand-deep via-[#0B4A4A] to-navy p-6 text-white shadow-lift sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 animate-drift rounded-full bg-brand-400/40 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 animate-drift rounded-full bg-ochre/25 blur-3xl [animation-delay:-6s]" aria-hidden />
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:32px_32px]" aria-hidden />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-brand-100/90">{fill(D.today, { date: new Intl.DateTimeFormat(loc, { dateStyle: "full" }).format(new Date()) })}</p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">{fill(D.hello, { name: firstName })}</h1>
            <p className="mt-2 max-w-xl text-sm text-white/75">{fill(D.description, { org: ctx.organizationName })}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {can(ctx, "project:create") && <ButtonLink href="/projects/new" className="bg-white !bg-none !text-brand-deep hover:!bg-brand-50"><Plus className="h-4 w-4" />{m.project.new}</ButtonLink>}
            {can(ctx, "strategy:view") && <ButtonLink href="/strategy" variant="ghost" className="!text-white ring-1 ring-white/30 hover:!bg-white/10"><Target className="h-4 w-4" />{m.nav.strategy}</ButtonLink>}
          </div>
        </div>
      </section>

      {(welcome || empty) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-brand/20 bg-gradient-to-br from-white to-brand-50/60">
            <h2 className="flex items-center gap-2 font-display font-semibold"><Sparkles className="h-4 w-4 text-ochre" aria-hidden />{D.firstSteps}</h2>
            <p className="mt-1 text-sm text-slate-600">{D.firstStepsText}</p>
            <ol className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {can(ctx, "organization:edit") && <li><Link className="group inline-flex items-center gap-1 font-medium text-brand hover:text-brand-deep" href="/organization/profile">{D.step1}<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></Link></li>}
              {can(ctx, "members:manage") && <li><Link className="group inline-flex items-center gap-1 font-medium text-brand hover:text-brand-deep" href="/organization/members">{D.step2}<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></Link></li>}
              {can(ctx, "portfolio:create") && <li><Link className="group inline-flex items-center gap-1 font-medium text-brand hover:text-brand-deep" href="/portfolios/new">{D.step3}<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></Link></li>}
              {can(ctx, "project:create") && <li><Link className="group inline-flex items-center gap-1 font-medium text-brand hover:text-brand-deep" href="/projects/new">{D.step4}<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></Link></li>}
            </ol>
          </Card>
          <DemoCard />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {d.portfolios !== null && <Stat index={0} tone="navy" label={D.portfolios} value={<CountUp value={d.portfolios} locale={loc} />} icon={Briefcase} />}
        {d.programs !== null && <Stat index={1} tone="teal" label={D.programs} value={<CountUp value={d.programs} locale={loc} />} icon={Layers} />}
        {d.projects && <Stat index={2} tone="brand" label={D.projects} value={<CountUp value={d.projects.total} locale={loc} />} hint={fill(D.projectsHint, { active: d.projects.runningCount, drafts: d.projects.drafts.length })} icon={FolderKanban} />}
        {d.members !== null && <Stat index={3} tone="ochre" label={D.members} value={<CountUp value={d.members} locale={loc} />} icon={Users} />}
      </div>

      {can(ctx, "strategy:view") && (
        <Card interactive>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display font-semibold"><Target className="h-4 w-4 text-brand" aria-hidden />{m.strategy.dashboardTitle}</h2>
            {plan && <Link href={`/strategy/${plan.id}`} className="group inline-flex items-center gap-1 text-xs font-semibold text-brand">{plan.title}<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></Link>}
          </div>
          {plan && cov ? (
            <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
              <Ring value={cov.rate ?? 0} label={m.strategy.coverage} />
              <div className="grid w-full min-w-0 gap-4 sm:flex-1 sm:grid-cols-3">
                <div><p className="font-display text-2xl font-bold tabular">{cov.covered} / {cov.objectives}</p><p className="text-xs text-slate-500">{m.strategy.coverage}</p></div>
                <div><p className="font-display text-2xl font-bold tabular">{plan.axes.length}</p><p className="text-xs text-slate-500">{m.strategy.axes}</p></div>
                <div className="min-w-0"><p className="break-words font-display text-lg font-bold tabular">{Object.entries(cov.budget).map(([c, v]) => formatMoney(v, c, locale)).join(" · ") || "—"}</p><p className="text-xs text-slate-500">{m.strategy.alignedBudget}</p></div>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">{m.strategy.noActivePlan} {can(ctx, "strategy:create") && <Link className="font-medium text-brand hover:underline" href="/strategy">{m.strategy.createPlanCta}</Link>}</p>
          )}
        </Card>
      )}

      {d.projects && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card interactive>
            <h2 className="mb-4 font-display font-semibold">{D.byStatus}</h2>
            {d.projects.total === 0 ? <p className="text-sm text-slate-500">{D.noProject}</p> : (
              <Donut data={statusData} label={D.statusLabel} center={<><span className="font-display text-2xl font-bold tabular">{d.projects.total}</span><span className="text-[11px] text-slate-500">{D.projects}</span></>} />
            )}
          </Card>

          <Card interactive>
            <h2 className="font-display font-semibold">{D.budget}</h2>
            <p className="text-xs text-slate-500">{D.budgetHint}</p>
            {Object.keys(d.projects.budget.totals).length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">{D.noBudget}</p>
            ) : (
              <ul className="mt-3 space-y-1">
                {Object.entries(d.projects.budget.totals).map(([cur, v]) => <li key={cur} className="font-display text-2xl font-bold tabular">{formatMoney(v, cur, locale)}</li>)}
              </ul>
            )}
            {d.projects.budget.missing > 0 && <p className="mt-2 text-xs text-amber-700">{fill(D.missingBudget, { n: d.projects.budget.missing })}</p>}
            {portfolioBars.length > 0 && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{D.byPortfolio}</p>
                <Bars data={portfolioBars} label={D.byPortfolio} format={(v) => formatMoney(v, org.defaultCurrency, locale)} />
              </div>
            )}
            <p className="mt-3 text-xs text-slate-400">{D.executionSoon}</p>
          </Card>

          <Card interactive>
            <h2 className="font-display font-semibold">{D.time}</h2>
            <p className="text-xs text-slate-500">{D.timeHint}</p>
            {d.projects.timeProgress.value === null ? (
              <p className="mt-3 text-sm text-slate-500">{D.noTime}</p>
            ) : (
              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Ring value={d.projects.timeProgress.value} size={96} thickness={10} color="#102A43" label={D.time} />
                <div className="w-full min-w-0 space-y-3 sm:flex-1">
                  {d.projects.runningProgress.slice(0, 4).map((p) => (
                    <Link key={p.id} href={`/projects/${p.id}`} className="block space-y-1 rounded-lg transition-colors hover:bg-canvas">
                      <div className="flex justify-between gap-2 text-xs"><span className="truncate font-medium">{p.code} · {p.name}</span><span className="shrink-0 whitespace-nowrap tabular text-slate-500">{p.progress}&nbsp;%</span></div>
                      <Meter value={p.progress} label={p.name} color={p.progress >= 85 ? "linear-gradient(90deg,#F59E0B,#E3A13B)" : undefined} />
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {d.projects.timeProgress.excluded > 0 && <p className="mt-2 text-xs text-amber-700">{fill(D.excluded, { n: d.projects.timeProgress.excluded })}</p>}
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {d.projects && (
          <Card>
            <h2 className="flex items-center gap-2 font-display font-semibold"><AlertTriangle className="h-4 w-4 text-warning" aria-hidden />{D.alerts}</h2>
            <p className="text-xs text-slate-500">{D.alertsRule}</p>
            {d.projects.overdue.length === 0 && d.projects.upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">{D.noAlert}</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {d.projects.overdue.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-xl border border-red-100 bg-red-50/60 px-3 py-2 transition hover:border-red-200">
                    <Link className="min-w-0 break-words font-medium hover:underline" href={`/projects/${p.id}`}>{p.code} · {p.name}</Link>
                    <span className="text-xs font-semibold text-danger">{fill(D.lateSince, { date: formatDate(p.endDate, locale) })}</span>
                  </li>
                ))}
                {d.projects.upcoming.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2">
                    <Link className="min-w-0 break-words font-medium hover:underline" href={`/projects/${p.id}`}>{p.code} · {p.name}</Link>
                    <span className="flex items-center gap-1 text-xs text-amber-700"><CalendarClock className="h-3.5 w-3.5" aria-hidden />{fill(D.endsOn, { date: formatDate(p.endDate, locale) })}</span>
                  </li>
                ))}
              </ul>
            )}
            {d.projects.drafts.length > 0 && (
              <div className="mt-4 border-t border-line pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{D.drafts}</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {d.projects.drafts.slice(0, 5).map((p) => <li key={p.id}><Link className="text-brand hover:underline" href={`/projects/new/${p.id}`}>{p.code} · {p.name}</Link></li>)}
                </ul>
              </div>
            )}
          </Card>
        )}
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold">{D.activity}</h2>
            {can(ctx, "audit:view") && <Link href="/organization/audit" className="text-xs font-semibold text-brand hover:underline">{D.fullLog}</Link>}
          </div>
          {activity.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">{D.noActivity}</p>
          ) : (
            <ol className="relative mt-4 space-y-4 border-l-2 border-brand-100 pl-5 text-sm">
              {activity.map((a, i) => (
                <li key={a.id} className="relative animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand shadow" aria-hidden />
                  <p>{a.summary}</p>
                  <p className="text-xs text-slate-500">{a.actorName} · {new Intl.DateTimeFormat(loc, { dateStyle: "short", timeStyle: "short" }).format(a.createdAt)}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {!d.projects && (
        <Card><p className="text-sm text-slate-600">{D.noProjectAccess} <ButtonLink href="/organization" variant="ghost" size="sm">{D.seeOrg}</ButtonLink></p></Card>
      )}
    </div>
  );
}
