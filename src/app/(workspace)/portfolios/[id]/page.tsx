import Link from "next/link";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { getPortfolio } from "@/server/services/portfolios";
import { hierarchyOptions } from "@/server/services/options";
import { Card, DefinitionList, PageHeader, Stat } from "@/components/ui/display";
import { ActionForm } from "@/components/forms/action-form";
import { PortfolioFields } from "@/components/hierarchy-fields";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatMoney, sumByCurrency } from "@/lib/metrics";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";
import { Forbidden } from "../../forbidden";
import { orNotFound } from "../../guard";
import { deletePortfolioAction, updatePortfolioAction } from "../../hierarchy-actions";

export default async function PortfolioPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant();
  if (!can(ctx, "portfolio:view")) return <Forbidden />;
  const { id } = await params;
  const [p, o, { m, locale }] = await Promise.all([orNotFound(getPortfolio(ctx, id)), hierarchyOptions(ctx), getMessages()]);
  const P = m.portfolio;
  const F = P.fields;
  const projBudget = sumByCurrency(p.projects);
  const list = (items: { id: string; code: string; name: string; status: string }[], base: string, empty: string) =>
    items.length === 0 ? <p className="text-sm text-slate-500">{empty}</p> : (
      <ul className="divide-y divide-line text-sm">{items.map((g) => <li key={g.id} className="flex justify-between gap-2 py-2"><Link className="hover:underline" href={`${base}/${g.id}`}>{g.code} · {g.name}</Link><StatusBadge status={g.status} /></li>)}</ul>
    );
  return (
    <>
      <PageHeader title={p.name} breadcrumb={<><Link href="/portfolios" className="hover:underline">{P.title}</Link> › {p.code}</>} actions={<StatusBadge status={p.status} />} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={m.program.title} value={p.programs.length} />
        <Stat label={P.linkedProjects} value={p.projects.length} />
        <Stat label={P.projectsBudget} value={Object.entries(projBudget.totals).map(([c, v]) => formatMoney(v, c, locale)).join(" · ") || "—"} hint={projBudget.missing ? fill(P.missingBudget, { n: projBudget.missing }) : P.projectsBudgetHint} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card><h2 className="mb-3 font-semibold">{m.program.title}</h2>{list(p.programs, "/programs", P.noPrograms)}</Card>
        <Card><h2 className="mb-3 font-semibold">{m.project.title}</h2>{list(p.projects, "/projects", P.noProjects)}</Card>
      </div>
      <Card className="mt-6">
        {can(ctx, "portfolio:edit") ? (
          <>
            <h2 className="mb-4 font-semibold">{P.info}</h2>
            <ActionForm action={updatePortfolioAction.bind(null, p.id)}><PortfolioFields p={p} members={o.members} currency={o.currency} m={m} /></ActionForm>
          </>
        ) : (
          <DefinitionList items={[[F.code, p.code], [F.manager, p.managerId ? o.memberNames.get(p.managerId) : null], [F.period, `${formatDate(p.startDate, locale)} → ${formatDate(p.endDate, locale)}`], [F.budget, p.plannedBudget ? formatMoney(Number(p.plannedBudget), p.currency, locale) : null], [F.objective, p.objective], [F.description, p.description]]} />
        )}
      </Card>
      {can(ctx, "portfolio:delete") && (
        <Card className="mt-6 border-danger/30">
          <h2 className="font-semibold text-danger">{m.ui.sensitiveZone}</h2>
          <p className="mb-3 text-sm text-slate-600">{P.deleteText}</p>
          <ActionForm action={deletePortfolioAction.bind(null, p.id)} submitLabel={P.deleteBtn} submitVariant="danger" confirm={fill(m.ui.confirmDelete, { name: p.name })} />
        </Card>
      )}
    </>
  );
}
