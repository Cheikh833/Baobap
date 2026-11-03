import Link from "next/link";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { hierarchyOptions } from "@/server/services/options";
import { Card, PageHeader } from "@/components/ui/display";
import { ActionForm } from "@/components/forms/action-form";
import { PortfolioFields } from "@/components/hierarchy-fields";
import { getMessages } from "@/i18n/server";
import { Forbidden } from "../../forbidden";
import { createPortfolioAction } from "../../hierarchy-actions";

export const metadata = { title: "Nouveau portefeuille" };

export default async function NewPortfolioPage() {
  const ctx = await requireTenant();
  if (!can(ctx, "portfolio:create")) return <Forbidden />;
  const [o, { m }] = await Promise.all([hierarchyOptions(ctx), getMessages()]);
  return (
    <>
      <PageHeader title={m.portfolio.new} breadcrumb={<Link href="/portfolios" className="hover:underline">{m.portfolio.title}</Link>} />
      <Card className="max-w-3xl"><ActionForm action={createPortfolioAction} submitLabel={m.portfolio.createSubmit}><PortfolioFields members={o.members} currency={o.currency} m={m} /></ActionForm></Card>
    </>
  );
}
