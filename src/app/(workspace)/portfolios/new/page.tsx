import Link from "next/link";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { hierarchyOptions } from "@/server/services/options";
import { Card, PageHeader } from "@/components/ui/display";
import { ActionForm } from "@/components/forms/action-form";
import { PortfolioFields } from "@/components/hierarchy-fields";
import { Forbidden } from "../../forbidden";
import { createPortfolioAction } from "../../hierarchy-actions";

export const metadata = { title: "Nouveau portefeuille" };

export default async function NewPortfolioPage() {
  const ctx = await requireTenant();
  if (!can(ctx, "portfolio:create")) return <Forbidden />;
  const o = await hierarchyOptions(ctx);
  return (
    <>
      <PageHeader title="Nouveau portefeuille" breadcrumb={<Link href="/portfolios" className="hover:underline">Portefeuilles</Link>} />
      <Card className="max-w-3xl"><ActionForm action={createPortfolioAction} submitLabel="Créer le portefeuille"><PortfolioFields members={o.members} currency={o.currency} /></ActionForm></Card>
    </>
  );
}
