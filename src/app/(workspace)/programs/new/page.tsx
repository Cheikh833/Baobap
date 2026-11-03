import Link from "next/link";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { hierarchyOptions } from "@/server/services/options";
import { Card, PageHeader } from "@/components/ui/display";
import { ActionForm } from "@/components/forms/action-form";
import { ProgramFields } from "@/components/hierarchy-fields";
import { getMessages } from "@/i18n/server";
import { Forbidden } from "../../forbidden";
import { createProgramAction } from "../../hierarchy-actions";

export const metadata = { title: "Nouveau programme" };

export default async function NewProgramPage() {
  const ctx = await requireTenant();
  if (!can(ctx, "program:create")) return <Forbidden />;
  const [o, { m }] = await Promise.all([hierarchyOptions(ctx), getMessages()]);
  return (
    <>
      <PageHeader title={m.program.new} breadcrumb={<Link href="/programs" className="hover:underline">{m.program.title}</Link>} />
      <Card className="max-w-3xl"><ActionForm action={createProgramAction} submitLabel={m.program.createSubmit}><ProgramFields members={o.members} portfolios={o.portfolios} currency={o.currency} m={m} /></ActionForm></Card>
    </>
  );
}
