import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { listPortfolios } from "@/server/services/portfolios";
import { EmptyState, PageHeader, Table, Td } from "@/components/ui/display";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatMoney } from "@/lib/metrics";
import { Forbidden } from "../forbidden";

export const metadata = { title: "Portefeuilles" };

export default async function PortfoliosPage() {
  const ctx = await requireTenant();
  if (!can(ctx, "portfolio:view")) return <Forbidden />;
  const items = await listPortfolios(ctx);
  const create = can(ctx, "portfolio:create") && <ButtonLink href="/portfolios/new"><Plus className="h-4 w-4" />Nouveau portefeuille</ButtonLink>;
  return (
    <>
      <PageHeader title="Portefeuilles" description="Regroupements de programmes et projets poursuivant une finalité stratégique commune." actions={create} />
      {items.length === 0 ? (
        <EmptyState icon={Briefcase} title="Aucun portefeuille" description="Créez un portefeuille pour structurer vos interventions." action={create} />
      ) : (
        <Table head={["Code", "Nom", "Statut", "Période", "Programmes", "Projets", "Budget prévu"]}>
          {items.map((p) => (
            <tr key={p.id} className="hover:bg-canvas">
              <Td className="whitespace-nowrap font-mono text-xs">{p.code}</Td>
              <Td><Link className="font-medium text-brand-deep hover:underline" href={`/portfolios/${p.id}`}>{p.name}</Link></Td>
              <Td><StatusBadge status={p.status} /></Td>
              <Td className="whitespace-nowrap text-xs">{formatDate(p.startDate)} → {formatDate(p.endDate)}</Td>
              <Td>{p._count.programs}</Td>
              <Td>{p._count.projects}</Td>
              <Td className="whitespace-nowrap">{p.plannedBudget ? formatMoney(Number(p.plannedBudget), p.currency) : "—"}</Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
