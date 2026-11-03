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
import { STATUS_OPTIONS } from "@/lib/labels";
import { formatDate, formatMoney, isOverdue } from "@/lib/metrics";
import { Forbidden } from "../forbidden";

export const metadata = { title: "Projets" };

type SP = { status?: string; portfolioId?: string; programId?: string; managerId?: string; q?: string };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireTenant();
  if (!can(ctx, "project:view")) return <Forbidden />;
  const f = await searchParams;
  const [items, o] = await Promise.all([listProjects(ctx, f), hierarchyOptions(ctx)]);
  const filtered = Object.values(f).some(Boolean);
  const create = can(ctx, "project:create") && <ButtonLink href="/projects/new"><Plus className="h-4 w-4" />Nouveau projet</ButtonLink>;
  return (
    <>
      <PageHeader title="Projets" description="Tous les projets de l'organisation, rattachés ou non à un programme." actions={create} />
      <form className="mb-4 grid gap-2 rounded-xl border border-line bg-white p-3 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <label className="sr-only" htmlFor="q">Recherche</label>
        <Input name="q" placeholder="Nom ou code…" defaultValue={f.q} className="lg:col-span-2" />
        <Select name="status" defaultValue={f.status ?? ""} aria-label="Statut"><option value="">Tous statuts</option>{STATUS_OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        <Select name="portfolioId" defaultValue={f.portfolioId ?? ""} aria-label="Portefeuille"><option value="">Tous portefeuilles</option>{o.portfolios.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        <Select name="programId" defaultValue={f.programId ?? ""} aria-label="Programme"><option value="">Tous programmes</option>{o.programs.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        <div className="flex gap-2">
          <Select name="managerId" defaultValue={f.managerId ?? ""} aria-label="Chef de projet"><option value="">Tous responsables</option>{o.members.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
          <Button type="submit" variant="secondary">Filtrer</Button>
        </div>
      </form>
      {items.length === 0 ? (
        filtered
          ? <EmptyState icon={FolderKanban} title="Aucun projet ne correspond aux filtres" action={<ButtonLink href="/projects" variant="secondary">Réinitialiser</ButtonLink>} />
          : <EmptyState icon={FolderKanban} title="Aucun projet" description="Créez votre premier projet : il sera enregistré en brouillon et structuré progressivement." action={create} />
      ) : (
        <Table head={["Code", "Projet", "Programme", "Statut", "Période", "Responsable", "Budget prévu"]}>
          {items.map((p) => (
            <tr key={p.id} className="hover:bg-canvas">
              <Td className="whitespace-nowrap font-mono text-xs">{p.code}</Td>
              <Td><Link className="font-medium text-brand-deep hover:underline" href={`/projects/${p.id}`}>{p.name}</Link></Td>
              <Td>{p.program?.name ?? "—"}</Td>
              <Td><div className="flex flex-wrap gap-1"><StatusBadge status={p.status} />{isOverdue(p.status, p.endDate) && <span className="text-xs font-medium text-danger">En retard</span>}</div></Td>
              <Td className="whitespace-nowrap text-xs">{formatDate(p.startDate)} → {formatDate(p.endDate)}</Td>
              <Td>{p.managerId ? o.memberNames.get(p.managerId) ?? "—" : "—"}</Td>
              <Td className="whitespace-nowrap">{p.plannedBudget ? formatMoney(Number(p.plannedBudget), p.currency) : "—"}</Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
