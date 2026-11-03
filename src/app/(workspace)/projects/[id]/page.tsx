import Link from "next/link";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { allowedTransitions, getProject } from "@/server/services/projects";
import { hierarchyOptions, strategyOptions } from "@/server/services/options";
import { getProjectContributions } from "@/server/services/strategy";
import { db } from "@/server/db";
import { Badge, Card, DefinitionList, PageHeader, ProgressBar, Stat } from "@/components/ui/display";
import { ActionForm } from "@/components/forms/action-form";
import { ProjectStepFields } from "@/components/project-step-fields";
import { StatusBadge } from "@/components/status-badge";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { PROJECT_LAST_EDIT_STEP, PROJECT_STEPS, type ProjectStep } from "@/lib/validation/schemas";
import { durationDays, formatDate, formatMoney, intlLocale, timeProgress } from "@/lib/metrics";
import { projectHealth, type HealthDimension, type HealthLevel } from "@/lib/project-health";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";
import type { Messages } from "@/i18n/messages/fr";
import { Forbidden } from "../../forbidden";
import { orNotFound } from "../../guard";
import { deleteProjectAction, editStepAction, statusAction } from "../actions";

const TABS = [
  ["overview", 0], ["planning", 3], ["activities", 3], ["results", 4], ["meal", 4], ["finance", 5],
  ["risks", 5], ["team", 3], ["documents", 6], ["reports", 9], ["history", 0], ["settings", 0],
] as const;

const levelColor: Record<HealthLevel, string> = { good: "bg-success", watch: "bg-warning", critical: "bg-danger", unknown: "bg-slate-300" };

function healthText(h: HealthDimension, m: Messages) {
  const H = m.project.health;
  const vars: Record<string, string | number> = { ...(h.detail.vars ?? {}) };
  if (h.detail.k === "pending") vars.module = H.modules[h.key as keyof typeof H.modules];
  if (h.missing?.length) vars.list = h.missing.map((k) => (m.wizard.fields as Record<string, string>)[k]).join(", ");
  return fill((H as Record<string, unknown>)[h.detail.k] as string, vars);
}

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const ctx = await requireTenant();
  if (!can(ctx, "project:view")) return <Forbidden />;
  const { id } = await params;
  const [p, base, strategy, contributions, { m, locale }] = await Promise.all([orNotFound(getProject(ctx, id)), hierarchyOptions(ctx), strategyOptions(ctx, id), getProjectContributions(ctx, id), getMessages()]);
  const o = { ...base, strategy };
  const tab = (await searchParams).tab ?? "overview";
  const editable = can(ctx, "project:edit");
  const t = timeProgress(p.startDate, p.endDate);
  const P = m.project;
  const F = m.wizard.fields;
  const days = durationDays(p.startDate, p.endDate);

  return (
    <>
      <PageHeader
        title={p.name}
        breadcrumb={<><Link href="/projects" className="hover:underline">{P.title}</Link> › {p.code}{p.program && <> · <Link className="hover:underline" href={`/programs/${p.program.id}`}>{p.program.name}</Link></>}</>}
        actions={<><StatusBadge status={p.status} />{p.status === "DRAFT" && editable && <ButtonLink size="sm" variant="secondary" href={`/projects/new/${p.id}`}>{P.resume}</ButtonLink>}</>}
      />
      <nav className="-mx-4 mb-6 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0" aria-label="tabs">
        <ul className="flex gap-1">
          {TABS.map(([key, phase]) => (
            <li key={key}>
              {phase ? (
                <span className="flex items-center gap-1 whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm text-slate-400" title={fill(P.plannedPhase, { phase })} aria-disabled="true">{P.tabs[key]}<span className="rounded bg-slate-100 px-1 text-[10px]">{m.common.soon}</span></span>
              ) : (
                <Link href={`?tab=${key}`} aria-current={tab === key ? "page" : undefined} className={cn("block whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium", tab === key ? "border-brand text-brand-deep" : "border-transparent text-slate-600 hover:text-navy")}>{P.tabs[key]}</Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={P.stats.time} value={t === null ? "—" : `${t} %`} hint={t === null ? P.stats.noDates : `${formatDate(p.startDate, locale)} → ${formatDate(p.endDate, locale)}`} />
            <Stat label={P.stats.duration} value={days ? fill(P.stats.days, { n: days }) : "—"} />
            <Stat label={P.stats.budget} value={p.plannedBudget ? formatMoney(Number(p.plannedBudget), p.currency, locale) : "—"} hint={P.stats.budgetHint} />
            <Stat label={P.stats.beneficiaries} value={p.directBeneficiaries ?? "—"} />
          </div>
          {t !== null && <ProgressBar value={t} label={P.timeLabel} />}
          <Card>
            <h2 className="font-semibold">{P.healthTitle}</h2>
            <p className="mb-4 text-xs text-slate-500">{P.healthHint}</p>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projectHealth(p).map((h) => (
                <li key={h.key} className="rounded-lg border border-line p-3">
                  <div className="flex items-center gap-2 text-sm font-medium"><span className={cn("h-2.5 w-2.5 rounded-full", levelColor[h.level])} aria-hidden />{P.health[h.key]}<span className="ml-auto text-xs text-slate-500">{P.levels[h.level]}</span></div>
                  <p className="mt-1 text-xs text-slate-600">{healthText(h, m)}</p>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold">{m.strategy.contributionsTitle}</h2>
            {contributions.length === 0 ? (
              <p className="text-sm text-slate-500">{m.strategy.noContributions}</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {contributions.map((c) => (
                  <li key={c.objectiveId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span><span className="font-mono text-xs text-slate-500">{c.objective.code}</span> {c.objective.title} <span className="text-xs text-slate-500">· {c.objective.axis.code} · <Link className="hover:underline" href={`/strategy/${c.objective.axis.plan.id}`}>{c.objective.axis.plan.title}</Link></span></span>
                    <Badge tone="brand">{fill(m.strategy.weight, { w: c.weight })}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h2 className="mb-4 font-semibold">{P.identity}</h2>
            <DefinitionList items={[
              [F.manager, p.managerId ? o.memberNames.get(p.managerId) : null], [F.portfolio, p.portfolio?.name], [F.priority, m.priority[p.priority]], [F.typeShort, p.type],
              [F.sectors, p.sectors.join(", ")], [F.sdgShort, p.sdgs.map((n) => `${n}. ${m.sdg[n - 1]}`).join("\n")],
              [F.description, p.shortDescription], [F.generalObjective, p.generalObjective],
              [F.specificObjectives, p.specificObjectives.map((s) => `• ${s}`).join("\n")], [F.territory, [p.country, p.region, ...p.zones].filter(Boolean).join(" · ")],
              [F.context, p.context], [F.problemShort, p.problemStatement], [F.justification, p.justification],
            ]} />
          </Card>
        </div>
      )}

      {tab === "history" && <History orgId={ctx.organizationId} projectId={p.id} canAudit={can(ctx, "audit:view")} m={m} locale={locale} />}

      {tab === "settings" && (
        <div className="space-y-6">
          {editable || can(ctx, "project:approve") ? (
            <Card>
              <h2 className="font-semibold">{P.statusTitle}</h2>
              <p className="mb-3 text-sm text-slate-600">{P.current} <StatusBadge status={p.status} /> — {P.statusText}</p>
              <div className="flex flex-wrap gap-2">
                {allowedTransitions(p.status).length === 0 && <p className="text-sm text-slate-500">{P.noTransition}</p>}
                {allowedTransitions(p.status).map((s) => (
                  <ActionForm key={s} action={statusAction.bind(null, p.id, s)} submitLabel={`→ ${m.status[s as keyof typeof m.status]}`} submitVariant="secondary" className="space-y-2" confirm={s === "ARCHIVED" || s === "CLOSED" ? fill(P.confirmStatus, { status: m.status[s as keyof typeof m.status] }) : undefined} />
                ))}
              </div>
            </Card>
          ) : null}
          {editable ? (
            PROJECT_STEPS.filter((s) => s.n <= PROJECT_LAST_EDIT_STEP).map((s) => (
              <Card key={s.n}>
                <details open={s.n === 1}>
                  <summary className="cursor-pointer font-semibold">{m.wizard.steps[s.n - 1]}</summary>
                  <div className="mt-4"><ActionForm action={editStepAction.bind(null, p.id, s.n as ProjectStep)}><ProjectStepFields step={s.n as ProjectStep} p={p} o={o} m={m} /></ActionForm></div>
                </details>
              </Card>
            ))
          ) : (
            <Card><p className="text-sm text-slate-600">{m.ui.readOnlyRole}</p></Card>
          )}
          {can(ctx, "project:delete") && (
            <Card className="border-danger/30">
              <h2 className="font-semibold text-danger">{P.deleteTitle}</h2>
              <p className="mb-3 text-sm text-slate-600">{P.deleteText}</p>
              <ActionForm action={deleteProjectAction.bind(null, p.id)} submitLabel={P.deleteBtn} submitVariant="danger" confirm={fill(m.ui.confirmDelete, { name: p.name })} />
            </Card>
          )}
        </div>
      )}

      {!["overview", "history", "settings"].includes(tab) && <Card><p className="text-sm text-slate-600">{P.tabSoon} <Badge>{m.common.soon}</Badge></p></Card>}
    </>
  );
}

async function History({ orgId, projectId, canAudit, m, locale }: { orgId: string; projectId: string; canAudit: boolean; m: Messages; locale: string }) {
  if (!canAudit) return <Card><p className="text-sm text-slate-600">{m.project.historyPerm}</p></Card>;
  const rows = await db.auditLog.findMany({ where: { organizationId: orgId, entityType: "Project", entityId: projectId }, orderBy: { createdAt: "desc" }, take: 100 });
  const users = await db.user.findMany({ where: { id: { in: rows.map((r) => r.actorId!).filter(Boolean) } }, select: { id: true, name: true } });
  const names = new Map(users.map((u) => [u.id, u.name]));
  const dt = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "short", timeStyle: "short" });
  return (
    <Card>
      <h2 className="mb-3 font-semibold">{m.project.historyTitle}</h2>
      <ul className="divide-y divide-line text-sm">
        {rows.map((r) => (
          <li key={r.id} className="py-2">
            <p>{r.summary}</p>
            <p className="text-xs text-slate-500">{names.get(r.actorId ?? "") ?? "—"} · {dt.format(r.createdAt)}</p>
            {r.changes && Object.keys(r.changes as object).length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                {Object.entries(r.changes as Record<string, { from: unknown; to: unknown }>).map(([k, v]) => <li key={k}><code>{k}</code> : {JSON.stringify(v.from)} → {JSON.stringify(v.to)}</li>)}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
