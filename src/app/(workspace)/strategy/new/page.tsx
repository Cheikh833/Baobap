import Link from "next/link";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { Card, PageHeader } from "@/components/ui/display";
import { ActionForm } from "@/components/forms/action-form";
import { PlanFields } from "@/components/strategy-fields";
import { getMessages } from "@/i18n/server";
import { Forbidden } from "../../forbidden";
import { createPlanAction } from "../actions";

export const metadata = { title: "Nouveau plan stratégique" };

export default async function NewPlanPage() {
  const ctx = await requireTenant();
  if (!can(ctx, "strategy:create")) return <Forbidden />;
  const { m } = await getMessages();
  return (
    <>
      <PageHeader title={m.strategy.new} breadcrumb={<Link href="/strategy" className="hover:underline">{m.strategy.title}</Link>} />
      <Card className="max-w-3xl"><ActionForm action={createPlanAction} submitLabel={m.strategy.createSubmit}><PlanFields m={m} /></ActionForm></Card>
    </>
  );
}
