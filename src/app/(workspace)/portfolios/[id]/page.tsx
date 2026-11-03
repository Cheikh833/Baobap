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
import { Forbidden } from "../../forbidden";
import { orNotFound } from "../../guard";
import { deletePortfolioAction, updatePortfolioAction } from "../../hierarchy-actions";

export default async function PortfolioPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant();
  if (!can(ctx, "portfolio:view")) return <Forbidden />;
  const { id } = await params;
  const [p, o] = await Promise.all([orNotFound(getPortfolio(ctx, id)), hierarchyOptions(ctx)]);
  const projBudget = sumByCurrency(p.projects);
  return (
    <>
      <PageHeader title={p.name} breadcrumb={<><Link href="/portfolios" className="hover:underline">Portefeuilles</Link> › {p.code}</>} actions={<StatusBadge status={p.status} />} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Programmes" value={p.programs.length} />
        <Stat label="Projets rattachés" value={p.projects.length} />
        <Stat label="Budget prévu (projets)" value={Object.entries(projBudget.totals).map(([c, v]) => formatMoney(v, c)).join(" · ") || "—"} hint={projBudget.missing ? `${projBudget.missing} projet(s) sans budget` : "Somme des budgets des projets, par devise"} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Programmes</h2>
          {p.programs.length === 0 ? <p className="text-sm text-slate-500">Aucun programme rattaché.</p> : (
            <ul className="divide-y divide-line text-sm">{p.programs.map((g) => <li key={g.id} className="flex justify-between py-2"><Link className="hover:underline" href={`/programs/${g.id}`}>{g.code} · {g.name}</Link><StatusBadge status={g.status} /></li>)}</ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Projets</h2>
          {p.projects.length === 0 ? <p className="text-sm text-slate-500">Aucun projet rattaché.</p> : (
            <ul className="divide-y divide-line text-sm">{p.projects.map((g) => <li key={g.id} className="flex justify-between py-2"><Link className="hover:underline" href={`/projects/${g.id}`}>{g.code} · {g.name}</Link><StatusBadge status={g.status} /></li>)}</ul>
          )}
        </Card>
      </div>
      <Card className="mt-6">
        {can(ctx, "portfolio:edit") ? (
          <>
            <h2 className="mb-4 font-semibold">Informations</h2>
            <ActionForm action={updatePortfolioAction.bind(null, p.id)}><PortfolioFields p={p} members={o.members} currency={o.currency} /></ActionForm>
          </>
        ) : (
          <DefinitionList items={[["Code", p.code], ["Responsable", p.managerId ? o.memberNames.get(p.managerId) : null], ["Période", `${formatDate(p.startDate)} → ${formatDate(p.endDate)}`], ["Budget prévu", p.plannedBudget ? formatMoney(Number(p.plannedBudget), p.currency) : null], ["Finalité", p.objective], ["Description", p.description]]} />
        )}
      </Card>
      {can(ctx, "portfolio:delete") && (
        <Card className="mt-6 border-danger/30">
          <h2 className="font-semibold text-danger">Zone sensible</h2>
          <p className="mb-3 text-sm text-slate-600">La suppression est logique (traçabilité conservée) et n&apos;est possible que si le portefeuille est vide.</p>
          <ActionForm action={deletePortfolioAction.bind(null, p.id)} submitLabel="Supprimer le portefeuille" submitVariant="danger" confirm={`Supprimer « ${p.name} » ?`} />
        </Card>
      )}
    </>
  );
}
