import Link from "next/link";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { getProgram } from "@/server/services/programs";
import { hierarchyOptions } from "@/server/services/options";
import { Card, DefinitionList, PageHeader, Stat } from "@/components/ui/display";
import { ActionForm } from "@/components/forms/action-form";
import { ProgramFields } from "@/components/hierarchy-fields";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatMoney, sumByCurrency } from "@/lib/metrics";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";
import { Forbidden } from "../../forbidden";
import { orNotFound } from "../../guard";
import { deleteProgramAction, updateProgramAction } from "../../hierarchy-actions";

export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant();
  if (!can(ctx, "program:view")) return <Forbidden />;
  const { id } = await params;
  const [p, o, { m, locale }] = await Promise.all([orNotFound(getProgram(ctx, id)), hierarchyOptions(ctx), getMessages()]);
  const G = m.program;
  const F = G.fields;
  const PF = m.portfolio.fields;
  const budget = sumByCurrency(p.projects);
  return (
    <>
      <PageHeader
        title={p.name}
        breadcrumb={<><Link href="/programs" className="hover:underline">{G.title}</Link> › {p.code}{p.portfolio && <> · {G.portfolioPrefix} <Link className="hover:underline" href={`/portfolios/${p.portfolio.id}`}>{p.portfolio.name}</Link></>}</>}
        actions={<StatusBadge status={p.status} />}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat tone="navy" label={m.project.title} value={p.projects.length} />
        <Stat tone="teal" label={G.budget} value={p.plannedBudget ? formatMoney(Number(p.plannedBudget), p.currency, locale) : "—"} />
        <Stat tone="brand" label={G.sumProjects} value={Object.entries(budget.totals).map(([c, v]) => formatMoney(v, c, locale)).join(" · ") || "—"} hint={budget.missing ? fill(m.portfolio.missingBudget, { n: budget.missing }) : undefined} />
      </div>
      <Card className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{G.projects}</h2>
          {can(ctx, "project:create") && <Link href={`/projects/new?programId=${p.id}`} className="text-sm font-medium text-brand hover:underline">{G.addProject}</Link>}
        </div>
        {p.projects.length === 0 ? <p className="text-sm text-slate-500">{m.portfolio.noProjects}</p> : (
          <ul className="divide-y divide-line text-sm">{p.projects.map((g) => <li key={g.id} className="flex justify-between gap-2 py-2"><Link className="hover:underline" href={`/projects/${g.id}`}>{g.code} · {g.name}</Link><StatusBadge status={g.status} /></li>)}</ul>
        )}
      </Card>
      <Card className="mt-6">
        {can(ctx, "program:edit") ? (
          <ActionForm action={updateProgramAction.bind(null, p.id)}><ProgramFields p={p} members={o.members} portfolios={o.portfolios} currency={o.currency} m={m} /></ActionForm>
        ) : (
          <DefinitionList items={[[PF.manager, p.managerId ? o.memberNames.get(p.managerId) : null], [F.coordinator, p.coordinatorId ? o.memberNames.get(p.coordinatorId) : null], [PF.period, `${formatDate(p.startDate, locale)} → ${formatDate(p.endDate, locale)}`], [F.sectors, p.sectors.join(", ")], [F.zones, p.zones.join(", ")], [F.context, p.context], [F.problem, p.problemStatement], [F.generalObjective, p.generalObjective]]} />
        )}
      </Card>
      {can(ctx, "program:delete") && (
        <Card className="mt-6 border-danger/30">
          <h2 className="font-semibold text-danger">{m.ui.sensitiveZone}</h2>
          <p className="mb-3 text-sm text-slate-600">{G.deleteText}</p>
          <ActionForm action={deleteProgramAction.bind(null, p.id)} submitLabel={G.deleteBtn} submitVariant="danger" confirm={fill(m.ui.confirmDelete, { name: p.name })} />
        </Card>
      )}
    </>
  );
}
