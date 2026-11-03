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
import { Forbidden } from "../../forbidden";
import { orNotFound } from "../../guard";
import { deleteProgramAction, updateProgramAction } from "../../hierarchy-actions";

export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant();
  if (!can(ctx, "program:view")) return <Forbidden />;
  const { id } = await params;
  const [p, o] = await Promise.all([orNotFound(getProgram(ctx, id)), hierarchyOptions(ctx)]);
  const budget = sumByCurrency(p.projects);
  return (
    <>
      <PageHeader
        title={p.name}
        breadcrumb={<><Link href="/programs" className="hover:underline">Programmes</Link> › {p.code}{p.portfolio && <> · portefeuille <Link className="hover:underline" href={`/portfolios/${p.portfolio.id}`}>{p.portfolio.name}</Link></>}</>}
        actions={<StatusBadge status={p.status} />}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Projets" value={p.projects.length} />
        <Stat label="Budget prévu du programme" value={p.plannedBudget ? formatMoney(Number(p.plannedBudget), p.currency) : "—"} />
        <Stat label="Somme des budgets projets" value={Object.entries(budget.totals).map(([c, v]) => formatMoney(v, c)).join(" · ") || "—"} hint={budget.missing ? `${budget.missing} projet(s) sans budget` : undefined} />
      </div>
      <Card className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Projets du programme</h2>
          {can(ctx, "project:create") && <Link href={`/projects/new?programId=${p.id}`} className="text-sm font-medium text-brand hover:underline">+ Ajouter un projet</Link>}
        </div>
        {p.projects.length === 0 ? <p className="text-sm text-slate-500">Aucun projet rattaché.</p> : (
          <ul className="divide-y divide-line text-sm">{p.projects.map((g) => <li key={g.id} className="flex justify-between py-2"><Link className="hover:underline" href={`/projects/${g.id}`}>{g.code} · {g.name}</Link><StatusBadge status={g.status} /></li>)}</ul>
        )}
      </Card>
      <Card className="mt-6">
        {can(ctx, "program:edit") ? (
          <ActionForm action={updateProgramAction.bind(null, p.id)}><ProgramFields p={p} members={o.members} portfolios={o.portfolios} currency={o.currency} /></ActionForm>
        ) : (
          <DefinitionList items={[["Responsable", p.managerId ? o.memberNames.get(p.managerId) : null], ["Coordinateur", p.coordinatorId ? o.memberNames.get(p.coordinatorId) : null], ["Période", `${formatDate(p.startDate)} → ${formatDate(p.endDate)}`], ["Secteurs", p.sectors.join(", ")], ["Zones", p.zones.join(", ")], ["Contexte", p.context], ["Problématique", p.problemStatement], ["Objectif général", p.generalObjective]]} />
        )}
      </Card>
      {can(ctx, "program:delete") && (
        <Card className="mt-6 border-danger/30">
          <h2 className="font-semibold text-danger">Zone sensible</h2>
          <p className="mb-3 text-sm text-slate-600">Suppression logique, possible uniquement si aucun projet n&apos;est rattaché.</p>
          <ActionForm action={deleteProgramAction.bind(null, p.id)} submitLabel="Supprimer le programme" submitVariant="danger" confirm={`Supprimer « ${p.name} » ?`} />
        </Card>
      )}
    </>
  );
}
