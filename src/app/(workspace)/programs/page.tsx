import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { listPrograms } from "@/server/services/programs";
import { EmptyState, PageHeader, Table, Td } from "@/components/ui/display";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatMoney } from "@/lib/metrics";
import { getMessages } from "@/i18n/server";
import { Forbidden } from "../forbidden";

export const metadata = { title: "Programmes" };

export default async function ProgramsPage() {
  const ctx = await requireTenant();
  if (!can(ctx, "program:view")) return <Forbidden />;
  const [items, { m, locale }] = await Promise.all([listPrograms(ctx), getMessages()]);
  const G = m.program;
  const create = can(ctx, "program:create") && <ButtonLink href="/programs/new"><Plus className="h-4 w-4" />{G.new}</ButtonLink>;
  return (
    <>
      <PageHeader title={G.title} description={G.description} actions={create} />
      {items.length === 0 ? (
        <EmptyState icon={Layers} title={G.emptyTitle} description={G.emptyText} action={create} />
      ) : (
        <Table head={G.head}>
          {items.map((p) => (
            <tr key={p.id} className="hover:bg-canvas">
              <Td className="whitespace-nowrap font-mono text-xs">{p.code}</Td>
              <Td><Link className="font-medium text-brand-deep hover:underline" href={`/programs/${p.id}`}>{p.name}</Link></Td>
              <Td>{p.portfolio ? <Link className="hover:underline" href={`/portfolios/${p.portfolio.id}`}>{p.portfolio.name}</Link> : "—"}</Td>
              <Td><StatusBadge status={p.status} /></Td>
              <Td className="whitespace-nowrap text-xs">{formatDate(p.startDate, locale)} → {formatDate(p.endDate, locale)}</Td>
              <Td>{p._count.projects}</Td>
              <Td className="whitespace-nowrap">{p.plannedBudget ? formatMoney(Number(p.plannedBudget), p.currency, locale) : "—"}</Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
