import Link from "next/link";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { hierarchyOptions } from "@/server/services/options";
import { Card, PageHeader } from "@/components/ui/display";
import { ActionForm } from "@/components/forms/action-form";
import { ProgramFields } from "@/components/hierarchy-fields";
import { Forbidden } from "../../forbidden";
import { createProgramAction } from "../../hierarchy-actions";

export const metadata = { title: "Nouveau programme" };

export default async function NewProgramPage() {
  const ctx = await requireTenant();
  if (!can(ctx, "program:create")) return <Forbidden />;
  const o = await hierarchyOptions(ctx);
  return (
    <>
      <PageHeader title="Nouveau programme" breadcrumb={<Link href="/programs" className="hover:underline">Programmes</Link>} />
      <Card className="max-w-3xl"><ActionForm action={createProgramAction} submitLabel="Créer le programme"><ProgramFields members={o.members} portfolios={o.portfolios} currency={o.currency} /></ActionForm></Card>
    </>
  );
}
