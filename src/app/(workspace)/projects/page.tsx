import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { listProjects } from "@/server/services/projects";
import { hierarchyOptions } from "@/server/services/options";
import { EmptyState, PageHeader, Table, Td } from "@/components/ui/display";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatMoney, isOverdue } from "@/lib/metrics";
import { getMessages } from "@/i18n/server";
import { Forbidden } from "../forbidden";

export const metadata = { title: "Projets" };

type SP = { status?: string; portfolioId?: string; programId?: string; managerId?: string; q?: string };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireTenant();
  if (!can(ctx, "project:view")) return <Forbidden />;
  const f = await searchParams;
  const [items, o, { m, locale }] = await Promise.all([listProjects(ctx, f), hierarchyOptions(ctx), getMessages()]);
  const P = m.project;
  const filtered = Object.values(f).some(Boolean);
  const create = can(ctx, "project:create") && <ButtonLink href="/projects/new"><Plus className="h-4 w-4" />{P.new}</ButtonLink>;
  return (
    <>
      <PageHeader title={P.title} description={P.description} actions={create} />
      <form className="mb-4 grid gap-2 rounded-xl border border-line bg-white p-3 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <label className="sr-only" htmlFor="q">{m.ui.search}</label>
        <Input name="q" placeholder={P.searchPlaceholder} defaultValue={f.q} className="lg:col-span-2" />
        <Select name="status" defaultValue={f.status ?? ""} aria-label={m.portfolio.fields.status}><option value="">{P.allStatus}</option>{Object.entries(m.status).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        <Select name="portfolioId" defaultValue={f.portfolioId ?? ""} aria-label={m.wizard.fields.portfolio}><option value="">{P.allPortfolios}</option>{o.portfolios.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        <Select name="programId" defaultValue={f.programId ?? ""} aria-label={m.wizard.fields.program}><option value="">{P.allPrograms}</option>{o.programs.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        <div className="flex gap-2">
          <Select name="managerId" defaultValue={f.managerId ?? ""} aria-label={m.wizard.fields.manager}><option value="">{P.allManagers}</option>{o.members.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
          <Button type="submit" variant="secondary">{m.ui.filter}</Button>
        </div>
      </form>
      {items.length === 0 ? (
        filtered
          ? <EmptyState icon={FolderKanban} title={P.noMatch} action={<ButtonLink href="/projects" variant="secondary">{m.ui.reset}</ButtonLink>} />
          : <EmptyState icon={FolderKanban} title={P.emptyTitle} description={P.emptyText} action={create} />
      ) : (
        <Table head={P.head}>
          {items.map((p) => (
            <tr key={p.id} className="hover:bg-canvas">
              <Td className="whitespace-nowrap font-mono text-xs">{p.code}</Td>
              <Td><Link className="font-medium text-brand-deep hover:underline" href={`/projects/${p.id}`}>{p.name}</Link></Td>
              <Td>{p.program?.name ?? "—"}</Td>
              <Td><div className="flex flex-wrap gap-1"><StatusBadge status={p.status} />{isOverdue(p.status, p.endDate) && <span className="text-xs font-medium text-danger">{P.late}</span>}</div></Td>
              <Td className="whitespace-nowrap text-xs">{formatDate(p.startDate, locale)} → {formatDate(p.endDate, locale)}</Td>
              <Td>{p.managerId ? o.memberNames.get(p.managerId) ?? "—" : "—"}</Td>
              <Td className="whitespace-nowrap">{p.plannedBudget ? formatMoney(Number(p.plannedBudget), p.currency, locale) : "—"}</Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
