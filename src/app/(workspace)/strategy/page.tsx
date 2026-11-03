import Link from "next/link";
import { Plus, Target } from "lucide-react";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { listPlans } from "@/server/services/strategy";
import { EmptyState, PageHeader, Table, Td } from "@/components/ui/display";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/metrics";
import { getMessages } from "@/i18n/server";
import { Forbidden } from "../forbidden";

export const metadata = { title: "Stratégie" };

export default async function StrategyPage() {
  const ctx = await requireTenant();
  if (!can(ctx, "strategy:view")) return <Forbidden />;
  const [plans, { m, locale }] = await Promise.all([listPlans(ctx), getMessages()]);
  const S = m.strategy;
  const create = can(ctx, "strategy:create") && <ButtonLink href="/strategy/new"><Plus className="h-4 w-4" />{S.new}</ButtonLink>;
  return (
    <>
      <PageHeader title={S.title} description={S.description} actions={create} />
      {plans.length === 0 ? (
        <EmptyState icon={Target} title={S.emptyTitle} description={S.emptyText} action={create} />
      ) : (
        <Table head={S.head}>
          {plans.map((p) => (
            <tr key={p.id} className="hover:bg-canvas">
              <Td className="whitespace-nowrap font-mono text-xs">{p.reference ?? "—"}</Td>
              <Td><Link className="font-medium text-brand-deep hover:underline" href={`/strategy/${p.id}`}>{p.title}</Link></Td>
              <Td><StatusBadge status={p.status} /></Td>
              <Td className="whitespace-nowrap text-xs">{formatDate(p.startDate, locale)} → {formatDate(p.endDate, locale)}</Td>
              <Td>{p.axes.length}</Td>
              <Td>{p.axes.reduce((s, a) => s + a._count.objectives, 0)}</Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
