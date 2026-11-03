import Link from "next/link";
import { AlertTriangle, Briefcase, CalendarClock, FolderKanban, Layers, Target, Users } from "lucide-react";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { getDashboard } from "@/server/services/dashboard";
import { recentActivity } from "@/server/services/audit-log";
import { activePlanSummary } from "@/server/services/strategy";
import { planCoverage } from "@/lib/strategy";
import { Card, PageHeader, ProgressBar, Stat } from "@/components/ui/display";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { STATUS_LABELS } from "@/lib/labels";
import { formatDate, formatMoney, intlLocale } from "@/lib/metrics";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";

export const metadata = { title: "Tableau de bord" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const ctx = await requireTenant();
  const [d, activity, plan] = await Promise.all([getDashboard(ctx), recentActivity(ctx), activePlanSummary(ctx)]);
  const welcome = (await searchParams).welcome;
  const { m, locale } = await getMessages();
  const D = m.dashboard;
  const empty = d.projects?.total === 0 && !d.portfolios && !d.programs;

  return (
    <>
      <PageHeader title={D.title} description={fill(D.description, { org: ctx.organizationName })} />

      {(welcome || empty) && (
        <Card className="mb-6 border-brand/30 bg-brand-50/50">
          <h2 className="font-semibold">{D.firstSteps}</h2>
          <p className="mt-1 text-sm text-slate-600">{D.firstStepsText}</p>
          <ol className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {can(ctx, "organization:edit") && <li><Link className="font-medium text-brand hover:underline" href="/organization/profile">{D.step1}</Link></li>}
            {can(ctx, "members:manage") && <li><Link className="font-medium text-brand hover:underline" href="/organization/members">{D.step2}</Link></li>}
            {can(ctx, "portfolio:create") && <li><Link className="font-medium text-brand hover:underline" href="/portfolios/new">{D.step3}</Link></li>}
            {can(ctx, "project:create") && <li><Link className="font-medium text-brand hover:underline" href="/projects/new">{D.step4}</Link></li>}
          </ol>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {d.portfolios !== null && <Stat label={D.portfolios} value={d.portfolios} icon={Briefcase} />}
        {d.programs !== null && <Stat label={D.programs} value={d.programs} icon={Layers} />}
        {d.projects && <Stat label={D.projects} value={d.projects.total} hint={fill(D.projectsHint, { active: d.projects.runningCount, drafts: d.projects.drafts.length })} icon={FolderKanban} />}
        {d.members !== null && <Stat label={D.members} value={d.members} icon={Users} />}
      </div>

      {can(ctx, "strategy:view") && (() => {
        const cov = plan ? planCoverage(plan.axes.flatMap((x) => x.objectives)) : null;
        return (
          <Card className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-semibold"><Target className="h-4 w-4 text-brand" aria-hidden />{m.strategy.dashboardTitle}</h2>
              {plan && <Link href={`/strategy/${plan.id}`} className="text-xs font-medium text-brand hover:underline">{plan.title}</Link>}
            </div>
            {plan && cov ? (
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <div><p className="text-2xl font-semibold">{cov.rate === null ? "—" : `${cov.rate} %`}</p><p className="text-xs text-slate-500">{fill(m.strategy.coverageValue, { covered: cov.covered, total: cov.objectives })}</p></div>
                <div><p className="text-2xl font-semibold">{plan.axes.length}</p><p className="text-xs text-slate-500">{m.strategy.axes}</p></div>
                <div><p className="text-sm font-semibold">{Object.entries(cov.budget).map(([c, v]) => formatMoney(v, c, locale)).join(" · ") || "—"}</p><p className="text-xs text-slate-500">{m.strategy.alignedBudget}</p></div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">{m.strategy.noActivePlan} {can(ctx, "strategy:create") && <Link className="font-medium text-brand hover:underline" href="/strategy">{m.strategy.createPlanCta}</Link>}</p>
            )}
          </Card>
        );
      })()}

      {d.projects && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card>
            <h2 className="font-semibold">{D.byStatus}</h2>
            {d.projects.total === 0 ? (
              <p className="mt-3 text-sm text-slate-500">{D.noProject}</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {Object.keys(STATUS_LABELS).filter((s) => d.projects!.byStatus[s]).map((s) => (
                  <li key={s} className="flex items-center justify-between"><StatusBadge status={s} /><span className="font-medium">{d.projects!.byStatus[s]}</span></li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="font-semibold">{D.budget}</h2>
            <p className="text-xs text-slate-500">{D.budgetHint}</p>
            {Object.keys(d.projects.budget.totals).length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">{D.noBudget}</p>
            ) : (
              <ul className="mt-3 space-y-1">
                {Object.entries(d.projects.budget.totals).map(([cur, v]) => <li key={cur} className="text-lg font-semibold">{formatMoney(v, cur, locale)}</li>)}
              </ul>
            )}
            {d.projects.budget.missing > 0 && <p className="mt-2 text-xs text-amber-700">{fill(D.missingBudget, { n: d.projects.budget.missing })}</p>}
            <p className="mt-3 text-xs text-slate-400">{D.executionSoon}</p>
          </Card>

          <Card>
            <h2 className="font-semibold">{D.time}</h2>
            <p className="text-xs text-slate-500">{D.timeHint}</p>
            {d.projects.timeProgress.value === null ? (
              <p className="mt-3 text-sm text-slate-500">{D.noTime}</p>
            ) : (
              <div className="mt-3">
                <p className="text-2xl font-semibold">{d.projects.timeProgress.value} %</p>
                <ProgressBar value={d.projects.timeProgress.value} label="Avancement temporel consolidé" />
              </div>
            )}
            {d.projects.timeProgress.excluded > 0 && <p className="mt-2 text-xs text-amber-700">{fill(D.excluded, { n: d.projects.timeProgress.excluded })}</p>}
          </Card>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {d.projects && (
          <Card>
            <h2 className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-warning" aria-hidden />{D.alerts}</h2>
            <p className="text-xs text-slate-500">{D.alertsRule}</p>
            {d.projects.overdue.length === 0 && d.projects.upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">{D.noAlert}</p>
            ) : (
              <ul className="mt-3 divide-y divide-line text-sm">
                {d.projects.overdue.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-2">
                    <Link className="min-w-0 break-words font-medium hover:underline" href={`/projects/${p.id}`}>{p.code} · {p.name}</Link>
                    <span className="text-xs font-medium text-danger">{fill(D.lateSince, { date: formatDate(p.endDate, locale) })}</span>
                  </li>
                ))}
                {d.projects.upcoming.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-2">
                    <Link className="min-w-0 break-words font-medium hover:underline" href={`/projects/${p.id}`}>{p.code} · {p.name}</Link>
                    <span className="flex items-center gap-1 text-xs text-amber-700"><CalendarClock className="h-3.5 w-3.5" aria-hidden />{fill(D.endsOn, { date: formatDate(p.endDate, locale) })}</span>
                  </li>
                ))}
              </ul>
            )}
            {d.projects.drafts.length > 0 && (
              <div className="mt-4 border-t border-line pt-3">
                <p className="text-xs font-medium text-slate-500">{D.drafts}</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {d.projects.drafts.slice(0, 5).map((p) => <li key={p.id}><Link className="text-brand hover:underline" href={`/projects/new/${p.id}`}>{p.code} · {p.name}</Link></li>)}
                </ul>
              </div>
            )}
          </Card>
        )}
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{D.activity}</h2>
            {can(ctx, "audit:view") && <Link href="/organization/audit" className="text-xs font-medium text-brand hover:underline">{D.fullLog}</Link>}
          </div>
          {activity.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">{D.noActivity}</p>
          ) : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {activity.map((a) => (
                <li key={a.id} className="py-2">
                  <p>{a.summary}</p>
                  <p className="text-xs text-slate-500">{a.actorName} · {new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "short", timeStyle: "short" }).format(a.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {!d.projects && (
        <Card className="mt-6"><p className="text-sm text-slate-600">{D.noProjectAccess} <ButtonLink href="/organization" variant="ghost" size="sm">{D.seeOrg}</ButtonLink></p></Card>
      )}
    </>
  );
}
