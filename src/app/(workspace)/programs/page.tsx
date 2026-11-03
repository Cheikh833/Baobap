import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { listPrograms } from "@/server/services/programs";
import { EmptyState, PageHeader, Table, Td } from "@/components/ui/display";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatMoney } from "@/lib/metrics";
import { Forbidden } from "../forbidden";

export const metadata = { title: "Programmes" };

export default async function ProgramsPage() {
  const ctx = await requireTenant();
  if (!can(ctx, "program:view")) return <Forbidden />;
  const items = await listPrograms(ctx);
  const create = can(ctx, "program:create") && <ButtonLink href="/programs/new"><Plus className="h-4 w-4" />Nouveau programme</ButtonLink>;
  return (
    <>
      <PageHeader title="Programmes" description="Ensembles de projets organisés autour d'un objectif commun." actions={create} />
      {items.length === 0 ? (
        <EmptyState icon={Layers} title="Aucun programme" description="Un programme regroupe plusieurs projets autour d'un objectif commun." action={create} />
      ) : (
        <Table head={["Code", "Nom", "Portefeuille", "Statut", "Période", "Projets", "Budget prévu"]}>
          {items.map((p) => (
            <tr key={p.id} className="hover:bg-canvas">
              <Td className="whitespace-nowrap font-mono text-xs">{p.code}</Td>
              <Td><Link className="font-medium text-brand-deep hover:underline" href={`/programs/${p.id}`}>{p.name}</Link></Td>
              <Td>{p.portfolio ? <Link className="hover:underline" href={`/portfolios/${p.portfolio.id}`}>{p.portfolio.name}</Link> : "—"}</Td>
              <Td><StatusBadge status={p.status} /></Td>
              <Td className="whitespace-nowrap text-xs">{formatDate(p.startDate)} → {formatDate(p.endDate)}</Td>
              <Td>{p._count.projects}</Td>
              <Td className="whitespace-nowrap">{p.plannedBudget ? formatMoney(Number(p.plannedBudget), p.currency) : "—"}</Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
